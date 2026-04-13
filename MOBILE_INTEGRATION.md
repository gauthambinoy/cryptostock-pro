# AssetPulse Mobile App - Integration Guide

## Overview

This guide explains how the mobile app integrates with the existing AssetPulse backend and web application.

## Architecture

```
┌─────────────────────────────────────┐
│      iOS/Android Devices            │
│  ┌───────────────────────────────┐  │
│  │  AssetPulse Mobile App        │  │
│  │  (React Native + Expo)        │  │
│  └──────────────┬────────────────┘  │
└─────────────────┼──────────────────┘
                  │
                  │ HTTP/HTTPS
                  │ JWT Token Auth
                  ▼
┌─────────────────────────────────────┐
│    AssetPulse Backend API           │
│  (Node.js/Express)                  │
│  Port: 3000                         │
│  Base: /api                         │
└──────────────┬──────────────────────┘
                │
                ├─ Database (PostgreSQL)
                ├─ Redis Cache
                ├─ Firebase Cloud Messaging
                └─ AI Prediction Engine
```

## API Endpoints Used

### Authentication (`/api/auth`)
```
POST   /auth/login
POST   /auth/register
POST   /auth/logout
POST   /auth/refresh
GET    /auth/me
```

### Portfolio (`/api/portfolio`)
```
GET    /portfolio
GET    /portfolio/holdings
GET    /portfolio/holdings/:symbol
POST   /portfolio/holdings
PUT    /portfolio/holdings/:symbol
DELETE /portfolio/holdings/:symbol
GET    /portfolio/history
GET    /portfolio/allocation
POST   /portfolio/rebalance
```

### Predictions (`/api/predictions`)
```
GET    /predictions/top
GET    /predictions/:symbol
GET    /predictions/:symbol/history
GET    /predictions/stats
GET    /predictions/accuracy
GET    /predictions/portfolio
```

### Alerts (`/api/alerts`)
```
GET    /alerts
GET    /alerts/unread
POST   /alerts
PUT    /alerts/:id
DELETE /alerts/:id
PUT    /alerts/:id/toggle
PUT    /alerts/:id/read
POST   /alerts/mark-all-read
GET    /alerts/history
```

### Leaderboard (`/api/leaderboard`)
```
GET    /leaderboard/top
GET    /leaderboard/stats
GET    /leaderboard/trader/:userId
POST   /leaderboard/follow/:userId
POST   /leaderboard/unfollow/:userId
GET    /leaderboard/followed
GET    /leaderboard/trader/:userId/portfolio
GET    /leaderboard/trader/:userId/predictions
GET    /leaderboard/search
```

### Chat (`/api/chat`)
```
GET    /chat/conversations
GET    /chat/conversations/:id
POST   /chat/conversations
POST   /chat/conversations/:id/messages
DELETE /chat/conversations/:id
PUT    /chat/conversations/:id
POST   /chat/ai-response
```

### Notifications (`/api/notifications`)
```
POST   /notifications/register-token
GET    /notifications/settings
PUT    /notifications/settings
GET    /notifications/history
PUT    /notifications/:id/read
DELETE /notifications/:id
```

## Authentication Flow

### 1. Login/Registration
```
Mobile App
  │
  ├─→ POST /auth/login (email, password)
  │   Backend validates credentials
  │   Returns { token, user }
  │
  └─→ Store token in Secure Store (encrypted)
      Set Authorization header for future requests
```

### 2. Token Management
```
All Requests Include:
  Headers: {
    'Authorization': 'Bearer <JWT_TOKEN>',
    'Content-Type': 'application/json'
  }

Token Refresh:
  │
  ├─ If response 401 (Unauthorized)
  │  └─→ POST /auth/refresh
  │      Returns new token
  │      Update Secure Store
  │
  └─ Retry original request with new token
```

### 3. Biometric Authentication
```
Biometric Login Flow:
  │
  ├─ User selects "Biometric Login"
  │
  ├─ Authenticate with device (Face ID/Touch ID)
  │
  ├─ If successful, retrieve cached credentials
  │  └─→ Call POST /auth/login
  │      (Same as password login)
  │
  └─ Store token in Secure Store
```

## Data Synchronization

### Real-Time Updates

#### Push Notifications
```
Backend → Firebase Cloud Messaging (FCM)
        ↓
      Mobile Device
        ↓
Mobile App (Foreground/Background)
        ↓
  Show Alert/Update UI
```

**Notification Types**:
- Price alerts triggered
- Prediction updates
- News alerts
- Portfolio milestones
- Leaderboard changes

#### Polling (Fallback)
- Portfolio: Every 5 minutes
- Predictions: Every 30 minutes
- Leaderboard: Every 10 minutes
- Alerts: Every 5 minutes

### Offline Support

```
Normal Flow (Online):
  Mobile App → API Request → Backend → Response

Offline Flow:
  Mobile App → Check Cache
           ├─ Cache Valid? → Show Cached Data
           └─ Cache Invalid? → Show "Update Required"

Reconnect Flow:
  Network Detected → Sync Pending Changes
                  → Update Cache
                  → Refresh UI
```

**Cache Expiry Times**:
```typescript
- Portfolio: 5 minutes
- Predictions: 5 minutes
- Leaderboard: 10 minutes
- Alerts: 5 minutes
- General: 5 minutes
```

## Feature Parity with Web App

### Shared Features
```
✅ User Authentication (Email/Password)
✅ Portfolio Management
  ├─ View holdings
  ├─ Track performance
  └─ View allocation
✅ AI Predictions
  ├─ Top predictions
  ├─ Accuracy stats
  └─ Confidence scores
✅ Price Alerts
  ├─ Create alerts
  ├─ Manage alerts
  └─ Alert history
✅ Leaderboard
  ├─ Top traders
  ├─ Trader profiles
  └─ Follow traders
✅ AI Chatbot
  ├─ Conversations
  ├─ Message history
  └─ AI responses
```

### Mobile-Only Features
```
✅ Biometric Authentication (Face ID/Touch ID)
✅ Push Notifications
✅ Offline Data Caching
✅ Dark Mode
✅ Background Price Updates
✅ Native App Experience
```

### Web-Only Features
```
✅ Advanced Charting
✅ Trade Execution
✅ Backtesting
✅ Technical Analysis
✅ Portfolio Rebalancing UI
```

## Backend Requirements

### API Configuration

The mobile app expects:
- Base URL: `http://localhost:3000/api`
- Content-Type: `application/json`
- Auth: JWT Bearer token
- CORS: Enabled for Expo domains

### Required Endpoints

All endpoints documented in "API Endpoints Used" section must be implemented.

### Authentication

- JWT tokens with reasonable expiry (1 hour recommended)
- Refresh token endpoint for token renewal
- Secure password hashing (bcrypt)
- Rate limiting on auth endpoints

### Data Validation

- Email validation
- Password strength requirements
- Input sanitization
- HTTPS enforcement

### Error Responses

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

## Firebase Integration (Optional but Recommended)

### For Push Notifications

1. **Create Firebase Project**
   - Go to firebase.google.com
   - Create new project
   - Add Android and iOS apps

2. **Get Credentials**
   - Download `google-services.json` (Android)
   - Download `GoogleService-Info.plist` (iOS)

3. **Configure App**
   ```json
   // app.json
   {
     "plugins": [
       [
         "expo-notifications",
         {
           "icon": "./assets/notification-icon.png"
         }
       ]
     ]
   }
   ```

4. **Backend Integration**
   - Accept FCM tokens via `POST /notifications/register-token`
   - Send notifications via Firebase Admin SDK

## Testing the Integration

### 1. Start Backend
```bash
cd backend
npm install
npm start
# Should run on http://localhost:3000
```

### 2. Configure Mobile App
```bash
cd mobile
cp .env.example .env
# Edit .env with your API URL (adjust if backend on different port)
```

### 3. Start Mobile App
```bash
npm install
npm start
```

### 4. Test Login
- Create test account via `/auth/register`
- Or use existing backend test account
- Verify token is stored securely

### 5. Test Features
- **Portfolio**: Verify holdings load
- **Predictions**: Check predictions display
- **Alerts**: Create and manage alerts
- **Leaderboard**: View top traders
- **Chat**: Send messages
- **Notifications**: Set preferences

### 6. Test Offline
- Enable airplane mode
- Verify cached data displays
- Go back online
- Verify data syncs

## Deployment Considerations

### Environment-Specific Configuration

**Development**
```
API_URL=http://localhost:3000/api
LOG_LEVEL=debug
ENVIRONMENT=development
```

**Staging**
```
API_URL=https://staging-api.assetpulse.com/api
LOG_LEVEL=info
ENVIRONMENT=staging
```

**Production**
```
API_URL=https://api.assetpulse.com/api
LOG_LEVEL=warn
ENVIRONMENT=production
```

### Backend Requirements for Production

1. **HTTPS/TLS**: All API endpoints
2. **CORS**: Configure for app domains
3. **Rate Limiting**: Prevent abuse
4. **Database**: Backup and monitoring
5. **Logging**: Error tracking (Sentry)
6. **Monitoring**: API performance (New Relic)
7. **Security**: Regular audits

## Common Integration Issues & Solutions

### Issue: "Cannot connect to API"
**Solution**:
1. Check API URL in .env
2. Verify backend is running
3. Check firewall/network
4. Use tunnel mode: `npm start -- --tunnel`

### Issue: "401 Unauthorized"
**Solution**:
1. Verify token is stored
2. Check token expiry
3. Implement token refresh
4. Clear storage and re-login

### Issue: "CORS Error"
**Solution**:
1. Enable CORS in backend
2. Add Expo domain to whitelist
3. Use tunnel instead of LAN

### Issue: "Notifications not working"
**Solution**:
1. Verify FCM setup
2. Check permissions granted
3. Verify token registration
4. Test with local notification first

## Performance Optimization

### For Backend

1. **Optimize Queries**
   - Add database indexes
   - Use pagination for large lists
   - Implement caching

2. **Response Compression**
   - Enable gzip
   - Minify JSON responses
   - Return only needed fields

3. **Rate Limiting**
   - Limit requests per minute
   - Different limits for different endpoints
   - Clear cache on rapid changes

### For Mobile

1. **Caching**
   - Implement smart cache
   - Expire stale data
   - Sync on reconnect

2. **Network**
   - Batch API requests
   - Use pagination
   - Lazy load data

3. **Storage**
   - Clean cache periodically
   - Compress stored data
   - Monitor storage size

## Monitoring & Debugging

### Backend Logs
```
Monitor for:
- 5xx errors (500, 502, 503)
- High response times (>1s)
- Failed authentications
- Rate limit hits
- Database errors
```

### Mobile Logs
```
In development:
- console.log() messages
- Network requests (Dev menu)
- Error stack traces
- Cache hits/misses

In production:
- Sentry error tracking
- Crash reporting
- User session analytics
- API usage metrics
```

## Version Management

### API Versioning

```
/api/v1/       - Current version (mobile v1.0)
/api/v2/       - Future version
```

### Breaking Changes

If backend must change API:
1. Create new endpoint (`/api/v2/...`)
2. Keep old endpoint working
3. Notify mobile app users
4. Plan migration timeline

## Support & Maintenance

### Update Cycle

```
Weekly:    Backend bug fixes
Monthly:   Mobile app updates
Quarterly: Major feature releases
As-needed: Security patches
```

### Communication

When backend changes:
1. Update API documentation
2. Notify mobile team
3. Plan migration period
4. Test thoroughly

## Checklist for Integration

- [ ] Backend API running and accessible
- [ ] All required endpoints implemented
- [ ] JWT authentication working
- [ ] CORS configured correctly
- [ ] Mobile app .env configured
- [ ] Login/registration tested
- [ ] All features working
- [ ] Offline mode tested
- [ ] Push notifications (if using Firebase)
- [ ] Error handling working
- [ ] Performance acceptable
- [ ] Security reviewed
- [ ] Monitoring configured

## References

- Backend Documentation: `/backend/README.md`
- API Specification: `/backend/API.md`
- Mobile README: `/mobile/README.md`
- Deployment Guide: `/mobile/DEPLOYMENT.md`
