"""
User preferences API endpoints
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from .. import auth, models

router = APIRouter(prefix="/api/preferences", tags=["User Preferences"])


@router.get("/")
async def get_preferences(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    prefs = db.query(models.UserPreference).filter(
        models.UserPreference.user_id == current_user.id
    ).first()
    if not prefs:
        prefs = models.UserPreference(user_id=current_user.id, theme="dark", currency="USD")
        db.add(prefs)
        db.commit()
        db.refresh(prefs)
    return {"theme": prefs.theme, "currency": prefs.currency}


@router.put("/")
async def update_preferences(
    data: dict,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    prefs = db.query(models.UserPreference).filter(
        models.UserPreference.user_id == current_user.id
    ).first()
    if not prefs:
        prefs = models.UserPreference(user_id=current_user.id, theme=data.get("theme", "dark"), currency=data.get("currency", "USD"))
        db.add(prefs)
    else:
        if "theme" in data:
            prefs.theme = data["theme"]
        if "currency" in data:
            prefs.currency = data["currency"]
    db.commit()
    db.refresh(prefs)
    return {"theme": prefs.theme, "currency": prefs.currency}
