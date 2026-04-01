# AssetPulse Developer API v1.0

> Monetized API for AI-Powered Asset Predictions and Market Data

## Overview

AssetPulse Developer API provides programmatic access to:
- **90%+ Accuracy AI Predictions** for stocks and crypto
- **Sentiment Analysis** from 1000+ news sources + social media
- **Trading Signals** based on technical and ML analysis
- **Macro Indicators** (inflation, unemployment, interest rates)
- **Fear & Greed Index** for crypto assets
- **Asset Correlation Analysis**
- **Leaderboard Data** from top traders

## Quick Start

### 1. Generate API Key

1. Navigate to [Dashboard](https://assetpulse.ai/dashboard)
2. Go to **Developer** → **API Keys**
3. Click **Create New Key**
4. Save your API Key and Secret securely

### 2. Make Your First Request

```bash
curl -X GET "https://assetpulse.ai/api/v1/prediction/BTC" \
  -H "Authorization: Bearer YOUR_API_KEY:YOUR_API_SECRET" \
  -H "Content-Type: application/json"
```

### 3. Handle Response

```json
{
  "symbol": "BTC",
  "price": 65000,
  "prediction": {
    "confidence": 85,
    "direction": "up",
    "target_price": 68000
  },
  "sentiment": {
    "positive": 65,
    "negative": 20,
    "neutral": 15
  },
  "timestamp": "2024-04-01T12:00:00Z"
}
```

## Authentication

All API endpoints (except `/health`) require authentication using API Key and Secret.

### Authorization Header Format

```
Authorization: Bearer YOUR_API_KEY:YOUR_API_SECRET
```

### Example

```python
import requests

headers = {
    "Authorization": f"Bearer {api_key}:{api_secret}",
    "Content-Type": "application/json"
}

response = requests.get(
    "https://assetpulse.ai/api/v1/prediction/BTC",
    headers=headers
)
```

## Rate Limiting

Rate limits are enforced per pricing tier on a per-minute basis.

### Rate Limit Headers

Every response includes rate limit information:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 85
X-RateLimit-Reset: 2024-04-01T12:01:00Z
```

### Exceeding Rate Limits

When rate limit is exceeded, you'll receive:

```
HTTP 429 Too Many Requests

{
  "detail": "Rate limit exceeded. Limit: 100 calls/minute"
}
```

Implement exponential backoff:

```python
import time
import random

def make_request_with_retry(url, headers, max_retries=3):
    for attempt in range(max_retries):
        response = requests.get(url, headers=headers)
        if response.status_code == 429:
            wait_time = (2 ** attempt) + random.uniform(0, 1)
            time.sleep(wait_time)
            continue
        return response
    raise Exception("Max retries exceeded")
```

## API Endpoints

### Predictions

#### GET /api/v1/prediction/{symbol}

Get AI prediction for a single asset.

**Parameters:**
- `symbol` (string, required): Stock or crypto symbol (e.g., AAPL, BTC, TSLA)

**Response:**
```json
{
  "symbol": "BTC",
  "price": 65000,
  "prediction": {
    "direction": "up",
    "confidence": 85,
    "target_price": 68000,
    "timeframe": "7d"
  },
  "sentiment": {
    "positive": 65,
    "negative": 20,
    "neutral": 15,
    "sources": 1547
  },
  "timestamp": "2024-04-01T12:00:00Z"
}
```

#### GET /api/v1/predictions/top

Get top 10 predicted assets with highest confidence.

**Response:**
```json
{
  "count": 10,
  "predictions": [
    {
      "symbol": "BTC",
      "confidence": 85,
      "direction": "up",
      "target_price": 68000,
      "current_price": 65000
    }
  ],
  "timestamp": "2024-04-01T12:00:00Z"
}
```

### Sentiment Analysis

#### GET /api/v1/sentiment/{symbol}

Get detailed sentiment breakdown from news and social media.

**Parameters:**
- `symbol` (string, required): Asset symbol

**Response:**
```json
{
  "symbol": "AAPL",
  "sentiment": {
    "overall_score": 0.72,
    "positive": 72,
    "negative": 15,
    "neutral": 13,
    "sources": 2341,
    "news_sentiment": {
      "score": 0.75,
      "sources": 1200
    },
    "social_sentiment": {
      "reddit": 0.68,
      "twitter": 0.70
    }
  },
  "timestamp": "2024-04-01T12:00:00Z"
}
```

### Trading Signals

#### GET /api/v1/signals/{symbol}

Get actionable trading signals based on technical and ML analysis.

**Parameters:**
- `symbol` (string, required): Asset symbol

**Response:**
```json
{
  "symbol": "TSLA",
  "signals": {
    "buy_signals": [
      {
        "name": "RSI Oversold",
        "strength": "strong",
        "value": 28
      },
      {
        "name": "Moving Average Crossover",
        "strength": "medium"
      }
    ],
    "sell_signals": [],
    "overall_signal": "BUY",
    "confidence": 0.82
  },
  "timestamp": "2024-04-01T12:00:00Z"
}
```

### Market Correlations

#### GET /api/v1/correlation

Get correlation matrix between selected assets.

**Parameters:**
- `symbols` (string, required): Comma-separated symbols (e.g., BTC,ETH,AAPL)

**Response:**
```json
{
  "correlations": {
    "symbols": ["BTC", "ETH", "AAPL"],
    "matrix": [
      [1.0, 0.81, 0.25],
      [0.81, 1.0, 0.18],
      [0.25, 0.18, 1.0]
    ]
  },
  "timestamp": "2024-04-01T12:00:00Z"
}
```

### Macroeconomic Indicators

#### GET /api/v1/macro

Get current macroeconomic indicators.

**Response:**
```json
{
  "indicators": {
    "inflation_rate": 3.2,
    "unemployment_rate": 3.8,
    "gdp_growth": 2.5,
    "interest_rate": 5.33,
    "vix": 18.5,
    "dxy": 104.2
  },
  "timestamp": "2024-04-01T12:00:00Z"
}
```

### Fear & Greed Index

#### GET /api/v1/fear-greed

Get current crypto fear and greed index.

**Response:**
```json
{
  "index": {
    "value": 62,
    "status": "greed",
    "previous_value": 58,
    "timestamp": "2024-04-01T12:00:00Z"
  },
  "timestamp": "2024-04-01T12:00:00Z"
}
```

### Leaderboard

#### GET /api/v1/leaderboard

Get leaderboard of top performing traders.

**Parameters:**
- `period` (string, optional): daily, weekly, monthly, yearly, all_time (default: monthly)
- `limit` (integer, optional): Number of results 1-100 (default: 10)

**Response:**
```json
{
  "period": "monthly",
  "limit": 10,
  "leaderboard": [
    {
      "rank": 1,
      "username": "CryptoWhiz",
      "accuracy": 89.5,
      "win_rate": 0.78,
      "total_trades": 142
    }
  ],
  "timestamp": "2024-04-01T12:00:00Z"
}
```

### Webhooks

#### POST /api/v1/alerts/webhook

Manually send webhook alert to configured endpoint.

**Request Body:**
```json
{
  "symbol": "BTC",
  "signal": "BUY",
  "confidence": 85,
  "reason": "RSI oversold"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Webhook delivered",
  "timestamp": "2024-04-01T12:00:00Z"
}
```

### Status

#### GET /api/v1/status

Check API status and current rate limit.

**Response:**
```json
{
  "status": "healthy",
  "api_key": "Production Bot",
  "tier": "pro",
  "rate_limit": {
    "limit": 100,
    "current": 45,
    "remaining": 55,
    "reset_at": "2024-04-01T12:01:00Z"
  },
  "timestamp": "2024-04-01T12:00:00Z"
}
```

## SDKs & Libraries

### Python SDK

```bash
pip install assetpulse
```

```python
import assetpulse

client = assetpulse.APIClient(
    api_key="ak_xxx",
    api_secret="secret_xxx"
)

# Get prediction
prediction = client.get_prediction("BTC")
print(prediction.confidence)

# Top predictions
top = client.get_top_predictions()
for pred in top:
    print(f"{pred.symbol}: {pred.direction} ({pred.confidence}%)")

# Sentiment
sentiment = client.get_sentiment("AAPL")
print(f"Sentiment: {sentiment.overall_score}")

# Signals
signals = client.get_signals("TSLA")
print(f"Signal: {signals.overall_signal}")
```

### JavaScript SDK

```bash
npm install assetpulse-js
```

```javascript
const AssetPulse = require('assetpulse-js');

const client = new AssetPulse({
  apiKey: 'ak_xxx',
  apiSecret: 'secret_xxx'
});

// Get prediction
const prediction = await client.getPrediction('BTC');
console.log(prediction.confidence);

// Top predictions
const top = await client.getTopPredictions();
top.forEach(pred => {
  console.log(`${pred.symbol}: ${pred.direction} (${pred.confidence}%)`);
});

// Sentiment
const sentiment = await client.getSentiment('AAPL');
console.log(`Sentiment: ${sentiment.overall_score}`);

// Signals
const signals = await client.getSignals('TSLA');
console.log(`Signal: ${signals.overall_signal}`);
```

## Use Cases

### 1. Robo-Advisor Integration

Automate trading based on AssetPulse predictions:

```python
def run_trading_bot():
    client = assetpulse.APIClient(api_key, api_secret)
    
    for symbol in ["BTC", "AAPL", "TSLA"]:
        prediction = client.get_prediction(symbol)
        
        if prediction.confidence > 80:
            if prediction.direction == "up":
                # BUY
                execute_buy_order(symbol, prediction.target_price)
            else:
                # SELL
                execute_sell_order(symbol)
```

### 2. Discord Bot

Post daily top predictions to Discord:

```python
import discord
from discord.ext import commands, tasks

bot = commands.Bot()
client = assetpulse.APIClient(api_key, api_secret)

@tasks.loop(hours=24)
async def post_daily_predictions():
    top = client.get_top_predictions()
    
    embed = discord.Embed(title="Top Predictions", color=discord.Color.blue())
    for pred in top:
        embed.add_field(
            name=pred.symbol,
            value=f"{pred.direction} - {pred.confidence}% confidence",
            inline=False
        )
    
    await channel.send(embed=embed)
```

### 3. Slack Integration

Send alerts when high-confidence predictions occur:

```python
from slack_sdk import WebClient
import asyncio

slack = WebClient(token='xoxb-xxx')
client = assetpulse.APIClient(api_key, api_secret)

async def monitor_predictions():
    while True:
        top = client.get_top_predictions()
        
        for pred in top:
            if pred.confidence > 85:
                slack.chat_postMessage(
                    channel="#trading-alerts",
                    text=f"🚀 HIGH CONFIDENCE: {pred.symbol} {pred.direction} ({pred.confidence}%)"
                )
        
        await asyncio.sleep(300)  # Check every 5 minutes
```

### 4. Mobile App Integration

```javascript
// React Native example
import AssetPulse from 'assetpulse-js';

const client = new AssetPulse({
  apiKey: API_KEY,
  apiSecret: API_SECRET
});

useEffect(() => {
  const fetchPredictions = async () => {
    const top = await client.getTopPredictions();
    setPredictions(top);
  };

  fetchPredictions();
  const interval = setInterval(fetchPredictions, 60000);
  
  return () => clearInterval(interval);
}, []);
```

## Pricing

### Free Tier
- **Cost:** $0/month
- **API Access:** None
- **Rate Limit:** N/A

### Pro Tier
- **Cost:** $9.99/month
- **Rate Limit:** 100 calls/minute
- **Overage Cost:** $0.01 per call
- **Monthly Limit:** ~4.3M calls
- **Includes:** All endpoints, webhooks, email support

### Enterprise Tier
- **Cost:** $99/month
- **Rate Limit:** 1000 calls/minute
- **Overage Cost:** $0.001 per call
- **Monthly Limit:** ~43M calls
- **Includes:** All endpoints, webhooks, priority support
- **Volume Discount:** 50% off for 1M+ calls/month

## Error Handling

### Error Response Format

```json
{
  "detail": "Error message describing what went wrong"
}
```

### Common Error Codes

| Code | Message | Solution |
|------|---------|----------|
| 400 | Bad Request | Check request parameters |
| 401 | Unauthorized | Verify API key and secret |
| 404 | Not Found | Symbol doesn't exist |
| 429 | Rate Limit Exceeded | Implement exponential backoff |
| 500 | Internal Server Error | Try again later |

### Error Handling Example

```python
import requests
import time

def make_request(url, headers, max_retries=3):
    for attempt in range(max_retries):
        try:
            response = requests.get(url, headers=headers, timeout=10)
            response.raise_for_status()
            return response.json()
        
        except requests.exceptions.HTTPError as e:
            if response.status_code == 429:
                wait_time = (2 ** attempt) + random.uniform(0, 1)
                time.sleep(wait_time)
            elif response.status_code == 401:
                raise Exception("Invalid API credentials")
            elif response.status_code >= 500:
                time.sleep(5)
            else:
                raise
        
        except requests.exceptions.Timeout:
            if attempt < max_retries - 1:
                time.sleep(2 ** attempt)
            else:
                raise
```

## Webhook Setup

### Configuration

1. Go to **Developer** → **API Keys**
2. Select your API key
3. Click **Configure Webhook**
4. Enter your webhook URL and optional secret

### Webhook Payload

```json
{
  "event": "prediction_alert",
  "symbol": "BTC",
  "prediction": {
    "direction": "up",
    "confidence": 85,
    "target_price": 68000
  },
  "timestamp": "2024-04-01T12:00:00Z"
}
```

### Webhook Signature Verification

```python
import hmac
import hashlib

def verify_webhook_signature(payload, signature, secret):
    expected = hmac.new(
        secret.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(signature, expected)

# In your webhook handler
@app.post("/webhook")
def handle_webhook(request):
    signature = request.headers.get("X-AssetPulse-Signature")
    payload = request.body
    
    if not verify_webhook_signature(payload, signature, WEBHOOK_SECRET):
        return {"error": "Invalid signature"}, 401
    
    data = json.loads(payload)
    # Process webhook...
```

## Best Practices

### 1. API Key Security

- Never commit API keys to version control
- Rotate keys periodically
- Use environment variables
- Implement IP whitelisting

### 2. Rate Limiting

- Implement exponential backoff
- Cache responses when possible
- Use webhooks for real-time alerts
- Monitor usage via dashboard

### 3. Error Handling

- Implement retry logic for transient errors
- Log errors for debugging
- Set appropriate timeouts
- Handle network failures gracefully

### 4. Performance

- Batch requests when possible
- Use webhooks instead of polling
- Cache predictions for 5+ minutes
- Implement local rate limiting

## Support

- **Email:** support@assetpulse.ai
- **Discord:** [Join Community](https://discord.gg/assetpulse)
- **Documentation:** [Full API Docs](https://assetpulse.ai/docs)
- **Status Page:** [status.assetpulse.ai](https://status.assetpulse.ai)

## Changelog

### v1.0.0 (April 1, 2024)
- Initial public release
- All endpoints available
- Python & JavaScript SDKs
- Webhook support
- Rate limiting per tier
- Usage analytics
