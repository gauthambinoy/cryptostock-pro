# AssetPulse Mobile App

Smart investment analytics and portfolio management on your mobile device.

## Features

- **Portfolio Management**: Track holdings, allocation, and performance
- **AI Predictions**: Get price predictions with confidence scores
- **Price Alerts**: Real-time notifications for price movements
- **Leaderboard**: Compare with top traders and follow strategies
- **AI Chatbot**: Conversational investment assistant
- **Push Notifications**: Firebase Cloud Messaging integration
- **Biometric Auth**: Face ID and Touch ID support
- **Dark Mode**: Full dark mode support
- **Offline Support**: Works with cached data when offline
- **Real-time Sync**: Automatic sync when online

## Tech Stack

- **Framework**: React Native (Expo)
- **Navigation**: React Navigation
- **UI**: React Native Paper
- **State Management**: React Context API
- **Storage**: AsyncStorage + Secure Store
- **Notifications**: Expo Notifications + Firebase
- **Auth**: JWT + Biometric (Local Authentication)
- **Charts**: react-native-svg-charts
- **HTTP**: Axios

## Installation

### Prerequisites
- Node.js 16+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS: Xcode (for development)
- Android: Android Studio (for development)

### Setup

1. **Clone and Install**
```bash
cd mobile
npm install
```

2. **Environment Configuration**
```bash
cp .env.example .env
# Edit .env with your API endpoint
```

3. **Run Development Server**
```bash
npm start
```

4. **Run on Device/Emulator**
```bash
# iOS
npm run ios

# Android
npm run android

# Web (preview only)
npm run web
```

## Project Structure

```
mobile/
├── src/
│   ├── screens/          # Screen components
│   ├── components/       # Reusable components
│   ├── services/         # API and business logic
│   ├── context/          # React Context providers
│   ├── navigation/       # Navigation configuration
│   └── utils/            # Utility functions
├── App.tsx               # Root component
├── app.json              # Expo configuration
├── package.json          # Dependencies
└── tsconfig.json         # TypeScript config
```

## Screens

### Authentication
- **LoginScreen**: Email/password login with biometric option
- **RegisterScreen**: New account creation

### Main App
- **DashboardScreen**: Overview of portfolio and key metrics
- **PortfolioScreen**: Holdings, allocation, and performance
- **PredictionsScreen**: Top predictions with accuracy
- **ChatScreen**: AI investment assistant
- **AlertsScreen**: Create and manage price alerts
- **LeaderboardScreen**: Top traders and rankings
- **SettingsScreen**: Profile, notifications, theme
- **HoldingDetailsScreen**: Detailed view of single asset
- **TraderDetailsScreen**: Trader profile and stats

## Services

### AuthService
- Login/Register
- Biometric authentication
- Token management
- Current user info

### PortfolioService
- Get portfolio overview
- Fetch holdings
- Add/update/delete holdings
- Get portfolio history and allocation

### PredictionService
- Get top predictions
- Fetch prediction stats
- Get accuracy metrics
- Portfolio predictions

### AlertService
- Create price alerts
- Manage alert settings
- Mark as read/triggered
- Alert history

### LeaderboardService
- Get top traders
- Follow/unfollow traders
- Trader details and stats
- Search traders

### ChatService
- Manage conversations
- Send messages
- Get AI responses

### NotificationService
- Register for push notifications
- Manage notification settings
- Store notification history
- Setup listeners

### CacheService
- Cache portfolio data
- Cache predictions
- Cache leaderboard
- Manage cache expiry

## API Integration

The app connects to the AssetPulse backend API. Configure the API endpoint in `.env`:

```
EXPO_PUBLIC_API_URL=http://localhost:3000/api
```

### Authentication
All API requests include JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

## Features in Detail

### Offline Support
- Cached data is automatically served when offline
- Cache expires after 5 minutes for portfolios
- 10 minutes for leaderboard
- Automatic sync when connection restored

### Push Notifications
- FCM token registration on startup
- Notification preferences in settings
- Local notifications for development
- Background price updates every 5 minutes

### Biometric Authentication
- Face ID (iOS)
- Touch ID (iOS)
- Biometric auth (Android)
- Cached credentials for quick access

### Dark Mode
- System-wide dark mode toggle
- Persistent across sessions
- All screens support both themes
- Custom theme colors

## Building for Production

### iOS Build

```bash
# Build for App Store
eas build --platform ios --auto-submit

# Or manual build
eas build --platform ios
```

**Requirements**:
- Apple Developer Account
- Code signing certificates
- Provisioning profiles

### Android Build

```bash
# Build for Google Play
eas build --platform android --auto-submit

# Or manual build
eas build --platform android
```

**Requirements**:
- Google Play Developer Account
- Keystore file
- App signing key

## Firebase Setup

1. Create Firebase project in Firebase Console
2. Add Android app:
   - Download google-services.json
   - Place in android/ directory
3. Add iOS app:
   - Download GoogleService-Info.plist
   - Add in Xcode

## Testing

```bash
# Run unit tests
npm test

# Run with coverage
npm run test:coverage

# Lint code
npm run lint

# Format code
npm run format
```

## Troubleshooting

### Build Issues
```bash
# Clear cache
expo prebuild --clean

# Reinstall dependencies
rm -rf node_modules && npm install

# Clear Expo cache
expo logout
expo start --clear
```

### Device Connection
```bash
# Tunnel mode (works with VPN)
expo start --tunnel

# LAN mode (must be on same network)
expo start --lan

# Local mode (USB only)
expo start --localhost
```

### Notification Issues
- Ensure FCM token is registered
- Check notification settings in app
- Verify backend notification endpoints
- Check notification permissions on device

## Performance Optimization

- Lazy load screens with React.lazy()
- Memoize components with useMemo/useCallback
- Optimize list rendering with FlatList
- Cache API responses
- Use Hermes engine (Android)
- Code split with dynamic imports

## Security

- JWT tokens stored in Secure Store
- Biometric authentication for sensitive ops
- HTTPS only API communication
- No sensitive data logged
- Credentials not stored in AsyncStorage
- SSL/TLS certificate pinning (optional)

## Contributing

1. Follow TypeScript strict mode
2. Use functional components
3. Add proper error handling
4. Write descriptive commit messages
5. Test before pushing

## License

Proprietary - AssetPulse Platform

## Support

For issues and support:
- GitHub Issues: [Link]
- Email: support@assetpulse.com
- Documentation: [Link]
