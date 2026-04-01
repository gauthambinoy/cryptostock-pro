"""
Price alerts API endpoints with email/SMS notification support
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from .. import schemas, auth, models
from ..services.market_data import get_market_service
from ..services.email_service import get_email_service
from ..services.sms_service import get_sms_service

router = APIRouter(prefix="/api/alerts", tags=["Alerts"])


@router.get("/", response_model=List[schemas.AlertResponse])
async def get_alerts(
    active_only: bool = True,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all alerts for current user
    """
    query = db.query(models.Alert).filter(models.Alert.user_id == current_user.id)

    if active_only:
        query = query.filter(models.Alert.is_active == True)

    alerts = query.order_by(models.Alert.created_at.desc()).all()

    market_service = get_market_service()
    result = []

    for alert in alerts:
        # Get current price
        if alert.asset_type == models.AssetType.CRYPTO:
            quote = await market_service.get_crypto_quote(alert.symbol)
        else:
            quote = market_service.get_stock_quote(alert.symbol)

        current_price = quote.price if quote else None

        result.append(schemas.AlertResponse(
            id=alert.id,
            symbol=alert.symbol,
            asset_type=alert.asset_type,
            alert_type=alert.alert_type,
            target_value=alert.target_value,
            is_active=alert.is_active,
            is_triggered=alert.is_triggered,
            triggered_at=alert.triggered_at,
            notify_email=alert.notify_email,
            notify_sms=alert.notify_sms,
            frequency=alert.frequency,
            created_at=alert.created_at,
            current_price=current_price
        ))

    return result


@router.post("/", response_model=schemas.AlertResponse, status_code=status.HTTP_201_CREATED)
async def create_alert(
    alert_data: schemas.AlertCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new price alert

    Alert types:
    - **price_above**: Trigger when price goes above target
    - **price_below**: Trigger when price goes below target
    - **percent_change**: Trigger on percentage change from current price

    Notification options:
    - **notify_email**: Send email alerts (default: true)
    - **notify_sms**: Send SMS alerts (premium users only)
    - **frequency**: immediately, daily, weekly, or never
    """
    # Verify the asset exists
    market_service = get_market_service()

    if alert_data.asset_type == schemas.AssetType.CRYPTO:
        quote = await market_service.get_crypto_quote(alert_data.symbol)
    else:
        quote = market_service.get_stock_quote(alert_data.symbol)

    if not quote:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Asset {alert_data.symbol} not found"
        )

    # Validate SMS settings for non-premium users
    if alert_data.notify_sms and not current_user.is_premium:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="SMS alerts are available for premium users only"
        )

    alert = models.Alert(
        user_id=current_user.id,
        symbol=alert_data.symbol.upper(),
        asset_type=models.AssetType(alert_data.asset_type.value),
        alert_type=models.AlertType(alert_data.alert_type.value),
        target_value=alert_data.target_value,
        notify_email=alert_data.notify_email,
        notify_sms=alert_data.notify_sms and current_user.is_premium,
        frequency=alert_data.frequency
    )

    db.add(alert)
    db.commit()
    db.refresh(alert)

    return schemas.AlertResponse(
        id=alert.id,
        symbol=alert.symbol,
        asset_type=alert.asset_type,
        alert_type=alert.alert_type,
        target_value=alert.target_value,
        is_active=alert.is_active,
        is_triggered=alert.is_triggered,
        triggered_at=alert.triggered_at,
        notify_email=alert.notify_email,
        notify_sms=alert.notify_sms,
        frequency=alert.frequency,
        created_at=alert.created_at,
        current_price=quote.price
    )


@router.put("/{alert_id}", response_model=schemas.AlertResponse)
async def update_alert(
    alert_id: int,
    alert_data: schemas.AlertUpdate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update an alert's settings
    """
    alert = db.query(models.Alert).filter(
        models.Alert.id == alert_id,
        models.Alert.user_id == current_user.id
    ).first()

    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found"
        )

    # Validate SMS settings for non-premium users
    if alert_data.notify_sms and not current_user.is_premium:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="SMS alerts are available for premium users only"
        )

    # Update fields
    if alert_data.target_value is not None:
        alert.target_value = alert_data.target_value
    if alert_data.notify_email is not None:
        alert.notify_email = alert_data.notify_email
    if alert_data.notify_sms is not None:
        alert.notify_sms = alert_data.notify_sms and current_user.is_premium
    if alert_data.frequency is not None:
        alert.frequency = alert_data.frequency
    if alert_data.is_active is not None:
        alert.is_active = alert_data.is_active

    db.commit()
    db.refresh(alert)

    # Get current price
    market_service = get_market_service()
    if alert.asset_type == models.AssetType.CRYPTO:
        quote = await market_service.get_crypto_quote(alert.symbol)
    else:
        quote = market_service.get_stock_quote(alert.symbol)

    current_price = quote.price if quote else None

    return schemas.AlertResponse(
        id=alert.id,
        symbol=alert.symbol,
        asset_type=alert.asset_type,
        alert_type=alert.alert_type,
        target_value=alert.target_value,
        is_active=alert.is_active,
        is_triggered=alert.is_triggered,
        triggered_at=alert.triggered_at,
        notify_email=alert.notify_email,
        notify_sms=alert.notify_sms,
        frequency=alert.frequency,
        created_at=alert.created_at,
        current_price=current_price
    )


@router.delete("/{alert_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_alert(
    alert_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete an alert
    """
    alert = db.query(models.Alert).filter(
        models.Alert.id == alert_id,
        models.Alert.user_id == current_user.id
    ).first()
    
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found"
        )
    
    db.delete(alert)
    db.commit()


@router.put("/{alert_id}/toggle")
async def toggle_alert(
    alert_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Toggle alert active status
    """
    alert = db.query(models.Alert).filter(
        models.Alert.id == alert_id,
        models.Alert.user_id == current_user.id
    ).first()
    
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found"
        )
    
    alert.is_active = not alert.is_active
    db.commit()
    
    return {"id": alert_id, "is_active": alert.is_active}


@router.post("/check")
async def check_alerts(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Manually check all active alerts for triggers
    """
    alerts = db.query(models.Alert).filter(
        models.Alert.user_id == current_user.id,
        models.Alert.is_active == True,
        models.Alert.is_triggered == False
    ).all()

    market_service = get_market_service()
    triggered = []

    for alert in alerts:
        # Get current price
        if alert.asset_type == models.AssetType.CRYPTO:
            quote = await market_service.get_crypto_quote(alert.symbol)
        else:
            quote = market_service.get_stock_quote(alert.symbol)

        if not quote:
            continue

        current_price = quote.price
        should_trigger = False

        if alert.alert_type == models.AlertType.PRICE_ABOVE:
            should_trigger = current_price >= alert.target_value
        elif alert.alert_type == models.AlertType.PRICE_BELOW:
            should_trigger = current_price <= alert.target_value
        elif alert.alert_type == models.AlertType.PERCENT_CHANGE:
            # For percent change, we'd need to track the price at alert creation
            # For now, skip this type in manual check
            pass

        if should_trigger:
            from datetime import datetime
            alert.is_triggered = True
            alert.triggered_at = datetime.utcnow()
            triggered.append({
                "id": alert.id,
                "symbol": alert.symbol,
                "alert_type": alert.alert_type.value,
                "target_value": alert.target_value,
                "current_price": current_price
            })

    db.commit()

    return {
        "checked": len(alerts),
        "triggered": len(triggered),
        "alerts": triggered
    }


@router.post("/send-digest")
async def send_daily_digest(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Send daily digest email to current user (admin endpoint)
    Includes top 5 market opportunities based on sentiment and price action
    """
    email_service = get_email_service()

    # Sample opportunities (in production, these would come from analysis engine)
    opportunities = [
        {
            "symbol": "BTC",
            "price": 45000,
            "change_percent": 5.2,
            "reason": "Strong bullish sentiment, technical breakout"
        },
        {
            "symbol": "AAPL",
            "price": 185.50,
            "change_percent": 2.1,
            "reason": "Positive earnings outlook, analyst upgrades"
        },
        {
            "symbol": "ETH",
            "price": 2500,
            "change_percent": 3.8,
            "reason": "Network activity surge, DeFi growth"
        },
        {
            "symbol": "MSFT",
            "price": 415.20,
            "change_percent": 1.5,
            "reason": "AI integration momentum, strong guidance"
        },
        {
            "symbol": "SOL",
            "price": 120.00,
            "change_percent": 4.2,
            "reason": "Developer activity up, ecosystem expansion"
        }
    ]

    success = await email_service.send_daily_digest(
        to_email=current_user.email,
        user_name=current_user.full_name or current_user.username,
        opportunities=opportunities
    )

    return {
        "success": success,
        "message": "Daily digest sent" if success else "Failed to send digest",
        "email": current_user.email
    }
