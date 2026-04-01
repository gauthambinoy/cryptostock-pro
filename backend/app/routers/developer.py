"""
Developer Dashboard API - Manage API keys and view usage statistics
For authenticated users only
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, HttpUrl
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime

from ..database import get_db
from ..auth import get_current_active_user
from .. import models
from ..services.api_service import (
    APIKeyManager, UsageTracker, WebhookManager
)

router = APIRouter(prefix="/api/developer", tags=["Developer"])


# ===================== REQUEST/RESPONSE SCHEMAS =====================

class APIKeyCreate(BaseModel):
    """Create API key request"""
    name: str
    pricing_tier: str = "free"  # free, pro, enterprise


class APIKeyResponse(BaseModel):
    """API key response (without secret)"""
    id: int
    name: str
    api_key: str
    pricing_tier: str
    rate_limit_per_minute: int
    is_active: bool
    is_revoked: bool
    last_used: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class APIKeySecretResponse(BaseModel):
    """API key with secret (shown only on creation)"""
    api_key: str
    api_secret: str
    message: str = "Save your API secret securely. You won't be able to see it again!"


class WebhookConfig(BaseModel):
    """Webhook configuration"""
    webhook_url: HttpUrl
    webhook_secret: Optional[str] = None


class UsageStatsResponse(BaseModel):
    """Usage statistics response"""
    total_calls: int
    total_cost: float
    api_keys: List[dict]
    monthly_breakdown: List[dict]


# ===================== API KEY MANAGEMENT =====================

@router.post(
    "/keys",
    response_model=APIKeySecretResponse,
    summary="Create API Key",
    description="Generate a new API key for developer access"
)
async def create_api_key(
    request: APIKeyCreate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new API key"""
    # Validate pricing tier
    valid_tiers = ["free", "pro", "enterprise"]
    if request.pricing_tier not in valid_tiers:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid pricing tier"
        )

    # Validate name
    if not request.name or len(request.name) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="API key name must be at least 3 characters"
        )

    # Create API key
    try:
        pricing_tier = models.PricingTier(request.pricing_tier)
        api_key, api_secret, db_key = APIKeyManager.create_api_key(
            db,
            current_user.id,
            request.name,
            pricing_tier
        )

        return APIKeySecretResponse(
            api_key=api_key,
            api_secret=api_secret,
            message="Save your API secret securely. You won't be able to see it again!"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create API key: {str(e)}"
        )


@router.get(
    "/keys",
    response_model=List[APIKeyResponse],
    summary="List API Keys",
    description="Get all API keys for current user"
)
async def list_api_keys(
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """List user's API keys"""
    keys = APIKeyManager.list_api_keys(db, current_user.id)
    return keys


@router.get(
    "/keys/{key_id}",
    response_model=APIKeyResponse,
    summary="Get API Key Details",
    description="Get details for a specific API key"
)
async def get_api_key_details(
    key_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get specific API key details"""
    api_key = db.query(models.APIKey).filter(
        models.APIKey.id == key_id,
        models.APIKey.user_id == current_user.id
    ).first()

    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )

    return api_key


@router.delete(
    "/keys/{key_id}",
    summary="Revoke API Key",
    description="Revoke/delete an API key"
)
async def revoke_api_key(
    key_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Revoke an API key"""
    success = APIKeyManager.revoke_api_key(db, key_id, current_user.id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )

    return {"message": "API key revoked successfully"}


@router.post(
    "/keys/{key_id}/rotate",
    response_model=APIKeySecretResponse,
    summary="Rotate API Key",
    description="Generate new credentials for an existing API key"
)
async def rotate_api_key(
    key_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Rotate API key credentials"""
    new_key, new_secret = APIKeyManager.rotate_api_key(db, key_id, current_user.id)

    if not new_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )

    return APIKeySecretResponse(
        api_key=new_key,
        api_secret=new_secret,
        message="API key rotated. Save your new secret securely!"
    )


# ===================== WEBHOOK CONFIGURATION =====================

@router.post(
    "/keys/{key_id}/webhook",
    summary="Configure Webhook",
    description="Set up webhook endpoint for alert delivery"
)
async def configure_webhook(
    key_id: int,
    config: WebhookConfig,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Configure webhook for API key"""
    success = WebhookManager.update_webhook(
        db,
        key_id,
        current_user.id,
        str(config.webhook_url),
        config.webhook_secret
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )

    return {
        "message": "Webhook configured successfully",
        "webhook_url": str(config.webhook_url)
    }


@router.delete(
    "/keys/{key_id}/webhook",
    summary="Remove Webhook",
    description="Remove webhook configuration"
)
async def remove_webhook(
    key_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Remove webhook configuration"""
    success = WebhookManager.update_webhook(
        db,
        key_id,
        current_user.id,
        None
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )

    return {"message": "Webhook removed successfully"}


# ===================== USAGE STATISTICS =====================

@router.get(
    "/usage",
    response_model=UsageStatsResponse,
    summary="Usage Statistics",
    description="Get API usage statistics for billing"
)
async def get_usage_stats(
    months: int = Query(3, ge=1, le=12),
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get usage statistics"""
    stats = UsageTracker.get_usage_stats(db, current_user.id, months)
    return stats


@router.get(
    "/usage/keys/{key_id}",
    summary="API Key Usage",
    description="Get usage statistics for specific API key"
)
async def get_key_usage(
    key_id: int,
    months: int = Query(3, ge=1, le=12),
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get usage for specific API key"""
    api_key = db.query(models.APIKey).filter(
        models.APIKey.id == key_id,
        models.APIKey.user_id == current_user.id
    ).first()

    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )

    # Get usage records
    from datetime import datetime, timedelta
    now = datetime.utcnow()
    usage_records = []

    for i in range(months):
        check_date = now - timedelta(days=30*i)
        usage = db.query(models.APIUsage).filter(
            models.APIUsage.api_key_id == key_id,
            models.APIUsage.year == check_date.year,
            models.APIUsage.month == check_date.month
        ).first()

        if usage:
            usage_records.append({
                "year": usage.year,
                "month": usage.month,
                "calls": usage.calls_made,
                "overage": usage.overage_calls,
                "cost": usage.cost
            })

    return {
        "api_key_id": key_id,
        "api_key_name": api_key.name,
        "tier": api_key.pricing_tier,
        "monthly_usage": usage_records,
        "total_calls": sum(r["calls"] for r in usage_records),
        "total_overage_cost": sum(r["cost"] for r in usage_records)
    }


# ===================== DOCUMENTATION =====================

@router.get(
    "/docs",
    summary="API Documentation",
    description="Get OpenAPI documentation and code examples"
)
async def get_documentation(
    current_user: models.User = Depends(get_current_active_user)
):
    """Get API documentation"""
    return {
        "documentation": {
            "swagger": "/docs",
            "redoc": "/redoc",
            "openapi": "/openapi.json"
        },
        "api_reference": {
            "base_url": "https://assetpulse.ai/api/v1",
            "authentication": "Bearer API_KEY:API_SECRET",
            "rate_limits": {
                "free": "No API access",
                "pro": "100 calls/minute",
                "enterprise": "1000 calls/minute"
            },
            "endpoints": {
                "predictions": {
                    "GET /api/v1/prediction/{symbol}": "Single prediction",
                    "GET /api/v1/predictions/top": "Top 10 predictions"
                },
                "sentiment": {
                    "GET /api/v1/sentiment/{symbol}": "Sentiment analysis"
                },
                "signals": {
                    "GET /api/v1/signals/{symbol}": "Trading signals"
                },
                "market": {
                    "GET /api/v1/correlation": "Asset correlations",
                    "GET /api/v1/macro": "Macro indicators",
                    "GET /api/v1/fear-greed": "Fear & Greed index"
                },
                "social": {
                    "GET /api/v1/leaderboard": "Top traders"
                },
                "webhooks": {
                    "POST /api/v1/alerts/webhook": "Send webhook alert"
                }
            }
        },
        "code_examples": {
            "python": {
                "description": "Python SDK example",
                "code": """
import assetpulse

client = assetpulse.APIClient(
    api_key="YOUR_API_KEY",
    api_secret="YOUR_API_SECRET"
)

# Get prediction
prediction = client.get_prediction("BTC")
print(prediction)

# Top predictions
top = client.get_top_predictions()
print(top)

# Sentiment
sentiment = client.get_sentiment("AAPL")
print(sentiment)
"""
            },
            "javascript": {
                "description": "JavaScript SDK example",
                "code": """
const AssetPulse = require('assetpulse-js');

const client = new AssetPulse({
  apiKey: 'YOUR_API_KEY',
  apiSecret: 'YOUR_API_SECRET'
});

// Get prediction
const prediction = await client.getPrediction('BTC');
console.log(prediction);

// Top predictions
const top = await client.getTopPredictions();
console.log(top);
"""
            },
            "curl": {
                "description": "cURL example",
                "code": """
curl -X GET "https://assetpulse.ai/api/v1/prediction/BTC" \\
  -H "Authorization: Bearer YOUR_API_KEY:YOUR_API_SECRET" \\
  -H "Content-Type: application/json"
"""
            }
        }
    }
