"""
Financial goals API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from .. import auth, models
from datetime import datetime

router = APIRouter(prefix="/api/goals", tags=["Goals"])


@router.get("/")
async def get_goals(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    goals = db.query(models.Goal).filter(
        models.Goal.user_id == current_user.id
    ).order_by(models.Goal.created_at.desc()).all()

    return [
        {
            "id": g.id,
            "name": g.name,
            "target_amount": g.target_amount,
            "current_amount": g.current_amount or 0,
            "deadline": g.deadline.isoformat() if g.deadline else None,
            "is_completed": g.is_completed,
            "progress_percent": round((g.current_amount or 0) / g.target_amount * 100, 2) if g.target_amount > 0 else 0,
            "created_at": g.created_at.isoformat() if g.created_at else None,
        }
        for g in goals
    ]


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_goal(
    data: dict,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    goal = models.Goal(
        user_id=current_user.id,
        name=data["name"],
        target_amount=data["target_amount"],
        current_amount=data.get("current_amount", 0),
        deadline=datetime.fromisoformat(data["deadline"]) if data.get("deadline") else None,
    )

    db.add(goal)
    db.commit()
    db.refresh(goal)

    return {
        "id": goal.id,
        "name": goal.name,
        "target_amount": goal.target_amount,
        "current_amount": goal.current_amount or 0,
        "progress_percent": round((goal.current_amount or 0) / goal.target_amount * 100, 2) if goal.target_amount > 0 else 0,
    }


@router.put("/{goal_id}")
async def update_goal(
    goal_id: int,
    data: dict,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    goal = db.query(models.Goal).filter(
        models.Goal.id == goal_id,
        models.Goal.user_id == current_user.id
    ).first()

    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    if "name" in data:
        goal.name = data["name"]
    if "target_amount" in data:
        goal.target_amount = data["target_amount"]
    if "current_amount" in data:
        goal.current_amount = data["current_amount"]
    if "deadline" in data:
        goal.deadline = datetime.fromisoformat(data["deadline"]) if data["deadline"] else None
    if "is_completed" in data:
        goal.is_completed = data["is_completed"]

    db.commit()
    db.refresh(goal)

    return {
        "id": goal.id,
        "name": goal.name,
        "target_amount": goal.target_amount,
        "current_amount": goal.current_amount or 0,
        "is_completed": goal.is_completed,
        "progress_percent": round((goal.current_amount or 0) / goal.target_amount * 100, 2) if goal.target_amount > 0 else 0,
    }


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_goal(
    goal_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    goal = db.query(models.Goal).filter(
        models.Goal.id == goal_id,
        models.Goal.user_id == current_user.id
    ).first()

    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    db.delete(goal)
    db.commit()
