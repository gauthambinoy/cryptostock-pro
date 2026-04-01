# AssetPulse - Phase 1: Quick Wins Implementation (1-2 weeks)

## 🎯 Phase 1 Deliverables

### 1. AI Chatbot (Claude API)
**Status:** Building now
**Files to create/modify:**
- `backend/app/routers/chat.py` — New chat endpoint
- `backend/app/services/chat_service.py` — Claude API integration
- `frontend/src/pages/ChatBot.jsx` — Chat UI
- `backend/requirements.txt` — Add anthropic library

**Features:**
- Ask "Should I buy BTC?" → Get analysis with sentiment + prediction
- Ask "What's my best opportunity?" → Get top pick from portfolio
- Ask "Why did this alert trigger?" → Get explanation
- Conversation history (last 10 messages)

**API Integration:**
```python
from anthropic import Anthropic

client = Anthropic()
conversation_history = []

async def chat_with_claude(user_message, symbol=None, portfolio=None):
    # Build context from aggregated data
    context = f"""
    You are AssetPulse AI assistant - a financial advisor.
    Current symbol: {symbol}
    Portfolio: {portfolio}
    Latest prediction: {get_latest_prediction(symbol)}
    Sentiment: {get_sentiment(symbol)}
    """
    
    conversation_history.append({
        "role": "user",
        "content": user_message
    })
    
    response = client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=500,
        system=context,
        messages=conversation_history
    )
    
    assistant_message = response.content[0].text
    conversation_history.append({
        "role": "assistant", 
        "content": assistant_message
    })
    
    return assistant_message
```

**Time estimate:** 4-5 hours
**Impact:** +50% engagement, unique UX

---

### 2. Email/SMS Alerts on Steroids
**Status:** Building now
**Files to create/modify:**
- `backend/app/services/email_service.py` — Send emails via Sendgrid/Mailgun
- `backend/app/services/sms_service.py` — Send SMS via Twilio
- `backend/app/routers/alerts.py` — Enhance alert system
- `backend/app/tasks/alert_scheduler.py` — Background jobs
- `frontend/src/pages/AlertSettings.jsx` — Alert configuration UI

**Features:**
- Daily digest email (top 5 opportunities)
- Price move alerts (>5% change)
- Sentiment spike alerts (bullish/bearish crossover)
- Macro event alerts (Fed announcement, earnings)
- Hourly alerts for large candles
- SMS option for critical alerts
- Email frequency: daily, weekly, never

**Email Template Example:**
```html
<h2>🎯 AssetPulse Daily Digest</h2>
<p>Your Top 5 Opportunities Today:</p>
<table>
  <tr>
    <td>🟢 BTC</td>
    <td>+8.5% prediction</td>
    <td>Bullish sentiment</td>
    <td><button>Trade Now</button></td>
  </tr>
</table>
```

**Time estimate:** 6-7 hours
**Impact:** +400% daily actives

---

### 3. Community Leaderboard
**Status:** Building now
**Files to create/modify:**
- `backend/app/models.py` — Add UserStats, UserRank models
- `backend/app/routers/community.py` — Leaderboard endpoints
- `backend/app/services/leaderboard_service.py` — Rankings logic
- `frontend/src/pages/Leaderboard.jsx` — Leaderboard UI
- `backend/app/tasks/leaderboard_update.py` — Daily ranking update

**Features:**
- Rank users by prediction accuracy (%)
- Monthly leaderboard (current month)
- Yearly leaderboard (all-time)
- Badges (Top 1%, Top 10%, 90%+ accuracy)
- "Copy this trader" button → auto-follow their alerts
- Weekly prizes (top 3 traders get featured)
- User profiles (win rate, best trades, strategy)

**Database Schema:**
```python
class UserStats(Base):
    __tablename__ = "user_stats"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("user.id"))
    accuracy_percentage = Column(Float)  # Last 30 days
    total_predictions = Column(Integer)
    correct_predictions = Column(Integer)
    best_trade_return = Column(Float)
    total_trades = Column(Integer)
    rank_monthly = Column(Integer)
    rank_yearly = Column(Integer)
    updated_at = Column(DateTime, default=datetime.utcnow)
```

**Time estimate:** 5-6 hours
**Impact:** +200% signups (social proof)

---

### 4. Backtesting Engine
**Status:** Building now
**Files to create/modify:**
- `backend/app/services/backtest_service.py` — Backtest logic
- `backend/app/routers/backtest.py` — API endpoints
- `frontend/src/pages/Backtester.jsx` — Backtest UI
- `backend/data/historical_prices.py` — Fetch 5-10 year history

**Features:**
- Test strategy against historical data (5, 10, 20 years)
- Simulate trades with real prices
- Calculate: total return, Sharpe ratio, max drawdown, win rate
- Compare your strategy vs S&P 500
- Monte Carlo simulations (randomize price paths)
- Parameter optimization (find best settings)

**Backtest Results:**
```json
{
  "total_return": "245%",
  "annual_return": "18.5%",
  "sharpe_ratio": 1.85,
  "max_drawdown": "-22%",
  "win_rate": "68%",
  "vs_sp500": "+156% (SP500 was +89%)"
}
```

**Time estimate:** 7-8 hours
**Impact:** Proves accuracy, builds trust

---

### 5. Dark Mode
**Status:** Building now
**Files to modify:**
- `frontend/src/App.jsx` — Add theme provider
- `frontend/src/utils/theme.js` — Dark/light theme colors
- `frontend/src/components/*.jsx` — Add dark mode classes
- `frontend/src/pages/*.jsx` — Apply dark mode styles

**Features:**
- Toggle dark/light mode
- System theme detection (auto-detect user preference)
- Persist preference (localStorage)
- All components dark-mode compatible
- Dark mode colors: dark blue, charcoal, white text

**Implementation:**
```javascript
// Add to theme.js
export const darkTheme = {
  bg: '#0f172a',
  surface: '#1e293b',
  text: '#f1f5f9',
  border: '#334155',
  primary: '#3b82f6',
  success: '#10b981',
  error: '#ef4444',
}

// App.jsx
const [isDarkMode, setIsDarkMode] = useState(
  localStorage.getItem('theme') === 'dark'
)

useEffect(() => {
  localStorage.setItem('theme', isDarkMode ? 'dark' : 'light')
}, [isDarkMode])
```

**Time estimate:** 3-4 hours
**Impact:** +30% engagement

---

## 📊 Phase 1 Timeline

| Feature | Time | Start | End | Status |
|---------|------|-------|-----|--------|
| Dark Mode | 3-4h | Day 1 | Day 1 | 🔄 |
| Email Alerts | 6-7h | Day 1 | Day 2 | 🔄 |
| Leaderboard | 5-6h | Day 2 | Day 3 | 🔄 |
| AI Chatbot | 4-5h | Day 3 | Day 4 | 🔄 |
| Backtesting | 7-8h | Day 4 | Day 5 | 🔄 |
| **Total** | **26-30h** | **Day 1** | **Day 5** | **In Progress** |

**Timeline: 1 week (5 business days)**

---

## 🚀 Deployment

After Phase 1 complete:
1. Push all code to GitHub
2. Test each feature locally
3. Deploy to AWS (Terraform update)
4. Announce features to users
5. Start Phase 2

---

## 💰 Expected Impact After Phase 1

- **DAU:** +400% (email alerts + leaderboard)
- **Engagement:** +50% (chatbot UX)
- **Signups:** +200% (leaderboard social proof)
- **Trust:** +90% (backtesting proof)
- **Retention:** +30% (dark mode + features)

---

## ✅ Phase 1 Success Criteria

- [ ] All 5 features working locally
- [ ] No console errors
- [ ] API responses <500ms
- [ ] Email sends correctly
- [ ] Leaderboard updates daily
- [ ] Backtests finish in <5 seconds
- [ ] Dark mode works on all pages
- [ ] All features tested on mobile

---

## 📋 Start Building Now

Ready to code. Beginning with:
1. ✅ Dark Mode (fastest, immediate win)
2. ✅ Email Alerts (highest impact)
3. ✅ Leaderboard (viral potential)
4. ✅ Chatbot (unique UX)
5. ✅ Backtesting (trust builder)

