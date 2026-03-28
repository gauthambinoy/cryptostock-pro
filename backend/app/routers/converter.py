"""
Currency converter API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from .. import auth, models
from ..services.market_data import get_market_service
import httpx

router = APIRouter(prefix="/api/converter", tags=["Currency Converter"])


@router.get("/convert")
async def convert_currency(
    from_currency: str = "USD",
    to_currency: str = "EUR",
    amount: float = 1.0,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"https://open.er-api.com/v6/latest/{from_currency.upper()}"
            )
            if response.status_code == 200:
                data = response.json()
                rates = data.get("rates", {})
                rate = rates.get(to_currency.upper())
                if rate:
                    return {
                        "from_currency": from_currency.upper(),
                        "to_currency": to_currency.upper(),
                        "amount": amount,
                        "result": round(amount * rate, 4),
                        "rate": rate,
                    }
    except:
        pass

    raise HTTPException(status_code=400, detail="Unable to fetch exchange rates")


@router.get("/crypto-convert")
async def convert_crypto(
    from_symbol: str = "BTC",
    to_symbol: str = "USD",
    amount: float = 1.0,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    market_service = get_market_service()
    from_quote = await market_service.get_crypto_quote(from_symbol.upper())
    if not from_quote:
        raise HTTPException(status_code=404, detail=f"Crypto {from_symbol} not found")

    from_usd = from_quote.price
    fiat_currencies = ["USD", "EUR", "GBP", "JPY", "INR", "AUD", "CAD", "CHF"]

    if to_symbol.upper() in fiat_currencies:
        if to_symbol.upper() == "USD":
            return {"from_currency": from_symbol.upper(), "to_currency": "USD", "amount": amount, "result": round(amount * from_usd, 4), "rate": round(from_usd, 4)}
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get("https://open.er-api.com/v6/latest/USD")
                data = response.json()
                fiat_rate = data.get("rates", {}).get(to_symbol.upper(), 1)
                result = amount * from_usd * fiat_rate
                return {"from_currency": from_symbol.upper(), "to_currency": to_symbol.upper(), "amount": amount, "result": round(result, 4), "rate": round(from_usd * fiat_rate, 4)}
        except:
            return {"from_currency": from_symbol.upper(), "to_currency": to_symbol.upper(), "amount": amount, "result": round(amount * from_usd, 4), "rate": round(from_usd, 4)}

    to_quote = await market_service.get_crypto_quote(to_symbol.upper())
    if not to_quote or to_quote.price == 0:
        raise HTTPException(status_code=404, detail=f"Crypto {to_symbol} not found")

    rate = from_usd / to_quote.price
    return {"from_currency": from_symbol.upper(), "to_currency": to_symbol.upper(), "amount": amount, "result": round(amount * rate, 6), "rate": round(rate, 6)}


@router.get("/rates")
async def get_exchange_rates(
    base: str = "USD",
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"https://open.er-api.com/v6/latest/{base.upper()}")
            if response.status_code == 200:
                data = response.json()
                all_rates = data.get("rates", {})
                currencies = ["USD", "EUR", "GBP", "JPY", "INR", "AUD", "CAD", "CHF"]
                return {"base": base.upper(), "rates": {c: all_rates.get(c, 0) for c in currencies}}
    except:
        pass

    return {"base": base.upper(), "rates": {"USD": 1, "EUR": 0.92, "GBP": 0.79, "JPY": 150.5, "INR": 83.1, "AUD": 1.53, "CAD": 1.36, "CHF": 0.88}}
