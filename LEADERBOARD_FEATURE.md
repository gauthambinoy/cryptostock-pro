# Community Leaderboard Feature Documentation

## Overview

The Community Leaderboard feature enables users to compete on prediction accuracy, track their performance against other traders, and discover top performers to learn from. It includes ranking systems, badges, and social features.

## Components Implemented

### 1. Backend Models (`backend/app/models.py`)

#### UserStats Model
- **Fields:**
  - `user_id`: Foreign key to User
  - `accuracy_percentage`: Float (0-100)
  - `total_predictions`: Integer
  - `correct_predictions`: Integer
  - `best_trade_return`: Float
  - `total_trades`: Integer
  - `win_rate`: Float (0-100)
  - `rank_monthly`, `rank_yearly`, `rank_all_time`: Integer rankings
  - `updated_at`, `created_at`: Timestamps
- **Purpose:** Stores aggregated statistics for user leaderboard ranking

#### Badge Model
- **Fields:**
  - `name`: Unique badge name
  - `description`: Badge description
  - `criteria`: JSON string describing how to earn badge
  - `icon_url`: URL to badge icon
  - `rarity`: common, uncommon, rare, epic, legendary
  - `created_at`: Timestamp
- **Purpose:** Defines available badges in the system

#### UserBadge Model
- **Fields:**
  - `user_id`, `badge_id`: Foreign keys
  - `earned_at`: Timestamp
- **Purpose:** Tracks which badges each user has earned

#### UserFollow Model
- **Fields:**
  - `follower_id`, `following_id`: Foreign keys to User
  - `created_at`: Timestamp
- **Purpose:** Manages social following relationships

### 2. Leaderboard Service (`backend/app/services/leaderboard_service.py`)

#### LeaderboardService Class

**Methods:**

- `calculate_user_accuracy(user_id, days=30) -> float`
  - Calculates prediction accuracy over specified days
  - Returns percentage (0-100)

- `get_leaderboard(period='monthly', limit=100, offset=0) -> List[Dict]`
  - Returns ranked list of users
  - Supports monthly, yearly, all_time periods
  - Includes pagination

- `get_user_rank(user_id, period='monthly') -> Optional[Dict]`
  - Gets specific user's rank and stats for a period

- `award_badges(user_id) -> List[str]`
  - Checks user stats and awards applicable badges
  - Returns list of newly earned badge names

- `update_monthly_ranks()`, `update_yearly_ranks()`, `update_all_time_ranks()`
  - Updates rankings based on accuracy

- `get_user_badges(user_id) -> List[Dict]`
  - Returns all badges earned by user

- `get_user_followers_count(user_id) -> int`
  - Returns follower count

- `is_user_following(follower_id, following_id) -> bool`
  - Checks following relationship

- `follow_user(follower_id, following_id) -> bool`
  - Creates following relationship

- `unfollow_user(follower_id, following_id) -> bool`
  - Removes following relationship

- `create_user_stats(user_id) -> UserStats`
  - Initializes stats for new user

- `initialize_default_badges()`
  - Creates default badge definitions

### 3. Scheduled Tasks (`backend/app/tasks/leaderboard_update.py`)

**APScheduler Jobs:**

1. **update_user_accuracy()** - Daily at 1 AM UTC
   - Recalculates accuracy for all users

2. **update_monthly_ranks()** - Daily at midnight UTC
   - Updates monthly leaderboard positions

3. **update_yearly_ranks()** - Daily at 12:05 AM UTC
   - Updates yearly leaderboard positions

4. **award_badges_to_all_users()** - Daily at 2 AM UTC
   - Checks and awards badges based on criteria

5. **reset_monthly_stats()** - 1st of each month at 3 AM UTC
   - Resets monthly rankings

**Badge Criteria:**

- **Top 1% Accuracy**: 90%+ prediction accuracy
- **Top 10% Accuracy**: Ranked in top 10% of traders
- **90% Accuracy Achieved**: 90%+ sustained accuracy
- **Winning Streak**: 75%+ win rate
- **Prolific Trader**: 100+ completed trades

### 4. API Endpoints (`backend/app/routers/leaderboard.py`)

#### GET /api/leaderboard/
- **Params:** `period` (monthly|yearly|all_time), `limit`, `offset`
- **Returns:** Leaderboard rankings with stats
- **Auth:** Required

#### GET /api/leaderboard/my-rank
- **Params:** `period` (monthly|yearly|all_time)
- **Returns:** Current user's rank and statistics
- **Auth:** Required

#### GET /api/leaderboard/{user_id}
- **Returns:** User profile with stats and badges
- **Auth:** Required

#### GET /api/leaderboard/{user_id}/followers
- **Params:** `limit`, `offset`
- **Returns:** List of users following this user
- **Auth:** Required

#### POST /api/leaderboard/{user_id}/follow
- **Returns:** Success confirmation
- **Auth:** Required

#### DELETE /api/leaderboard/{user_id}/follow
- **Returns:** Success confirmation
- **Auth:** Required

#### POST /api/leaderboard/{user_id}/copy-alerts
- **Returns:** Number of alerts copied
- **Auth:** Required
- **Note:** User must be following target user first

### 5. Frontend Components

#### Leaderboard.jsx (`frontend/src/pages/Leaderboard.jsx`)

**Features:**

- Period filter (Monthly, Yearly, All Time)
- Search users by name
- Top 3 podium display with avatars
- Full ranked table showing:
  - Rank
  - Username
  - Accuracy %
  - Total Trades
  - Win Rate
  - View button for user profile
- Current user's stats highlighted
- Refresh button for live updates
- Responsive design

**State Management:**

- `leaderboard`: Array of ranked users
- `period`: Selected ranking period
- `searchQuery`: User search filter
- `myRank`: Current user's rank info
- `isLoading`: Loading state

#### UserProfile.jsx (`frontend/src/pages/UserProfile.jsx`)

**Features:**

- User avatar and basic info
- Follow/Unfollow button (if not own profile)
- Copy Alerts button (requires following)
- Detailed statistics cards:
  - Prediction accuracy %
  - Win rate %
  - Best trade return %
  - Total trades
  - Member since date
- Earned badges display
- Success/error messages
- Responsive layout

#### BadgeDisplay.jsx (`frontend/src/components/BadgeDisplay.jsx`)

**Features:**

- Rarity-based color coding:
  - Common: Gray
  - Uncommon: Green
  - Rare: Blue
  - Epic: Purple
  - Legendary: Gold
- Interactive hover tooltip showing:
  - Badge name
  - Description
  - Rarity level
  - Date earned
- Icons based on badge type
- Visual glow effect

### 6. Pydantic Schemas (`backend/app/schemas.py`)

Added schemas for API validation:

- `BadgeResponse`: Badge data
- `UserStatsResponse`: User statistics
- `LeaderboardEntryResponse`: Single leaderboard entry
- `UserRankResponse`: User's rank and stats
- `UserProfileResponse`: Complete user profile
- `LeaderboardResponse`: Leaderboard list wrapper

## Database Schema

```sql
-- user_stats table
CREATE TABLE user_stats (
  id INTEGER PRIMARY KEY,
  user_id INTEGER UNIQUE NOT NULL,
  accuracy_percentage FLOAT DEFAULT 0.0,
  total_predictions INTEGER DEFAULT 0,
  correct_predictions INTEGER DEFAULT 0,
  best_trade_return FLOAT DEFAULT 0.0,
  total_trades INTEGER DEFAULT 0,
  win_rate FLOAT DEFAULT 0.0,
  rank_monthly INTEGER,
  rank_yearly INTEGER,
  rank_all_time INTEGER,
  updated_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX (accuracy_percentage),
  INDEX (rank_monthly),
  INDEX (rank_yearly)
);

-- badges table
CREATE TABLE badges (
  id INTEGER PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  description VARCHAR(255),
  criteria VARCHAR(500) NOT NULL,
  icon_url VARCHAR(500),
  rarity VARCHAR(20) DEFAULT 'common',
  created_at TIMESTAMP DEFAULT NOW()
);

-- user_badges table
CREATE TABLE user_badges (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  badge_id INTEGER NOT NULL,
  earned_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (badge_id) REFERENCES badges(id) ON DELETE CASCADE,
  INDEX (user_id, badge_id)
);

-- user_follows table
CREATE TABLE user_follows (
  id INTEGER PRIMARY KEY,
  follower_id INTEGER NOT NULL,
  following_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX (follower_id, following_id)
);
```

## Integration Points

### Application Startup (`backend/app/main.py`)

- Scheduler is initialized during application startup
- Default badges are created if not present
- Scheduler runs in background during application lifecycle

### User Creation

Future integration: Create UserStats record when user registers

```python
user_stats = models.UserStats(user_id=user.id)
db.add(user_stats)
db.commit()
```

## Usage Examples

### Get Current User's Rank

```python
GET /api/leaderboard/my-rank?period=monthly
```

Response:
```json
{
  "user_id": 1,
  "username": "trader_jane",
  "rank": 5,
  "accuracy_percentage": 87.5,
  "total_predictions": 40,
  "correct_predictions": 35,
  "best_trade_return": 15.2,
  "total_trades": 25,
  "win_rate": 88.0
}
```

### View Leaderboard

```python
GET /api/leaderboard/?period=monthly&limit=10&offset=0
```

Response:
```json
{
  "period": "monthly",
  "data": [
    {
      "rank": 1,
      "user_id": 2,
      "username": "profit_maker",
      "accuracy_percentage": 95.5,
      "total_predictions": 100,
      "correct_predictions": 96,
      "best_trade_return": 28.5,
      "total_trades": 50,
      "win_rate": 92.0
    },
    ...
  ]
}
```

### Get User Profile

```python
GET /api/leaderboard/123
```

Response:
```json
{
  "user_id": 123,
  "username": "skilled_trader",
  "full_name": "John Doe",
  "created_at": "2025-01-15T10:30:00Z",
  "stats": {
    "accuracy_percentage": 85.0,
    "total_predictions": 60,
    "correct_predictions": 51,
    "best_trade_return": 22.5,
    "total_trades": 30,
    "win_rate": 85.0
  },
  "badges": [
    {
      "id": 1,
      "name": "90% Accuracy Achieved",
      "description": "Maintained 90%+ prediction accuracy",
      "icon_url": "https://...",
      "rarity": "epic",
      "earned_at": "2025-02-10T14:20:00Z"
    }
  ],
  "followers_count": 24,
  "is_following": false
}
```

### Copy User's Alerts

```python
POST /api/leaderboard/123/copy-alerts
```

Response:
```json
{
  "success": true,
  "copied_alerts": 5,
  "message": "Copied 5 alerts from user"
}
```

## Features Summary

### Ranking System
- Multi-period rankings (monthly, yearly, all-time)
- Based on prediction accuracy percentage
- Automatically updated daily via APScheduler

### Badge System
- 5 predefined badges with rarity levels
- Automatic award when criteria met
- Visual display with rarity-based colors
- Tooltip with earning criteria

### Social Features
- Follow/unfollow other traders
- Copy alerts from followed users
- View follower count
- User profile pages

### Performance Optimizations
- Indexed queries on frequently searched columns
- Pagination support
- Background scheduled updates
- Minimal real-time calculations

## Future Enhancements

1. **Prediction Tracking**: Integrate with prediction system to automatically track accuracy
2. **Leaderboard Filters**: Filter by asset type, time period, etc.
3. **Notifications**: Notify users when they earn badges or change rank
4. **Leaderboard History**: Track historical rank changes
5. **Export Rankings**: Export leaderboard as CSV
6. **API Comparison**: Compare two users' stats side-by-side
7. **Streaming Updates**: WebSocket support for real-time rank updates
8. **Achievement Points**: Gamification with XP/points system

## Dependencies

- SQLAlchemy: ORM and database queries
- Pydantic: Request/response validation
- APScheduler: Background scheduled tasks
- FastAPI: API framework
- React: Frontend UI
- React Router: Frontend routing
- Lucide React: Icon library

## Testing Checklist

- [ ] UserStats model creates correctly for new users
- [ ] Badge criteria evaluation works correctly
- [ ] Leaderboard rankings update properly
- [ ] Rankings accessible via API endpoints
- [ ] User profile pages load correctly
- [ ] Follow/unfollow functionality works
- [ ] Copy alerts creates new alerts for user
- [ ] Badge display shows correct rarity colors
- [ ] Scheduler tasks run on schedule
- [ ] Frontend pagination works
- [ ] Search filter works on leaderboard
- [ ] Period filters update rankings correctly

## Troubleshooting

### Badges Not Awarding
- Ensure scheduler is running: Check application logs
- Verify badge criteria in LeaderboardService
- Check user stats are being calculated

### Leaderboard Empty
- Verify UserStats records exist for users
- Check that accuracy_percentage is > 0
- Ensure scheduler has run update_monthly_ranks

### Follow Feature Not Working
- Check UserFollow table has data
- Verify user IDs are correct
- Check auth token is valid

## File Structure

```
backend/
  app/
    models.py (updated)
    schemas.py (updated)
    main.py (updated)
    database.py
    services/
      leaderboard_service.py (new)
    routers/
      leaderboard.py (updated)
    tasks/
      leaderboard_update.py (new)
      __init__.py (updated)

frontend/
  src/
    pages/
      Leaderboard.jsx (updated)
      UserProfile.jsx (new)
    components/
      BadgeDisplay.jsx (new)
    App.jsx (updated)
```
