"""
Authentication API endpoints
"""
import uuid
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address
from ..database import get_db
from ..config import get_settings
from .. import schemas, auth, models

router = APIRouter(prefix="/api/auth", tags=["Authentication"])
settings = get_settings()
limiter = Limiter(key_func=get_remote_address)


@limiter.limit("3/minute")
@router.post("/register", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
async def register(request: Request, user_data: schemas.UserCreate, db: Session = Depends(get_db)):
    """
    Register a new user account
    
    - **email**: Valid email address
    - **username**: Unique username (3-50 characters)
    - **password**: Strong password (min 8 characters)
    - **full_name**: Optional full name
    """
    user = auth.create_user(db, user_data)
    return user


@limiter.limit("5/minute")
@router.post("/login")
async def login(request: Request, response: Response, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """
    Login and get access token via httpOnly cookie

    Use email as username field
    """
    user = auth.authenticate_user(db, form_data.username, form_data.password)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = auth.create_access_token(
        data={"sub": str(user.id)},
        expires_delta=access_token_expires
    )

    # Set httpOnly cookie with token
    response.set_cookie(
        key="access_token",
        value=access_token,
        max_age=settings.access_token_expire_minutes * 60,
        httponly=True,
        secure=True,
        samesite="lax"
    )

    return {"message": "Login successful"}


@limiter.limit("5/minute")
@router.post("/login/json")
async def login_json(request: Request, response: Response, credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    """
    Login with JSON body via httpOnly cookie
    """
    user = auth.authenticate_user(db, credentials.email, credentials.password)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = auth.create_access_token(
        data={"sub": str(user.id)},
        expires_delta=access_token_expires
    )

    # Set httpOnly cookie with token
    response.set_cookie(
        key="access_token",
        value=access_token,
        max_age=settings.access_token_expire_minutes * 60,
        httponly=True,
        secure=True,
        samesite="lax"
    )

    return {"message": "Login successful"}


@router.post("/logout")
async def logout(response: Response):
    """
    Logout user - clears authentication cookie
    """
    response.delete_cookie("access_token", secure=True, samesite="lax")
    return {"message": "Logout successful"}


@router.get("/me", response_model=schemas.UserResponse)
async def get_current_user_info(current_user: models.User = Depends(auth.get_current_user)):
    """
    Get current authenticated user's information
    """
    return current_user


@router.put("/me", response_model=schemas.UserResponse)
async def update_user_info(
    full_name: str = None,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update current user's information
    """
    if full_name:
        current_user.full_name = full_name
        db.commit()
        db.refresh(current_user)
    
    return current_user


@router.post("/change-password")
async def change_password(
    current_password: str,
    new_password: str,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Change user password
    """
    if not auth.verify_password(current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    if len(new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 8 characters"
        )
    
    current_user.hashed_password = auth.get_password_hash(new_password)
    db.commit()
    
    return {"message": "Password updated successfully"}


@limiter.limit("10/minute")
@router.post("/guest")
async def guest_login(request: Request, response: Response, db: Session = Depends(get_db)):
    """
    Continue as guest - creates a temporary guest account with sample portfolio data.
    """
    guest_id = uuid.uuid4().hex[:8]
    guest_email = f"guest_{guest_id}@cryptostock.guest"
    guest_username = f"guest_{guest_id}"
    guest_password = f"Guest_{uuid.uuid4().hex[:16]}!"

    # Create guest user
    hashed = auth.get_password_hash(guest_password)
    guest_user = models.User(
        email=guest_email,
        username=guest_username,
        hashed_password=hashed,
        full_name=f"Guest User",
        is_active=True,
    )
    db.add(guest_user)
    db.commit()
    db.refresh(guest_user)

    # Create default portfolio with sample holdings
    portfolio = models.Portfolio(name="Sample Portfolio", user_id=guest_user.id)
    db.add(portfolio)
    db.commit()
    db.refresh(portfolio)

    # Add sample holdings
    sample_holdings = [
        {"symbol": "AAPL", "name": "Apple Inc.", "asset_type": "stock", "quantity": 10, "buy_price": 175.0},
        {"symbol": "GOOGL", "name": "Alphabet Inc.", "asset_type": "stock", "quantity": 5, "buy_price": 140.0},
        {"symbol": "MSFT", "name": "Microsoft Corp.", "asset_type": "stock", "quantity": 8, "buy_price": 380.0},
        {"symbol": "BTC", "name": "Bitcoin", "asset_type": "crypto", "quantity": 0.5, "buy_price": 42000.0},
        {"symbol": "ETH", "name": "Ethereum", "asset_type": "crypto", "quantity": 5, "buy_price": 2200.0},
        {"symbol": "TSLA", "name": "Tesla Inc.", "asset_type": "stock", "quantity": 12, "buy_price": 195.0},
        {"symbol": "NVDA", "name": "NVIDIA Corp.", "asset_type": "stock", "quantity": 6, "buy_price": 480.0},
        {"symbol": "SOL", "name": "Solana", "asset_type": "crypto", "quantity": 50, "buy_price": 95.0},
    ]

    for h in sample_holdings:
        holding = models.Holding(
            portfolio_id=portfolio.id,
            symbol=h["symbol"],
            name=h["name"],
            asset_type=models.AssetType(h["asset_type"]),
            quantity=h["quantity"],
            buy_price=h["buy_price"],
            buy_date=datetime.utcnow() - timedelta(days=90),
        )
        db.add(holding)

    # Add sample goals
    goal = models.Goal(
        user_id=guest_user.id,
        name="Reach $50,000 Portfolio",
        target_amount=50000,
        current_amount=35000,
    )
    db.add(goal)

    # Add sample watchlist
    for sym, atype in [("AMZN", "stock"), ("XRP", "crypto"), ("META", "stock"), ("ADA", "crypto")]:
        db.add(models.WatchlistItem(
            user_id=guest_user.id,
            symbol=sym,
            asset_type=models.AssetType(atype),
        ))

    db.commit()

    # Generate token
    access_token = auth.create_access_token(
        data={"sub": str(guest_user.id)},
        expires_delta=timedelta(hours=24),
    )

    # Set httpOnly cookie with token
    response.set_cookie(
        key="access_token",
        value=access_token,
        max_age=24 * 60 * 60,  # 24 hours
        httponly=True,
        secure=True,
        samesite="lax"
    )

    return {"message": "Guest login successful"}
