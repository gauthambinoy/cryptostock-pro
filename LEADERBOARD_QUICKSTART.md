# Community Leaderboard - Quick Start Guide

## What's New

AssetPulse now includes a **Community Leaderboard** feature that lets traders:
- 🏆 Compete on prediction accuracy
- 🎯 Earn achievement badges
- 👥 Follow top traders
- 📊 Copy alerts from successful traders

## Key Features

### Leaderboard Rankings
- View top traders by accuracy
- Filter by period: Monthly, Yearly, All-Time
- Search for specific users
- See your current rank and stats

### Achievement Badges
- **Top 1% Accuracy** (Legendary) - 90%+ accuracy
- **Top 10% Accuracy** (Epic) - Ranked top 10%
- **90% Accuracy Achieved** (Epic) - Sustained 90%+ accuracy
- **Winning Streak** (Rare) - 75%+ win rate
- **Prolific Trader** (Rare) - 100+ trades

### Social Features
- Follow top traders
- View their profiles
- Copy their active alerts
- See follower count

## How to Use

### View the Leaderboard
1. Click **Leaderboard** in the main menu
2. Choose a ranking period (Monthly/Yearly/All-Time)
3. Search for users or browse the table
4. Click any user to view their profile

### View Your Rank
- Your rank is displayed prominently on the leaderboard
- See your accuracy %, trades, and win rate
- Track your position over time

### View User Profile
1. Click a user's name or "View" button
2. See their complete statistics
3. View earned badges
4. Follow to copy their alerts

### Copy a User's Alerts
1. Find a trader you want to follow
2. Click the "Follow" button
3. Click "Copy Alerts" to get their active alerts
4. New alerts will be added to your account

### Track Your Progress
- Check your rank daily
- Work toward earning badges
- Improve your accuracy to climb the rankings

## How It Works

### Automatic Updates
Every day at specific times (UTC):
- **1:00 AM** - Accuracy calculations updated
- **12:00 AM** - Monthly rankings recalculated
- **12:05 AM** - Yearly rankings recalculated
- **2:00 AM** - Badges awarded based on performance
- **3:00 AM (1st of month)** - Monthly stats reset

### Ranking System
Rankings are based on:
- **Prediction Accuracy %** - Number of correct predictions
- **Win Rate %** - Percentage of profitable trades
- **Total Trades** - Activity level
- **Best Trade Return %** - Peak performance

### Badge Awards
Badges are awarded automatically when:
- You achieve 90%+ accuracy
- You break into top 10% of traders
- You maintain 75%+ win rate
- You complete 100+ trades

## API Endpoints

### For Developers

**Get Leaderboard:**
```bash
GET /api/leaderboard/?period=monthly&limit=100
```

**Get Your Rank:**
```bash
GET /api/leaderboard/my-rank?period=monthly
```

**Get User Profile:**
```bash
GET /api/leaderboard/{user_id}
```

**Follow a User:**
```bash
POST /api/leaderboard/{user_id}/follow
```

**Copy User Alerts:**
```bash
POST /api/leaderboard/{user_id}/copy-alerts
```

See `LEADERBOARD_FEATURE.md` for full API documentation.

## FAQ

**Q: How is accuracy calculated?**
A: Accuracy = (Correct Predictions / Total Predictions) × 100

**Q: When do rankings update?**
A: Rankings update daily at midnight UTC. Wait for the next update to see changes.

**Q: Can I lose badges?**
A: No, badges are permanent achievements. Once earned, they stay.

**Q: Do I need to follow someone to view their profile?**
A: No, you can view any public profile. Following is only needed to copy their alerts.

**Q: What happens to monthly rankings?**
A: Monthly rankings reset on the 1st of each month, but yearly and all-time persist.

**Q: How often are badges checked?**
A: Badges are checked daily at 2 AM UTC after stats are updated.

**Q: Can I see historical leaderboard data?**
A: Currently shows current rankings only. Historical data coming in future updates.

## Tips for Success

1. **Focus on Accuracy** - The main ranking metric
2. **Be Consistent** - Daily activity helps maintain rankings
3. **Diversify** - Trade different assets to improve win rate
4. **Learn from Leaders** - Copy alerts from top traders
5. **Track Progress** - Monitor your rank daily for motivation

## Common Tasks

### Find a Trading Strategy
1. Go to Leaderboard
2. Look at top traders' stats
3. Follow high-accuracy traders
4. Copy their alerts
5. Study their trading patterns

### Beat the Current #1
1. View the top trader's profile
2. Note their accuracy and strategy
3. Aim to match or exceed their metrics
4. Work toward earning their badges
5. Earn recognition on the leaderboard

### Join the Top 10%
1. Track your accuracy daily
2. Work toward 90%+ accuracy
3. Complete 100+ trades for Prolific Trader badge
4. Maintain 75%+ win rate for Winning Streak badge
5. Reach top 10% for the epic badge

## Current Limitations

- Accuracy is calculated from available data only
- Leaderboard shows top 100 users by default
- Badge criteria are fixed (may become configurable)
- No real-time updates (updates daily)

## Future Features

- 📱 Mobile app for leaderboard
- 🔔 Notifications for rank changes
- 📈 Historical rank tracking
- 🎮 More badges and achievements
- 🌐 International leaderboards
- 💬 Trader chat and discussion

## Support

- Check `LEADERBOARD_FEATURE.md` for detailed documentation
- Read `IMPLEMENTATION_REPORT.md` for technical details
- Review source code in:
  - `backend/app/services/leaderboard_service.py`
  - `frontend/src/pages/Leaderboard.jsx`
  - `frontend/src/pages/UserProfile.jsx`

## Getting Started Now

1. **View the Leaderboard**: Navigate to the Leaderboard page
2. **Find Your Rank**: Check where you stand
3. **Follow a Trader**: Pick a top performer to follow
4. **Copy Their Alerts**: Learn from their strategies
5. **Climb the Rankings**: Work toward badges and recognition

---

**Status**: Ready to use! 🚀  
**Last Updated**: April 2, 2026  
**Version**: 1.0.0
