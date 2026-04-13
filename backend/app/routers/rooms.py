"""
Trading Rooms API - WebSocket-powered live collaboration rooms
"""
import json
import logging
from typing import Optional, List, Dict
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import func as sa_func

from ..database import get_db
from ..auth import get_current_user, decode_token, create_access_token
from .. import models

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/rooms", tags=["Trading Rooms"])


# ============== Schemas ==============

class RoomCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    category: str = Field(default="general", pattern="^(general|crypto|stocks|options|education)$")
    is_private: bool = False
    max_participants: int = Field(default=100, ge=2, le=500)


class RoomResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    host_id: int
    host_username: str
    category: str
    is_active: bool
    is_private: bool
    max_participants: int
    participant_count: int
    created_at: str

    class Config:
        from_attributes = True


class MessageResponse(BaseModel):
    id: int
    room_id: int
    user_id: int
    username: str
    content: str
    message_type: str
    metadata_json: Optional[str]
    created_at: str


class ParticipantResponse(BaseModel):
    id: int
    user_id: int
    username: str
    is_moderator: bool
    is_online: bool
    joined_at: str


# ============== Connection Manager ==============

class ConnectionManager:
    """Manages WebSocket connections for trading rooms."""

    def __init__(self):
        # room_id -> {user_id: WebSocket}
        self.active_connections: Dict[int, Dict[int, WebSocket]] = {}

    async def connect(self, websocket: WebSocket, room_id: int, user_id: int):
        await websocket.accept()
        if room_id not in self.active_connections:
            self.active_connections[room_id] = {}
        self.active_connections[room_id][user_id] = websocket

    def disconnect(self, room_id: int, user_id: int):
        if room_id in self.active_connections:
            self.active_connections[room_id].pop(user_id, None)
            if not self.active_connections[room_id]:
                del self.active_connections[room_id]

    async def broadcast(self, room_id: int, message: dict, exclude_user: int = None):
        if room_id not in self.active_connections:
            return
        disconnected = []
        for uid, ws in self.active_connections[room_id].items():
            if uid == exclude_user:
                continue
            try:
                await ws.send_json(message)
            except Exception:
                disconnected.append(uid)
        for uid in disconnected:
            self.active_connections[room_id].pop(uid, None)

    def get_online_users(self, room_id: int) -> set:
        if room_id in self.active_connections:
            return set(self.active_connections[room_id].keys())
        return set()

    def get_room_count(self, room_id: int) -> int:
        if room_id in self.active_connections:
            return len(self.active_connections[room_id])
        return 0


manager = ConnectionManager()


# ============== Helper ==============

def _room_to_response(room: models.TradingRoom, db: Session) -> dict:
    host = db.query(models.User).filter(models.User.id == room.host_id).first()
    participant_count = db.query(sa_func.count(models.RoomParticipant.id)).filter(
        models.RoomParticipant.room_id == room.id
    ).scalar() or 0
    # Include live WS connections in count
    online_count = manager.get_room_count(room.id)
    display_count = max(participant_count, online_count)
    return {
        "id": room.id,
        "name": room.name,
        "description": room.description,
        "host_id": room.host_id,
        "host_username": host.username if host else "Unknown",
        "category": room.category,
        "is_active": room.is_active,
        "is_private": room.is_private,
        "max_participants": room.max_participants,
        "participant_count": display_count,
        "created_at": room.created_at.isoformat() if room.created_at else "",
    }


# ============== REST Endpoints ==============

@router.post("", response_model=RoomResponse, status_code=status.HTTP_201_CREATED)
async def create_room(
    data: RoomCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new trading room."""
    room = models.TradingRoom(
        name=data.name,
        description=data.description,
        host_id=current_user.id,
        category=data.category,
        is_private=data.is_private,
        max_participants=data.max_participants,
    )
    db.add(room)
    db.commit()
    db.refresh(room)

    # Auto-join host as moderator
    participant = models.RoomParticipant(
        room_id=room.id,
        user_id=current_user.id,
        is_moderator=True,
    )
    db.add(participant)
    db.commit()

    return _room_to_response(room, db)


@router.get("", response_model=List[RoomResponse])
async def list_rooms(
    category: Optional[str] = Query(None, pattern="^(general|crypto|stocks|options|education)$"),
    search: Optional[str] = Query(None, max_length=100),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List active trading rooms with optional category filter."""
    query = db.query(models.TradingRoom).filter(models.TradingRoom.is_active == True)
    if category:
        query = query.filter(models.TradingRoom.category == category)
    if search:
        query = query.filter(models.TradingRoom.name.ilike(f"%{search}%"))
    rooms = query.order_by(models.TradingRoom.created_at.desc()).all()
    return [_room_to_response(r, db) for r in rooms]


@router.get("/{room_id}", response_model=RoomResponse)
async def get_room(
    room_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get room details."""
    room = db.query(models.TradingRoom).filter(models.TradingRoom.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return _room_to_response(room, db)


@router.delete("/{room_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_room(
    room_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a room (host only)."""
    room = db.query(models.TradingRoom).filter(models.TradingRoom.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    if room.host_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the host can delete this room")
    # Remove participants and messages
    db.query(models.RoomMessage).filter(models.RoomMessage.room_id == room_id).delete()
    db.query(models.RoomParticipant).filter(models.RoomParticipant.room_id == room_id).delete()
    db.delete(room)
    db.commit()


@router.post("/{room_id}/join")
async def join_room(
    room_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Join a trading room."""
    room = db.query(models.TradingRoom).filter(
        models.TradingRoom.id == room_id,
        models.TradingRoom.is_active == True,
    ).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    # Check if already joined
    existing = db.query(models.RoomParticipant).filter(
        models.RoomParticipant.room_id == room_id,
        models.RoomParticipant.user_id == current_user.id,
    ).first()
    if existing:
        return {"message": "Already joined", "room_id": room_id}

    # Check capacity
    count = db.query(sa_func.count(models.RoomParticipant.id)).filter(
        models.RoomParticipant.room_id == room_id
    ).scalar() or 0
    if count >= room.max_participants:
        raise HTTPException(status_code=400, detail="Room is full")

    participant = models.RoomParticipant(
        room_id=room_id,
        user_id=current_user.id,
    )
    db.add(participant)
    db.commit()
    return {"message": "Joined room", "room_id": room_id}


@router.post("/{room_id}/leave")
async def leave_room(
    room_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Leave a trading room."""
    participant = db.query(models.RoomParticipant).filter(
        models.RoomParticipant.room_id == room_id,
        models.RoomParticipant.user_id == current_user.id,
    ).first()
    if participant:
        db.delete(participant)
        db.commit()
    return {"message": "Left room", "room_id": room_id}


@router.get("/{room_id}/messages", response_model=List[MessageResponse])
async def get_messages(
    room_id: int,
    before_id: Optional[int] = None,
    limit: int = Query(default=50, ge=1, le=100),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get message history for a room (paginated)."""
    room = db.query(models.TradingRoom).filter(models.TradingRoom.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    query = db.query(models.RoomMessage).filter(models.RoomMessage.room_id == room_id)
    if before_id:
        query = query.filter(models.RoomMessage.id < before_id)
    messages = query.order_by(models.RoomMessage.created_at.desc()).limit(limit).all()
    messages.reverse()  # Return in chronological order

    result = []
    for msg in messages:
        user = db.query(models.User).filter(models.User.id == msg.user_id).first()
        result.append({
            "id": msg.id,
            "room_id": msg.room_id,
            "user_id": msg.user_id,
            "username": user.username if user else "Unknown",
            "content": msg.content,
            "message_type": msg.message_type or "text",
            "metadata_json": msg.metadata_json,
            "created_at": msg.created_at.isoformat() if msg.created_at else "",
        })
    return result


@router.get("/{room_id}/participants", response_model=List[ParticipantResponse])
async def get_participants(
    room_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List current participants in a room."""
    room = db.query(models.TradingRoom).filter(models.TradingRoom.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    participants = db.query(models.RoomParticipant).filter(
        models.RoomParticipant.room_id == room_id
    ).all()

    online_users = manager.get_online_users(room_id)
    result = []
    for p in participants:
        user = db.query(models.User).filter(models.User.id == p.user_id).first()
        result.append({
            "id": p.id,
            "user_id": p.user_id,
            "username": user.username if user else "Unknown",
            "is_moderator": p.is_moderator,
            "is_online": p.user_id in online_users,
            "joined_at": p.joined_at.isoformat() if p.joined_at else "",
        })
    # Sort: online first, then by username
    result.sort(key=lambda x: (not x["is_online"], x["username"].lower()))
    return result


@router.get("/ws-token")
async def get_ws_token(
    current_user: models.User = Depends(get_current_user),
):
    """Get a short-lived token for WebSocket authentication."""
    token = create_access_token(
        data={"sub": str(current_user.id)},
        expires_delta=timedelta(minutes=5),
    )
    return {"token": token}


# ============== WebSocket Endpoint ==============

@router.websocket("/{room_id}/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    room_id: int,
    token: str = Query(...),
):
    """WebSocket endpoint for real-time room messaging."""
    # Authenticate via token query param
    token_data = decode_token(token)
    if not token_data or not token_data.user_id:
        await websocket.close(code=4001, reason="Unauthorized")
        return

    user_id = token_data.user_id

    # Get user and room from DB
    db = next(get_db())
    try:
        user = db.query(models.User).filter(models.User.id == user_id).first()
        if not user:
            await websocket.close(code=4001, reason="User not found")
            return

        room = db.query(models.TradingRoom).filter(
            models.TradingRoom.id == room_id,
            models.TradingRoom.is_active == True,
        ).first()
        if not room:
            await websocket.close(code=4004, reason="Room not found")
            return

        username = user.username
    finally:
        db.close()

    # Connect
    await manager.connect(websocket, room_id, user_id)

    # Broadcast join notification
    await manager.broadcast(room_id, {
        "type": "system",
        "content": f"{username} joined the room",
        "user_id": user_id,
        "username": username,
        "timestamp": datetime.utcnow().isoformat(),
        "online_count": manager.get_room_count(room_id),
    })

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                continue

            message_type = data.get("type", "text")
            content = data.get("content", "").strip()
            metadata = data.get("metadata")

            if not content and message_type == "text":
                continue

            # Persist message to DB
            db = next(get_db())
            try:
                msg = models.RoomMessage(
                    room_id=room_id,
                    user_id=user_id,
                    content=content,
                    message_type=message_type,
                    metadata_json=json.dumps(metadata) if metadata else None,
                )
                db.add(msg)
                db.commit()
                db.refresh(msg)
                msg_id = msg.id
                msg_time = msg.created_at.isoformat() if msg.created_at else datetime.utcnow().isoformat()
            finally:
                db.close()

            # Broadcast to all in room
            await manager.broadcast(room_id, {
                "type": message_type,
                "id": msg_id,
                "content": content,
                "user_id": user_id,
                "username": username,
                "metadata": metadata,
                "timestamp": msg_time,
            })

    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error(f"WebSocket error in room {room_id} for user {user_id}: {e}")
    finally:
        manager.disconnect(room_id, user_id)
        # Broadcast leave notification
        try:
            await manager.broadcast(room_id, {
                "type": "system",
                "content": f"{username} left the room",
                "user_id": user_id,
                "username": username,
                "timestamp": datetime.utcnow().isoformat(),
                "online_count": manager.get_room_count(room_id),
            })
        except Exception:
            pass
