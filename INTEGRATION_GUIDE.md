# AssetPulse Developer API - Integration Guide

> Complete guide to integrating AssetPulse predictions into your applications

## Table of Contents

1. [Getting Started](#getting-started)
2. [Use Cases](#use-cases)
3. [API Integration Examples](#api-integration-examples)
4. [Best Practices](#best-practices)
5. [Monitoring & Debugging](#monitoring--debugging)

## Getting Started

### Step 1: Create Developer Account

1. Sign up at https://assetpulse.ai
2. Complete email verification
3. Go to Dashboard → Developer
4. Click "Create New API Key"

### Step 2: Generate API Credentials

```
Name: Production API Key
Tier: Pro ($9.99/month)
Rate Limit: 100 calls/minute
```

Save the API key and secret immediately - you won't see the secret again!

### Step 3: Configure Your Environment

```bash
# .env file
ASSETPULSE_API_KEY=ak_your_api_key_here
ASSETPULSE_API_SECRET=your_secret_here
ASSETPULSE_BASE_URL=https://assetpulse.ai
```

### Step 4: Verify Connection

```python
from assetpulse import APIClient

client = APIClient()
status = client.get_status()
print(f"API Status: {status.api_status}")
print(f"Rate Limit: {status.rate_limit} calls/minute")
```

## Use Cases

### 1. Robo-Advisor / Automated Trading

**Scenario:** Build a trading bot that automatically executes trades based on AssetPulse predictions.

**Implementation:**

```python
from assetpulse import APIClient
from broker_api import BrokerClient  # Your broker API
import time

class AutoTrader:
    def __init__(self):
        self.asset_client = APIClient()
        self.broker = BrokerClient()
        self.positions = {}
    
    def monitor_and_trade(self):
        while True:
            try:
                # Get top predictions
                predictions = self.asset_client.get_top_predictions(limit=20)
                
                for pred in predictions:
                    # Filter by confidence threshold
                    if pred.confidence < 80:
                        continue
                    
                    # Execute based on direction
                    if pred.direction == "up":
                        self.execute_buy(pred)
                    elif pred.direction == "down":
                        self.execute_sell(pred)
                
                # Check rate limit status
                status = self.asset_client.get_status()
                print(f"Calls remaining: {status.remaining}/{status.rate_limit}")
                
                time.sleep(300)  # Check every 5 minutes
                
            except Exception as e:
                print(f"Error: {e}")
                time.sleep(60)
    
    def execute_buy(self, prediction):
        if prediction.symbol not in self.positions:
            order = self.broker.place_order(
                symbol=prediction.symbol,
                side="BUY",
                quantity=self.calculate_position_size(prediction),
                stop_loss=prediction.price * 0.98,
                take_profit=prediction.target_price
            )
            self.positions[prediction.symbol] = order
    
    def execute_sell(self, prediction):
        if prediction.symbol in self.positions:
            order = self.positions[prediction.symbol]
            self.broker.close_position(order.id)
            del self.positions[prediction.symbol]
    
    def calculate_position_size(self, prediction):
        # Risk management
        account_size = self.broker.get_account_balance()
        risk_per_trade = account_size * 0.02  # 2% risk
        position_size = risk_per_trade / (prediction.price - prediction.price * 0.98)
        return min(position_size, 100)  # Max 100 units per trade

# Run trading bot
trader = AutoTrader()
trader.monitor_and_trade()
```

**Key Features:**
- Confidence filtering (only trade high-confidence signals)
- Position sizing based on account balance
- Stop loss and take profit automation
- Rate limit monitoring
- Error recovery

**Monetization Model:**
- Charge monthly subscription ($9.99-$99.99)
- Take commission on profits (5-10%)
- Premium features for enterprise clients

---

### 2. Discord Bot for Community

**Scenario:** Post daily top predictions to Discord channel for trading community.

**Implementation:**

```python
import discord
from discord.ext import commands, tasks
from assetpulse import APIClient

class TradingBot(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.api_client = APIClient()
        self.predictions_channel_id = 123456789  # Your channel ID
        self.daily_predictions.start()
    
    @tasks.loop(hours=24)
    async def daily_predictions(self):
        """Post top predictions every day at 9 AM UTC"""
        channel = self.bot.get_channel(self.predictions_channel_id)
        
        try:
            # Get top predictions
            predictions = self.api_client.get_top_predictions(limit=10)
            
            # Create embed
            embed = discord.Embed(
                title="📊 Daily Top Predictions",
                description=f"Top 10 predictions for today",
                color=discord.Color.gold()
            )
            
            for i, pred in enumerate(predictions, 1):
                emoji = "📈" if pred.direction == "up" else "📉"
                confidence_bar = self.create_confidence_bar(pred.confidence)
                
                embed.add_field(
                    name=f"{i}. {pred.symbol} {emoji}",
                    value=f"**{pred.direction.upper()}**\n"
                          f"Confidence: {confidence_bar} {pred.confidence}%\n"
                          f"Target: ${pred.target_price:,.2f}\n"
                          f"Current: ${pred.price:,.2f}",
                    inline=False
                )
            
            # Add footer with timestamp
            embed.set_footer(text="Data from AssetPulse | Updated daily at 9 AM UTC")
            
            await channel.send(embed=embed)
            
        except Exception as e:
            print(f"Error posting predictions: {e}")
    
    @commands.command(name="predict")
    async def predict_symbol(self, ctx, symbol: str):
        """Get prediction for any symbol"""
        try:
            # Validate symbol
            symbol = symbol.upper()
            
            # Get prediction
            pred = self.api_client.get_prediction(symbol)
            sentiment = self.api_client.get_sentiment(symbol)
            signals = self.api_client.get_signals(symbol)
            
            # Create embed
            embed = discord.Embed(
                title=f"{symbol} Analysis",
                color=discord.Color.blue()
            )
            
            # Prediction
            emoji = "📈" if pred.direction == "up" else "📉"
            embed.add_field(
                name="Prediction",
                value=f"{emoji} {pred.direction.upper()}\n"
                      f"Confidence: {pred.confidence}%\n"
                      f"Target: ${pred.target_price:,.2f}",
                inline=True
            )
            
            # Sentiment
            sentiment_emoji = "😊" if sentiment.overall_score > 0.6 else "😐" if sentiment.overall_score > 0.4 else "😞"
            embed.add_field(
                name="Sentiment",
                value=f"{sentiment_emoji} {sentiment.overall_score:.2f}\n"
                      f"Positive: {sentiment.positive}%\n"
                      f"Sources: {sentiment.sources}",
                inline=True
            )
            
            # Trading Signal
            signal_emoji = "🟢" if signals.overall_signal == "BUY" else "🔴" if signals.overall_signal == "SELL" else "🟡"
            embed.add_field(
                name="Trading Signal",
                value=f"{signal_emoji} {signals.overall_signal}\n"
                      f"Confidence: {signals.confidence*100:.0f}%",
                inline=True
            )
            
            embed.set_footer(text="Data from AssetPulse API")
            
            await ctx.send(embed=embed)
            
        except Exception as e:
            await ctx.send(f"❌ Error: {str(e)}")
    
    @commands.command(name="top")
    async def top_predictions(self, ctx, limit: int = 5):
        """Get top N predictions"""
        try:
            limit = min(limit, 20)  # Max 20
            predictions = self.api_client.get_top_predictions(limit=limit)
            
            embed = discord.Embed(
                title=f"🚀 Top {len(predictions)} Predictions",
                color=discord.Color.green()
            )
            
            for i, pred in enumerate(predictions, 1):
                embed.add_field(
                    name=f"{i}. {pred.symbol}",
                    value=f"{'📈' if pred.direction == 'up' else '📉'} {pred.direction.upper()} ({pred.confidence}%)",
                    inline=False
                )
            
            await ctx.send(embed=embed)
            
        except Exception as e:
            await ctx.send(f"❌ Error: {str(e)}")
    
    def create_confidence_bar(self, confidence):
        """Create visual confidence bar"""
        filled = int(confidence / 10)
        empty = 10 - filled
        return "█" * filled + "░" * empty

# Setup bot
intents = discord.Intents.default()
intents.message_content = True
bot = commands.Bot(intents=intents)

@bot.event
async def on_ready():
    await bot.add_cog(TradingBot(bot))
    print(f"Bot logged in as {bot.user}")

# Run bot
bot.run("YOUR_DISCORD_TOKEN")
```

**Key Features:**
- Daily automated predictions
- On-demand symbol analysis
- Sentiment visualization
- Trading signals
- Error handling

**Monetization:**
- Discord server premium tier ($5-10/month)
- Advanced features (alerts, webhooks)
- Custom dashboards for top donors

---

### 3. Slack Bot for Teams

**Scenario:** Send daily market summary and alerts to Slack.

**Implementation:**

```python
from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError
from assetpulse import APIClient
import schedule
import time

class SlackMarketBot:
    def __init__(self, slack_token, assetpulse_key, assetpulse_secret):
        self.slack = WebClient(token=slack_token)
        self.api = APIClient(assetpulse_key, assetpulse_secret)
        self.channel = "#trading-alerts"
    
    def start(self):
        """Schedule tasks"""
        schedule.every().day.at("09:00").do(self.send_daily_summary)
        schedule.every(15).minutes.do(self.check_high_confidence_alerts)
        
        while True:
            schedule.run_pending()
            time.sleep(60)
    
    def send_daily_summary(self):
        """Send daily market summary"""
        try:
            # Get data
            top_preds = self.api.get_top_predictions(limit=10)
            macro = self.api.get_macro_indicators()
            fg = self.api.get_fear_greed_index()
            
            # Build message
            blocks = [
                {
                    "type": "header",
                    "text": {
                        "type": "plain_text",
                        "text": "📊 Daily Market Summary"
                    }
                },
                {
                    "type": "section",
                    "fields": [
                        {
                            "type": "mrkdwn",
                            "text": f"*Inflation:* {macro.inflation_rate}%"
                        },
                        {
                            "type": "mrkdwn",
                            "text": f"*Unemployment:* {macro.unemployment_rate}%"
                        },
                        {
                            "type": "mrkdwn",
                            "text": f"*VIX:* {macro.vix}"
                        },
                        {
                            "type": "mrkdwn",
                            "text": f"*Fear/Greed:* {fg.status.upper()} ({fg.value})"
                        }
                    ]
                },
                {
                    "type": "divider"
                },
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "*Top Predictions:*"
                    }
                }
            ]
            
            # Add predictions
            for pred in top_preds[:5]:
                emoji = "📈" if pred.direction == "up" else "📉"
                blocks.append({
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f"{emoji} *{pred.symbol}* → {pred.direction.upper()}\n"
                               f"Confidence: {pred.confidence}% | Target: ${pred.target_price:,.0f}"
                    }
                })
            
            # Send message
            self.slack.chat_postMessage(
                channel=self.channel,
                blocks=blocks
            )
            
        except SlackApiError as e:
            print(f"Slack error: {e}")
        except Exception as e:
            print(f"Error: {e}")
    
    def check_high_confidence_alerts(self):
        """Check for high confidence predictions and alert"""
        try:
            preds = self.api.get_top_predictions(limit=20)
            
            for pred in preds:
                if pred.confidence > 85:  # Very high confidence
                    message = f"🚨 *HIGH CONFIDENCE ALERT*\n" \
                             f"{pred.symbol} → {pred.direction.upper()}\n" \
                             f"Confidence: {pred.confidence}%\n" \
                             f"Target: ${pred.target_price:,.0f}"
                    
                    self.slack.chat_postMessage(
                        channel=self.channel,
                        text=message
                    )
        
        except Exception as e:
            print(f"Error checking alerts: {e}")

# Run bot
bot = SlackMarketBot(
    slack_token="xoxb-xxx",
    assetpulse_key="ak_xxx",
    assetpulse_secret="secret_xxx"
)
bot.start()
```

---

### 4. Mobile App Integration

**Scenario:** Real-time predictions and alerts in mobile app.

**Implementation (React Native):**

```javascript
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator } from 'react-native';
import AssetPulse from 'assetpulse-js';

const PredictionsScreen = () => {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const client = new AssetPulse({
    apiKey: process.env.REACT_APP_API_KEY,
    apiSecret: process.env.REACT_APP_API_SECRET
  });

  useEffect(() => {
    // Initial load
    fetchPredictions();
    
    // Auto-refresh every minute
    const interval = setInterval(fetchPredictions, 60000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchPredictions = async () => {
    try {
      setLoading(true);
      const top = await client.getTopPredictions(10);
      setPredictions(top);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={{ justifyContent: 'center', alignItems: 'center', flex: 1 }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <FlatList
      data={predictions}
      keyExtractor={(item) => item.symbol}
      renderItem={({ item }) => (
        <PredictionCard prediction={item} />
      )}
      onRefresh={fetchPredictions}
      refreshing={loading}
    />
  );
};

const PredictionCard = ({ prediction }) => {
  const directionColor = prediction.direction === 'up' ? '#4caf50' : '#f44336';
  
  return (
    <View style={{ 
      padding: 16, 
      borderBottomWidth: 1, 
      borderBottomColor: '#e0e0e0' 
    }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold' }}>
        {prediction.symbol}
      </Text>
      <Text style={{ 
        color: directionColor, 
        fontSize: 16, 
        fontWeight: '600',
        marginTop: 8
      }}>
        {prediction.direction === 'up' ? '📈' : '📉'} 
        {prediction.direction.toUpperCase()}
      </Text>
      <Text style={{ color: '#666', marginTop: 4 }}>
        Confidence: {prediction.confidence}%
      </Text>
      <Text style={{ color: '#666' }}>
        Target: ${prediction.target_price.toLocaleString()}
      </Text>
    </View>
  );
};

export default PredictionsScreen;
```

---

## API Integration Examples

### Python - Complete Example

```python
#!/usr/bin/env python3
"""
Complete example of AssetPulse API integration
"""

from assetpulse import APIClient
from datetime import datetime
import json

def main():
    # Initialize client
    client = APIClient(
        api_key="ak_your_key",
        api_secret="your_secret"
    )
    
    print("=" * 60)
    print("AssetPulse API - Integration Example")
    print("=" * 60)
    
    # 1. Check API Status
    print("\n1. Checking API Status...")
    try:
        status = client.get_status()
        print(f"   Status: {status.api_status}")
        print(f"   Rate Limit: {status.remaining}/{status.rate_limit}")
    except Exception as e:
        print(f"   Error: {e}")
    
    # 2. Get Single Prediction
    print("\n2. Getting Single Prediction (BTC)...")
    try:
        prediction = client.get_prediction("BTC")
        print(f"   Symbol: {prediction.symbol}")
        print(f"   Price: ${prediction.price:,.2f}")
        print(f"   Direction: {prediction.direction.upper()}")
        print(f"   Confidence: {prediction.confidence}%")
        print(f"   Target: ${prediction.target_price:,.2f}")
    except Exception as e:
        print(f"   Error: {e}")
    
    # 3. Get Top Predictions
    print("\n3. Getting Top 5 Predictions...")
    try:
        top = client.get_top_predictions(limit=5)
        for i, pred in enumerate(top, 1):
            print(f"   {i}. {pred.symbol}: {pred.direction.upper()} ({pred.confidence}%)")
    except Exception as e:
        print(f"   Error: {e}")
    
    # 4. Get Sentiment Analysis
    print("\n4. Getting Sentiment (AAPL)...")
    try:
        sentiment = client.get_sentiment("AAPL")
        print(f"   Overall Score: {sentiment.overall_score:.2f}")
        print(f"   Positive: {sentiment.positive}%")
        print(f"   Negative: {sentiment.negative}%")
        print(f"   Sources: {sentiment.sources}")
    except Exception as e:
        print(f"   Error: {e}")
    
    # 5. Get Trading Signals
    print("\n5. Getting Trading Signals (TSLA)...")
    try:
        signals = client.get_signals("TSLA")
        print(f"   Overall Signal: {signals.overall_signal}")
        print(f"   Confidence: {signals.confidence*100:.0f}%")
        print(f"   Buy Signals: {len(signals.buy_signals)}")
        print(f"   Sell Signals: {len(signals.sell_signals)}")
    except Exception as e:
        print(f"   Error: {e}")
    
    # 6. Get Macro Indicators
    print("\n6. Getting Macro Indicators...")
    try:
        macro = client.get_macro_indicators()
        print(f"   Inflation: {macro.inflation_rate}%")
        print(f"   Unemployment: {macro.unemployment_rate}%")
        print(f"   VIX: {macro.vix}")
    except Exception as e:
        print(f"   Error: {e}")
    
    # 7. Get Leaderboard
    print("\n7. Getting Leaderboard (Top 5)...")
    try:
        leaderboard = client.get_leaderboard(period="monthly", limit=5)
        for i, trader in enumerate(leaderboard.traders, 1):
            print(f"   {i}. {trader.username}: {trader.accuracy}% accuracy")
    except Exception as e:
        print(f"   Error: {e}")
    
    print("\n" + "=" * 60)
    print("Example completed successfully!")
    print("=" * 60)

if __name__ == "__main__":
    main()
```

### JavaScript - Complete Example

```javascript
// Complete example of AssetPulse API integration
const AssetPulse = require('assetpulse-js');

async function main() {
  const client = new AssetPulse({
    apiKey: process.env.ASSETPULSE_API_KEY,
    apiSecret: process.env.ASSETPULSE_API_SECRET
  });

  console.log('='.repeat(60));
  console.log('AssetPulse API - JavaScript Integration Example');
  console.log('='.repeat(60));

  try {
    // 1. Check API Status
    console.log('\n1. Checking API Status...');
    const status = await client.getStatus();
    console.log(`   Status: ${status.api_status}`);
    console.log(`   Rate Limit: ${status.remaining}/${status.rate_limit}`);

    // 2. Get Single Prediction
    console.log('\n2. Getting Single Prediction (BTC)...');
    const prediction = await client.getPrediction('BTC');
    console.log(`   Symbol: ${prediction.symbol}`);
    console.log(`   Price: $${prediction.price.toLocaleString()}`);
    console.log(`   Direction: ${prediction.direction.toUpperCase()}`);
    console.log(`   Confidence: ${prediction.confidence}%`);

    // 3. Get Top Predictions
    console.log('\n3. Getting Top 5 Predictions...');
    const top = await client.getTopPredictions(5);
    top.forEach((pred, i) => {
      console.log(`   ${i + 1}. ${pred.symbol}: ${pred.direction.toUpperCase()} (${pred.confidence}%)`);
    });

    // 4. Get Sentiment
    console.log('\n4. Getting Sentiment (AAPL)...');
    const sentiment = await client.getSentiment('AAPL');
    console.log(`   Score: ${sentiment.overall_score.toFixed(2)}`);
    console.log(`   Positive: ${sentiment.positive}%`);

    // 5. Get Leaderboard
    console.log('\n5. Getting Leaderboard...');
    const leaderboard = await client.getLeaderboard('monthly', 5);
    leaderboard.traders.forEach((trader, i) => {
      console.log(`   ${i + 1}. ${trader.username}: ${trader.accuracy}%`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  }

  console.log('\n' + '='.repeat(60));
  console.log('Example completed!');
  console.log('='.repeat(60));
}

main();
```

---

## Best Practices

### 1. API Key Security

```python
import os
from dotenv import load_dotenv

# Load from environment
load_dotenv()

api_key = os.getenv('ASSETPULSE_API_KEY')
api_secret = os.getenv('ASSETPULSE_API_SECRET')

if not api_key or not api_secret:
    raise ValueError("API credentials not found in environment")

client = APIClient(api_key, api_secret)
```

### 2. Implementing Rate Limit Handling

```python
import time
import random

def call_api_with_backoff(api_call, max_retries=3):
    """Implement exponential backoff for rate limiting"""
    for attempt in range(max_retries):
        try:
            return api_call()
        except RateLimitError:
            if attempt < max_retries - 1:
                wait_time = (2 ** attempt) + random.uniform(0, 1)
                print(f"Rate limited. Waiting {wait_time:.1f}s...")
                time.sleep(wait_time)
            else:
                raise

# Usage
prediction = call_api_with_backoff(lambda: client.get_prediction("BTC"))
```

### 3. Caching to Reduce API Calls

```python
from functools import lru_cache
from datetime import datetime, timedelta

class CachedAPIClient:
    def __init__(self, api_client, cache_ttl=300):
        self.client = api_client
        self.cache_ttl = cache_ttl
        self.cache = {}
    
    def get_prediction(self, symbol):
        cache_key = f"prediction:{symbol}"
        
        if cache_key in self.cache:
            cached_at, value = self.cache[cache_key]
            if datetime.now() - cached_at < timedelta(seconds=self.cache_ttl):
                return value
        
        prediction = self.client.get_prediction(symbol)
        self.cache[cache_key] = (datetime.now(), prediction)
        return prediction

# Usage
cached_client = CachedAPIClient(client, cache_ttl=600)  # 10 minute cache
pred = cached_client.get_prediction("BTC")  # Cached for next 10 minutes
```

### 4. Error Handling and Logging

```python
import logging

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class RobustAPIClient:
    def __init__(self, client):
        self.client = client
    
    def get_prediction(self, symbol, fallback=None):
        try:
            logger.info(f"Fetching prediction for {symbol}")
            prediction = self.client.get_prediction(symbol)
            logger.info(f"Prediction fetched successfully for {symbol}")
            return prediction
        
        except NotFoundError:
            logger.warning(f"Symbol not found: {symbol}")
            return fallback
        
        except RateLimitError:
            logger.error("Rate limit exceeded")
            raise
        
        except Exception as e:
            logger.error(f"Unexpected error: {e}", exc_info=True)
            raise

# Usage
robust_client = RobustAPIClient(client)
try:
    pred = robust_client.get_prediction("INVALID")
except Exception as e:
    print(f"Failed to fetch prediction: {e}")
```

---

## Monitoring & Debugging

### Check Usage Dashboard

Visit: https://assetpulse.ai/developer/usage

Monitor:
- Total API calls
- Current month cost
- Rate limit status
- Last API key usage

### View API Logs

```python
# Get usage stats
usage = client.get_usage_stats()

print(f"Total Calls: {usage['total_calls']}")
print(f"Total Cost: ${usage['total_cost']:.2f}")

for key in usage['api_keys']:
    print(f"\n{key['name']}:")
    print(f"  Tier: {key['tier']}")
    print(f"  Rate Limit: {key['rate_limit']} calls/min")
    for month in key['monthly']:
        print(f"  {month['year']}-{month['month']:02d}: {month['calls']} calls (${month['cost']:.2f})")
```

### Enable Debug Logging

```python
import logging

# Enable debug mode
logging.basicConfig(level=logging.DEBUG)

# Now see detailed request/response info
client = APIClient(api_key, api_secret)
prediction = client.get_prediction("BTC")
```

---

## Support & Resources

- **Documentation:** https://assetpulse.ai/docs
- **API Reference:** https://assetpulse.ai/api-reference
- **GitHub Issues:** https://github.com/assetpulse/python-sdk/issues
- **Email Support:** support@assetpulse.ai
- **Discord Community:** https://discord.gg/assetpulse

---

## Next Steps

1. Choose your use case from the list above
2. Implement the integration in your application
3. Monitor usage and costs in dashboard
4. Scale your integration as needed
5. Consider upgrading tier if you hit rate limits

Happy integrating!
