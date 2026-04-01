# AssetPulse Mobile App - Quick Start Guide

Get up and running in 5 minutes!

## 1. Install Dependencies (1 min)

```bash
cd mobile
npm install
```

## 2. Configure Environment (1 min)

```bash
cp .env.example .env
```

Edit `.env`:
```
EXPO_PUBLIC_API_URL=http://localhost:3000/api
EXPO_PUBLIC_ENVIRONMENT=development
```

## 3. Start Development Server (1 min)

```bash
npm start
```

You'll see:
```
> Local:   exp://localhost:19000
> LAN:     exp://192.168.x.x:19000
> Tunnel:  exp://xxxxxxx.ngrok.io
```

## 4. Run on Device/Emulator (2 min)

### iOS (on Mac)
```bash
npm run ios
```

Requires Xcode and iOS simulator.

### Android
```bash
npm run android
```

Requires Android emulator or device.

### Web Preview (no device needed)
```bash
npm run web
```

Opens in browser at http://localhost:19006

## Useful Commands

```bash
# Clear cache and restart
npm start -- --clear

# Reload app (press 'r' in terminal)
r

# Open developer menu (press 'd' in terminal)
d

# Exit (Ctrl+C)
```

## Login Test Account

Create account with test credentials:
- Email: test@example.com
- Password: TestPassword123

Or ask backend for test account.

## Project Structure

```
mobile/
├── src/
│   ├── screens/        ← 11 app screens
│   ├── components/     ← Reusable components
│   ├── services/       ← API calls
│   ├── context/        ← State management
│   └── navigation/     ← Navigation setup
├── App.tsx             ← Root component
└── app.json            ← Expo config
```

## Key Features

- **Authentication**: Email login + biometric (Face ID/Touch ID)
- **Portfolio**: View holdings, allocation, P&L
- **Predictions**: AI price predictions with confidence
- **Alerts**: Create custom price alerts
- **Leaderboard**: See top traders and rankings
- **Chat**: AI investment assistant
- **Dark Mode**: Full dark mode support
- **Offline**: Works with cached data

## Making Changes

All live changes auto-reload:

1. Edit component/screen file
2. Save file (Ctrl+S)
3. App reloads automatically
4. Test in simulator/device

## Common Tasks

### Add New Screen

1. Create file: `src/screens/NewScreen.tsx`
2. Import in `RootNavigator.tsx`
3. Add to navigation stack
4. Create navigation link

### Add API Call

1. Create method in `src/services/MyService.ts`
2. Use in component: `import { myService } from '../services/MyService'`
3. Call: `const data = await myService.getData()`

### Change Styling

Edit theme in `src/utils/themes.ts`:
```typescript
colors: {
  primary: '#6200ee',  ← Change primary color
  secondary: '#03dac6',
  // ...
}
```

## API Configuration

All API calls go through `AuthService`:

```typescript
// In services
const apiClient = authService.getApiClient();

// Makes request with Authorization header
const response = await apiClient.get('/endpoint');
```

Add auth token automatically on login.

## Testing Features

### Test Offline Mode
1. Open Network tab (Dev tools)
2. Set to "Offline"
3. App uses cached data
4. Go back online
5. Auto-syncs

### Test Biometric
1. iOS: Use "Simulate Biometric"
2. Android: Emulator settings
3. Biometric login screen appears if enrolled

### Test Dark Mode
- Settings screen → toggle "Dark Mode"
- Persists across app restarts

## Troubleshooting

### "Cannot find module"
```bash
npm install
npm start --clear
```

### App won't start
```bash
rm -rf node_modules
npm install
npm start --clear
```

### Emulator won't connect
- Check `EXPO_PUBLIC_API_URL` in `.env`
- Use LAN mode: `npm start -- --lan`
- Or tunnel mode: `npm start -- --tunnel`

### Build error
```bash
eas build --platform ios --clean
```

### Port 19000 in use
```bash
npm start -- --port 19001
```

## Debugging

### View Logs
In terminal where app is running:
- React errors show in terminal
- Network requests in console
- Use `console.log()` for debugging

### React DevTools
1. Press 'd' in terminal
2. Select "Open JS debugger"
3. Browser opens with DevTools
4. Set breakpoints, inspect state

### Network Inspector
1. Press 'd' in terminal
2. Select "View network"
3. See all API requests
4. Check request/response data

## Next Steps

1. **Explore Code**
   - Read screen components
   - Check service implementations
   - Review navigation structure

2. **Connect Backend**
   - Ensure API running on configured URL
   - Test login endpoint
   - Verify all services work

3. **Customize**
   - Change colors in themes.ts
   - Modify screen layouts
   - Add new features

4. **Deploy**
   - Follow `DEPLOYMENT.md`
   - Build for iOS/Android
   - Submit to App Store/Play Store

## Resources

- [Expo Docs](https://docs.expo.dev)
- [React Native Docs](https://reactnative.dev)
- [React Navigation](https://reactnavigation.org)
- [Paper Components](https://callstack.github.io/react-native-paper)

## Support

For issues:
1. Check Expo docs
2. Search GitHub issues
3. Ask in Discord community
4. Check terminal logs

## Happy Coding!

You're all set. Start exploring and building!

```bash
npm start
```
