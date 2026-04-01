"""
Leaderboard API endpoints - Community rankings and achievements
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from ..database import get_db
from .. import auth, models
from ..services.leaderboard_service import get_leaderboard_service
from ..services.market_data import get_market_service

router = APIRouter(prefix="/api/leaderboard", tags=["Leaderboard"])


@router.get("/", tags=["Leaderboard"])
async def get_leaderboard(
    period: str = Query("monthly", regex="^(monthly|yearly|all_time)$"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get leaderboard rankings by prediction accuracy.

    - **period**: monthly, yearly, or all_time
    - **limit**: max results (1-500)
    - **offset**: pagination offset
    """
    service = get_leaderboard_service(db)
    leaderboard = service.get_leaderboard(period=period, limit=limit, offset=offset)
    return {"period": period, "data": leaderboard}


@router.get("/my-rank", tags=["Leaderboard"])
async def get_my_rank(
    period: str = Query("monthly", regex="^(monthly|yearly|all_time)$"),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get the current user's rank and statistics for a period.

    - **period**: monthly, yearly, or all_time
    """
    service = get_leaderboard_service(db)
    rank_info = service.get_user_rank(current_user.id, period=period)

    if not rank_info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User statistics not found",
        )

    return rank_info


@router.get("/{user_id}", tags=["Leaderboard"])
async def get_user_profile(
    user_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get a user's profile with stats and badges.
    """
    user = db.query(models.User).filter(models.User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    stats = db.query(models.UserStats).filter(
        models.UserStats.user_id == user_id
    ).first()

    service = get_leaderboard_service(db)
    badges = service.get_user_badges(user_id)
    followers_count = service.get_user_followers_count(user_id)
    is_following = service.is_user_following(current_user.id, user_id)

    return {
        "user_id": user.id,
        "username": user.username,
        "full_name": user.full_name,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "stats": {
            "accuracy_percentage": stats.accuracy_percentage if stats else 0.0,
            "total_predictions": stats.total_predictions if stats else 0,
            "correct_predictions": stats.correct_predictions if stats else 0,
            "best_trade_return": stats.best_trade_return if stats else 0.0,
            "total_trades": stats.total_trades if stats else 0,
            "win_rate": stats.win_rate if stats else 0.0,
        },
        "badges": badges,
        "followers_count": followers_count,
        "is_following": is_following,
    }


@router.get("/{user_id}/followers", tags=["Leaderboard"])
async def get_user_followers(
    user_id: int,
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get list of users following a specific user.
    """
    user = db.query(models.User).filter(models.User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    followers = (
        db.query(models.User)
        .join(models.UserFollow, models.UserFollow.follower_id == models.User.id)
        .filter(models.UserFollow.following_id == user_id)
        .limit(limit)
        .offset(offset)
        .all()
    )

    return {
        "user_id": user_id,
        "followers": [
            {
                "user_id": f.id,
                "username": f.username,
                "full_name": f.full_name,
            }
            for f in followers
        ],
        "total_followers": db.query(models.UserFollow).filter(
            models.UserFollow.following_id == user_id
        ).count(),
    }


@router.post("/{user_id}/follow", tags=["Leaderboard"])
async def follow_user(
    user_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """
    Follow a user to copy their alerts and view their profile.
    """
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot follow yourself",
        )

    target_user = db.query(models.User).filter(models.User.id == user_id).first()

    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    service = get_leaderboard_service(db)
    is_new = service.follow_user(current_user.id, user_id)

    return {
        "success": True,
        "message": "Now following user" if is_new else "Already following user",
        "is_new_follow": is_new,
    }


@router.delete("/{user_id}/follow", tags=["Leaderboard"])
async def unfollow_user(
    user_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """
    Unfollow a user.
    """
    service = get_leaderboard_service(db)
    was_following = service.unfollow_user(current_user.id, user_id)

    return {
        "success": True,
        "message": "Unfollowed user" if was_following else "Was not following user",
        "was_following": was_following,
    }


@router.post("/{user_id}/copy-alerts", tags=["Leaderboard"])
async def copy_user_alerts(
    user_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """
    Copy another user's active alerts.
    Must be following the user first.
    """
    # Check if current user is following the target user
    is_following = (
        db.query(models.UserFollow)
        .filter(
            models.UserFollow.follower_id == current_user.id,
            models.UserFollow.following_id == user_id,
        )
        .first() is not None
    )

    if not is_following:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Must follow user to copy their alerts",
        )

    # Get user's active alerts
    source_alerts = (
        db.query(models.Alert)
        .filter(
            models.Alert.user_id == user_id,
            models.Alert.is_active == True,
            models.Alert.is_deleted == False,
        )
        .all()
    )

    copied_count = 0
    for source_alert in source_alerts:
        # Check if alert already exists for current user
        existing = (
            db.query(models.Alert)
            .filter(
                models.Alert.user_id == current_user.id,
                models.Alert.symbol == source_alert.symbol,
                models.Alert.alert_type == source_alert.alert_type,
                models.Alert.target_value == source_alert.target_value,
                models.Alert.is_deleted == False,
            )
            .first()
        )

        if not existing:
            # Create copy of alert
            new_alert = models.Alert(
                user_id=current_user.id,
                symbol=source_alert.symbol,
                asset_type=source_alert.asset_type,
                alert_type=source_alert.alert_type,
                target_value=source_alert.target_value,
                is_active=True,
            )
            db.add(new_alert)
            copied_count += 1

    db.commit()

    return {
        "success": True,
        "copied_alerts": copied_count,
        "message": f"Copied {copied_count} alerts from user",
    }


@router.get("", tags=["Leaderboard"])
async def get_legacy_leaderboard(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """
    Legacy endpoint: Get top 20 users by portfolio performance (for backward compatibility).
    Usernames are anonymized (first 2 chars + ***).
    """
    users = db.query(models.User).filter(
        models.User.is_active == True
    ).all()

    market_service = get_market_service()
    user_performances = []

    for user in users:
        portfolios = db.query(models.Portfolio).filter(
            models.Portfolio.user_id == user.id
        ).all()

        if not portfolios:
            continue

        total_invested = 0.0
        total_current_value = 0.0

        for portfolio in portfolios:
            for holding in portfolio.holdings:
                invested = holding.quantity * holding.buy_price
                total_invested += invested

                # Get current price
                if holding.asset_type == models.AssetType.CRYPTO:
                    quote = await market_service.get_crypto_quote(holding.symbol)
                else:
                    quote = market_service.get_stock_quote(holding.symbol)

                if quote:
                    total_current_value += holding.quantity * quote.price
                else:
                    total_current_value += invested

        if total_invested <= 0:
            continue

        total_return_percent = round(
            (total_current_value - total_invested) / total_invested * 100, 2
        )

        # Anonymize username: first 2 chars + ***
        username = user.username
        if len(username) >= 2:
            anonymized = username[:2] + "***"
        else:
            anonymized = username[0] + "***" if username else "***"

        user_performances.append({
            "username": anonymized,
            "total_return_percent": total_return_percent,
            "portfolio_value": round(total_current_value, 2),
        })

    # Sort by total_return_percent descending and take top 20
    user_performances.sort(key=lambda x: x["total_return_percent"], reverse=True)
    top_20 = user_performances[:20]

    # Add rank
    result = []
    for i, entry in enumerate(top_20, start=1):
        result.append({
            "rank": i,
            "username": entry["username"],
            "total_return_percent": entry["total_return_percent"],
            "portfolio_value": entry["portfolio_value"],
        })

    return result
