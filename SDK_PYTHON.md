# AssetPulse Python SDK

Simple and powerful Python SDK for AssetPulse Developer API.

## Installation

```bash
pip install assetpulse
```

Or from source:

```bash
git clone https://github.com/assetpulse/python-sdk.git
cd python-sdk
pip install -e .
```

## Quick Start

```python
from assetpulse import APIClient

# Initialize client
client = APIClient(
    api_key="ak_your_api_key",
    api_secret="your_api_secret"
)

# Get prediction for Bitcoin
prediction = client.get_prediction("BTC")
print(f"BTC Prediction: {prediction.direction} ({prediction.confidence}% confidence)")

# Get top 10 predictions
top_predictions = client.get_top_predictions()
for pred in top_predictions:
    print(f"{pred.symbol}: {pred.direction} - Target: ${pred.target_price}")

# Get sentiment analysis
sentiment = client.get_sentiment("AAPL")
print(f"AAPL Sentiment Score: {sentiment.overall_score}")

# Get trading signals
signals = client.get_signals("TSLA")
print(f"TSLA Trading Signal: {signals.overall_signal}")
```

## Configuration

### Environment Variables

```bash
export ASSETPULSE_API_KEY="ak_xxx"
export ASSETPULSE_API_SECRET="secret_xxx"
```

```python
from assetpulse import APIClient

# Automatically loads from environment variables
client = APIClient()
```

### Manual Configuration

```python
from assetpulse import APIClient

client = APIClient(
    api_key="ak_xxx",
    api_secret="secret_xxx",
    base_url="https://assetpulse.ai",  # Optional, defaults to production
    timeout=10  # Request timeout in seconds
)
```

## API Methods

### Predictions

#### get_prediction(symbol: str) -> Prediction

Get AI prediction for a single asset.

```python
prediction = client.get_prediction("BTC")

print(prediction.symbol)           # "BTC"
print(prediction.price)            # 65000
print(prediction.direction)        # "up"
print(prediction.confidence)       # 85
print(prediction.target_price)     # 68000
print(prediction.timeframe)        # "7d"
```

#### get_top_predictions(limit: int = 10) -> List[Prediction]

Get top N predicted assets.

```python
top = client.get_top_predictions(limit=5)

for pred in top:
    print(f"{pred.symbol}: {pred.direction} (+{pred.confidence}%)")
```

### Sentiment Analysis

#### get_sentiment(symbol: str) -> Sentiment

Get detailed sentiment breakdown.

```python
sentiment = client.get_sentiment("AAPL")

print(sentiment.overall_score)        # 0.72
print(sentiment.positive)             # 72
print(sentiment.negative)             # 15
print(sentiment.neutral)              # 13
print(sentiment.sources)              # 2341
print(sentiment.news_sentiment)       # NewsSourceSentiment object
print(sentiment.social_sentiment)     # SocialSentiment object
```

### Trading Signals

#### get_signals(symbol: str) -> Signals

Get actionable trading signals.

```python
signals = client.get_signals("TSLA")

print(signals.overall_signal)      # "BUY" | "SELL" | "HOLD"
print(signals.confidence)          # 0.82
print(signals.buy_signals)         # List of Signal objects
print(signals.sell_signals)        # List of Signal objects

# Access individual signals
for signal in signals.buy_signals:
    print(f"{signal.name}: {signal.strength}")
```

### Correlations

#### get_correlation(symbols: List[str]) -> Correlation

Get correlation matrix between assets.

```python
corr = client.get_correlation(["BTC", "ETH", "AAPL"])

print(corr.symbols)                # ["BTC", "ETH", "AAPL"]
print(corr.matrix)                 # 2D list of correlation values
```

### Market Data

#### get_macro_indicators() -> MacroIndicators

Get macroeconomic indicators.

```python
macro = client.get_macro_indicators()

print(macro.inflation_rate)        # 3.2
print(macro.unemployment_rate)     # 3.8
print(macro.gdp_growth)            # 2.5
print(macro.interest_rate)         # 5.33
print(macro.vix)                   # 18.5
print(macro.dxy)                   # 104.2
```

#### get_fear_greed_index() -> FearGreedIndex

Get crypto fear and greed index.

```python
fg = client.get_fear_greed_index()

print(fg.value)                    # 62
print(fg.status)                   # "greed" | "neutral" | "fear"
print(fg.previous_value)           # 58
```

### Leaderboard

#### get_leaderboard(period: str = "monthly", limit: int = 10) -> Leaderboard

Get trader leaderboard.

```python
leaderboard = client.get_leaderboard(period="monthly", limit=5)

for trader in leaderboard.traders:
    print(f"{trader.rank}. {trader.username}")
    print(f"   Accuracy: {trader.accuracy}%")
    print(f"   Win Rate: {trader.win_rate}")
    print(f"   Total Trades: {trader.total_trades}")
```

Period options:
- `"daily"` - Last 24 hours
- `"weekly"` - Last 7 days
- `"monthly"` - Last 30 days
- `"yearly"` - Last 365 days
- `"all_time"` - All time

### Status

#### get_status() -> Status

Check API status and rate limits.

```python
status = client.get_status()

print(status.api_status)           # "healthy"
print(status.rate_limit)           # 100
print(status.remaining)            # 85
print(status.reset_at)             # datetime object
```

## Advanced Usage

### Batch Requests

```python
symbols = ["BTC", "ETH", "AAPL", "TSLA", "MSFT"]

# Get predictions for multiple symbols
predictions = []
for symbol in symbols:
    try:
        pred = client.get_prediction(symbol)
        predictions.append(pred)
    except Exception as e:
        print(f"Error getting prediction for {symbol}: {e}")

# Filter by confidence
high_confidence = [p for p in predictions if p.confidence > 80]
```

### Error Handling

```python
from assetpulse import (
    APIClient,
    APIError,
    RateLimitError,
    NotFoundError,
    AuthenticationError
)

client = APIClient(api_key, api_secret)

try:
    prediction = client.get_prediction("INVALID")
except NotFoundError:
    print("Symbol not found")
except RateLimitError:
    print("Rate limit exceeded")
except AuthenticationError:
    print("Invalid API credentials")
except APIError as e:
    print(f"API error: {e}")
```

### Retry Logic

```python
import time
from assetpulse import APIClient

client = APIClient(api_key, api_secret)

def get_prediction_with_retry(symbol, max_retries=3):
    for attempt in range(max_retries):
        try:
            return client.get_prediction(symbol)
        except Exception as e:
            if attempt < max_retries - 1:
                wait_time = (2 ** attempt) + random.uniform(0, 1)
                time.sleep(wait_time)
            else:
                raise

prediction = get_prediction_with_retry("BTC")
```

### Webhook Management

```python
# Configure webhook
client.configure_webhook(
    key_id=1,
    webhook_url="https://example.com/webhook",
    webhook_secret="your_secret"
)

# Send webhook manually
client.send_webhook_alert({
    "symbol": "BTC",
    "signal": "BUY",
    "confidence": 85
})
```

## Real-World Examples

### Example 1: Automated Trading Bot

```python
from assetpulse import APIClient
import time

class TradingBot:
    def __init__(self, api_key, api_secret):
        self.client = APIClient(api_key, api_secret)
        self.positions = {}
    
    def run(self):
        while True:
            try:
                self.check_signals()
                time.sleep(300)  # Check every 5 minutes
            except Exception as e:
                print(f"Error in trading bot: {e}")
                time.sleep(60)
    
    def check_signals(self):
        top_predictions = self.client.get_top_predictions(limit=10)
        
        for pred in top_predictions:
            if pred.confidence < 75:
                continue
            
            if pred.direction == "up" and pred.symbol not in self.positions:
                self.open_long(pred)
            elif pred.direction == "down" and pred.symbol in self.positions:
                self.close_position(pred.symbol)
    
    def open_long(self, prediction):
        print(f"Opening long position: {prediction.symbol}")
        self.positions[prediction.symbol] = {
            "entry_price": prediction.price,
            "target": prediction.target_price,
            "stop_loss": prediction.price * 0.95
        }
    
    def close_position(self, symbol):
        print(f"Closing position: {symbol}")
        del self.positions[symbol]

# Run bot
bot = TradingBot("ak_xxx", "secret_xxx")
bot.run()
```

### Example 2: Sentiment Dashboard

```python
from assetpulse import APIClient
import json

class SentimentDashboard:
    def __init__(self, api_key, api_secret):
        self.client = APIClient(api_key, api_secret)
        self.symbols = ["AAPL", "TSLA", "AMZN", "MSFT", "BTC"]
    
    def get_sentiment_report(self):
        report = {}
        
        for symbol in self.symbols:
            sentiment = self.client.get_sentiment(symbol)
            report[symbol] = {
                "overall_score": sentiment.overall_score,
                "positive": sentiment.positive,
                "negative": sentiment.negative,
                "neutral": sentiment.neutral,
                "sources": sentiment.sources,
                "trend": self.determine_trend(sentiment.overall_score)
            }
        
        return report
    
    def determine_trend(self, score):
        if score > 0.7:
            return "strongly_positive"
        elif score > 0.5:
            return "positive"
        elif score > 0.3:
            return "neutral"
        else:
            return "negative"
    
    def print_report(self):
        report = self.get_sentiment_report()
        print(json.dumps(report, indent=2))

# Generate report
dashboard = SentimentDashboard("ak_xxx", "secret_xxx")
dashboard.print_report()
```

### Example 3: Discord Bot

```python
import discord
from discord.ext import commands, tasks
from assetpulse import APIClient

class PredictionBot(commands.Cog):
    def __init__(self, bot, api_client):
        self.bot = bot
        self.client = api_client
        self.post_daily_predictions.start()
    
    @tasks.loop(hours=24)
    async def post_daily_predictions(self):
        channel = self.bot.get_channel(CHANNEL_ID)
        top = self.client.get_top_predictions(limit=10)
        
        embed = discord.Embed(
            title="Top 10 Daily Predictions",
            color=discord.Color.gold()
        )
        
        for i, pred in enumerate(top, 1):
            emoji = "📈" if pred.direction == "up" else "📉"
            embed.add_field(
                name=f"{i}. {pred.symbol}",
                value=f"{emoji} {pred.direction.upper()} ({pred.confidence}%)\nTarget: ${pred.target_price}",
                inline=False
            )
        
        await channel.send(embed=embed)
    
    @commands.command(name="signal")
    async def get_signal(self, ctx, symbol: str):
        try:
            signals = self.client.get_signals(symbol)
            embed = discord.Embed(
                title=f"{symbol} Trading Signals",
                color=discord.Color.blue()
            )
            embed.add_field(
                name="Overall Signal",
                value=f"{signals.overall_signal} ({signals.confidence*100:.0f}% confidence)",
                inline=False
            )
            
            if signals.buy_signals:
                buys = "\n".join([f"• {s.name}" for s in signals.buy_signals])
                embed.add_field(name="Buy Signals", value=buys, inline=False)
            
            if signals.sell_signals:
                sells = "\n".join([f"• {s.name}" for s in signals.sell_signals])
                embed.add_field(name="Sell Signals", value=sells, inline=False)
            
            await ctx.send(embed=embed)
        except Exception as e:
            await ctx.send(f"Error: {e}")

# Setup bot
intents = discord.Intents.default()
bot = commands.Bot(intents=intents)
api_client = APIClient("ak_xxx", "secret_xxx")

bot.add_cog(PredictionBot(bot, api_client))
bot.run("DISCORD_TOKEN")
```

## Troubleshooting

### Common Issues

#### "Invalid API credentials"
- Verify API key and secret are correct
- Check they're not expired or revoked
- Ensure no extra whitespace in credentials

#### "Rate limit exceeded"
- Implement exponential backoff
- Check current usage in dashboard
- Consider upgrading tier

#### "Connection timeout"
- Check internet connection
- Increase timeout parameter
- Try again later if service is down

### Getting Help

- **Documentation:** https://assetpulse.ai/docs
- **GitHub Issues:** https://github.com/assetpulse/python-sdk/issues
- **Email:** support@assetpulse.ai
- **Discord:** https://discord.gg/assetpulse

## License

MIT License - see LICENSE file for details

## Contributing

Contributions welcome! Please see CONTRIBUTING.md for guidelines.
