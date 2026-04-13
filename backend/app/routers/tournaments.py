"""
Paper Trading Tournaments Router
Competitive paper trading with leaderboards and prizes.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime
from typing import Optional

from ..auth import get_current_user
from ..database import get_db
from ..models import User, Tournament, TournamentParticipant, TournamentTrade

router = APIRouter(prefix="/api/tournaments", tags=["Tournaments"])


@router.post("")
async def create_tournament(data: dict, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Create a new tournament."""
    tournament = Tournament(
        name=data.get("name", "Untitled Tournament"),
        description=data.get("description", ""),
        start_date=datetime.fromisoformat(data["start_date"]),
        end_date=datetime.fromisoformat(data["end_date"]),
        starting_balance=data.get("starting_balance", 100000),
        max_participants=data.get("max_participants", 100),
        prize_description=data.get("prize_description", ""),
        status="upcoming",
        created_by=user.id,
    )
    db.add(tournament)
    db.flush()

    # Creator auto-joins
    participant = TournamentParticipant(
        tournament_id=tournament.id,
        user_id=user.id,
        balance=tournament.starting_balance,
    )
    db.add(participant)
    db.commit()
    db.refresh(tournament)

    return {
        "id": tournament.id,
        "name": tournament.name,
        "status": tournament.status,
        "message": "Tournament created",
    }


@router.get("")
async def list_tournaments(
    status: Optional[str] = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all tournaments."""
    query = db.query(Tournament)
    if status:
        query = query.filter(Tournament.status == status)

    # Auto-update statuses
    now = datetime.utcnow()
    tournaments = query.order_by(desc(Tournament.created_at)).limit(50).all()

    result = []
    for t in tournaments:
        if t.status == "upcoming" and t.start_date and now >= t.start_date:
            t.status = "active"
            db.commit()
        if t.status == "active" and t.end_date and now >= t.end_date:
            t.status = "completed"
            db.commit()

        participant_count = db.query(TournamentParticipant).filter(
            TournamentParticipant.tournament_id == t.id
        ).count()

        creator = db.query(User).filter(User.id == t.created_by).first()

        # Check if current user has joined
        user_entry = db.query(TournamentParticipant).filter(
            TournamentParticipant.tournament_id == t.id,
            TournamentParticipant.user_id == user.id,
        ).first()

        result.append({
            "id": t.id,
            "name": t.name,
            "description": t.description,
            "start_date": t.start_date.isoformat() if t.start_date else None,
            "end_date": t.end_date.isoformat() if t.end_date else None,
            "starting_balance": t.starting_balance,
            "max_participants": t.max_participants,
            "participant_count": participant_count,
            "prize_description": t.prize_description,
            "status": t.status,
            "created_by": creator.username if creator else "Unknown",
            "is_joined": user_entry is not None,
            "user_balance": user_entry.balance if user_entry else None,
            "user_pnl": user_entry.total_pnl if user_entry else None,
        })

    return result


@router.get("/{tournament_id}")
async def get_tournament(tournament_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get tournament details with leaderboard."""
    t = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not t:
        raise HTTPException(404, "Tournament not found")

    participants = (
        db.query(TournamentParticipant)
        .filter(TournamentParticipant.tournament_id == tournament_id)
        .order_by(desc(TournamentParticipant.total_pnl))
        .all()
    )

    leaderboard = []
    for rank, p in enumerate(participants, 1):
        u = db.query(User).filter(User.id == p.user_id).first()
        trade_count = db.query(TournamentTrade).filter(
            TournamentTrade.participant_id == p.id
        ).count()
        leaderboard.append({
            "rank": rank,
            "user_id": p.user_id,
            "username": u.username if u else "Unknown",
            "balance": round(p.balance, 2),
            "total_pnl": round(p.total_pnl, 2),
            "total_pnl_pct": round(p.total_pnl_pct, 2),
            "total_trades": trade_count,
            "win_rate": round(p.win_rate, 1),
            "is_current_user": p.user_id == user.id,
        })

    creator = db.query(User).filter(User.id == t.created_by).first()

    return {
        "id": t.id,
        "name": t.name,
        "description": t.description,
        "start_date": t.start_date.isoformat() if t.start_date else None,
        "end_date": t.end_date.isoformat() if t.end_date else None,
        "starting_balance": t.starting_balance,
        "max_participants": t.max_participants,
        "prize_description": t.prize_description,
        "status": t.status,
        "created_by": creator.username if creator else "Unknown",
        "leaderboard": leaderboard,
    }


@router.post("/{tournament_id}/join")
async def join_tournament(tournament_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Join a tournament."""
    t = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not t:
        raise HTTPException(404, "Tournament not found")
    if t.status == "completed":
        raise HTTPException(400, "Tournament has ended")

    existing = db.query(TournamentParticipant).filter(
        TournamentParticipant.tournament_id == tournament_id,
        TournamentParticipant.user_id == user.id,
    ).first()
    if existing:
        raise HTTPException(400, "Already joined")

    count = db.query(TournamentParticipant).filter(
        TournamentParticipant.tournament_id == tournament_id
    ).count()
    if count >= t.max_participants:
        raise HTTPException(400, "Tournament is full")

    participant = TournamentParticipant(
        tournament_id=tournament_id,
        user_id=user.id,
        balance=t.starting_balance,
    )
    db.add(participant)
    db.commit()
    return {"message": "Joined tournament", "balance": t.starting_balance}


@router.post("/{tournament_id}/trade")
async def execute_trade(tournament_id: int, data: dict, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Execute a paper trade in a tournament."""
    t = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not t:
        raise HTTPException(404, "Tournament not found")
    if t.status != "active":
        raise HTTPException(400, "Tournament is not active")

    participant = db.query(TournamentParticipant).filter(
        TournamentParticipant.tournament_id == tournament_id,
        TournamentParticipant.user_id == user.id,
    ).first()
    if not participant:
        raise HTTPException(400, "Not a participant")

    symbol = data.get("symbol", "").upper()
    side = data.get("side", "buy").lower()
    quantity = float(data.get("quantity", 0))
    price = float(data.get("price", 0))

    if not symbol or quantity <= 0 or price <= 0:
        raise HTTPException(400, "Invalid trade parameters")

    total_value = quantity * price

    if side == "buy":
        if total_value > participant.balance:
            raise HTTPException(400, "Insufficient balance")
        participant.balance -= total_value
    else:
        participant.balance += total_value

    # Simple P&L tracking (in a real app, track positions properly)
    pnl = 0
    if side == "sell":
        # Look for matching buy trades
        buys = db.query(TournamentTrade).filter(
            TournamentTrade.participant_id == participant.id,
            TournamentTrade.symbol == symbol,
            TournamentTrade.side == "buy",
        ).all()
        if buys:
            avg_buy = sum(b.price for b in buys) / len(buys)
            pnl = (price - avg_buy) * quantity

    trade = TournamentTrade(
        tournament_id=tournament_id,
        participant_id=participant.id,
        symbol=symbol,
        side=side,
        quantity=quantity,
        price=price,
        total_value=total_value,
        pnl=pnl,
    )
    db.add(trade)

    # Update participant stats
    participant.total_pnl = participant.balance - t.starting_balance
    participant.total_pnl_pct = ((participant.balance - t.starting_balance) / t.starting_balance) * 100
    participant.total_trades = (participant.total_trades or 0) + 1

    # Update win rate
    all_trades = db.query(TournamentTrade).filter(
        TournamentTrade.participant_id == participant.id,
        TournamentTrade.pnl != 0,
    ).all()
    if all_trades:
        wins = sum(1 for tr in all_trades if tr.pnl > 0)
        participant.win_rate = (wins / len(all_trades)) * 100

    db.commit()

    return {
        "message": f"{side.upper()} {quantity} {symbol} @ ${price}",
        "balance": round(participant.balance, 2),
        "total_pnl": round(participant.total_pnl, 2),
        "trade_id": trade.id,
    }


@router.get("/{tournament_id}/trades")
async def get_trades(tournament_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get user's trade history in a tournament."""
    participant = db.query(TournamentParticipant).filter(
        TournamentParticipant.tournament_id == tournament_id,
        TournamentParticipant.user_id == user.id,
    ).first()
    if not participant:
        raise HTTPException(400, "Not a participant")

    trades = (
        db.query(TournamentTrade)
        .filter(TournamentTrade.participant_id == participant.id)
        .order_by(desc(TournamentTrade.created_at))
        .limit(100)
        .all()
    )

    return [
        {
            "id": tr.id,
            "symbol": tr.symbol,
            "side": tr.side,
            "quantity": tr.quantity,
            "price": tr.price,
            "total_value": round(tr.total_value, 2),
            "pnl": round(tr.pnl, 2),
            "created_at": tr.created_at.isoformat() if tr.created_at else None,
        }
        for tr in trades
    ]
