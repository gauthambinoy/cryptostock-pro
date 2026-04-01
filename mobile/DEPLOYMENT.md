# AssetPulse Mobile App - Deployment Guide

Complete guide for deploying to iOS App Store and Google Play Store.

## Prerequisites

### General
- Expo account (https://expo.dev)
- EAS CLI installed: `npm install -g eas-cli`
- App configured in app.json
- Proper versioning in place

### iOS Deployment
- Apple Developer Account ($99/year)
- Mac with Xcode
- iOS development certificate
- App Store distribution certificate
- Provisioning profiles

### Android Deployment
- Google Play Developer Account ($25 one-time)
- Keystore file for signing
- Google Play console access

## Setup EAS

### 1. Initialize EAS

```bash
cd mobile
eas init
```

This will:
- Create eas.json configuration
- Link to your Expo project
- Set up build credentials

### 2. Configure eas.json

```json
{
  "build": {
    "development": {
      "distribution": "internal",
      "android": {
        "gradleCommand": ":app:assembleDebug"
      },
      "ios": {
        "buildConfiguration": "Debug"
      }
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "distribution": "store",
      "android": {
        "buildConfiguration": "release"
      },
      "ios": {
        "buildConfiguration": "release"
      }
    }
  },
  "submit": {
    "production": {
      "ios": true,
      "android": true
    }
  }
}
```

## iOS Deployment

### 1. Register App ID

In Apple Developer Portal:
1. Go to Certificates, Identifiers & Profiles
2. Create new App ID
3. Bundle ID: com.assetpulse.mobile
4. Enable capabilities (Push Notifications, Face ID)

### 2. Create Certificates

```bash
eas credentials
```

Select:
- Platform: iOS
- Action: Set up
- Credentials mode: Auto (recommended)

### 3. Update app.json

```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.assetpulse.mobile"
    }
  }
}
```

### 4. Build for App Store

```bash
# Test build first
eas build --platform ios --profile preview

# Production build
eas build --platform ios --profile production
```

### 5. Submit to App Store

```bash
eas submit --platform ios --latest
```

Or manually:
1. Download IPA from EAS dashboard
2. Use Xcode or Transporter app
3. Upload to App Store Connect
4. Fill app details, screenshots, description
5. Submit for review (typically 1-3 days)

### 6. App Store Review Guidelines

- Ensure all features work as described
- Include privacy policy
- Clearly disclose data collection
- Test biometric authentication
- Verify push notifications
- Test with real data

## Android Deployment

### 1. Register App

In Google Play Console:
1. Create new app
2. Fill basic info (name, description, category)
3. Note the package name

### 2. Create Keystore

```bash
# Generate signing key
keytool -genkey-pair -v -keystore assetpulse.keystore \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias assetpulse-key

# Display key fingerprint
keytool -list -v -keystore assetpulse.keystore
```

Store the keystore file securely (not in git).

### 3. Configure Credentials

```bash
eas credentials
```

Select:
- Platform: Android
- Action: Set up
- Keystore: Create or provide existing
- Key alias, password: from keystore generation

### 4. Update app.json

```json
{
  "expo": {
    "android": {
      "package": "com.assetpulse.mobile",
      "versionCode": 1
    }
  }
}
```

### 5. Build for Google Play

```bash
# Test build first
eas build --platform android --profile preview

# Production build
eas build --platform android --profile production
```

### 6. Submit to Play Store

```bash
eas submit --platform android --latest
```

Or manually:
1. Download APK/AAB from EAS dashboard
2. Go to Google Play Console
3. Create release → Upload AAB
4. Add release notes
5. Set targeting (countries, devices, Android versions)

### 7. Play Store Review

- Typically takes 2-4 hours
- Test account credentials may be requested
- Ensure all permissions are justified
- Provide demo credentials if needed

## Version Management

### Semantic Versioning

```json
{
  "expo": {
    "version": "1.0.0"
  },
  "android": {
    "versionCode": 1
  }
}
```

Format: MAJOR.MINOR.PATCH
- MAJOR: Breaking changes (1.0.0 → 2.0.0)
- MINOR: New features (1.0.0 → 1.1.0)
- PATCH: Bug fixes (1.0.0 → 1.0.1)

### Update for Release

Before each submission:

```bash
# Update version
npm version patch  # or minor, major

# Update in app.json
# Android: increment versionCode
# iOS: increment CFBundleVersion
```

## OTA Updates (Optional)

Enable Over-The-Air updates for bug fixes:

```bash
eas update --branch production
```

Users can download updates without App Store review.

## Monitoring & Analytics

### In-App Analytics

1. Integrate Segment or Mixpanel
2. Track user events
3. Monitor crashes with Sentry

```bash
npm install @sentry/react-native
```

### Google Analytics (Android)

1. Set up in Firebase Console
2. Add Google Analytics ID
3. Track screen views, events

### App Store Analytics

1. View downloads, crashes, reviews
2. Monitor user ratings
3. Track crash logs

## Post-Launch Checklist

- [ ] App published in both stores
- [ ] Marketing materials ready
- [ ] Support channels set up
- [ ] Monitoring configured
- [ ] Error tracking active
- [ ] Crash logs reviewed
- [ ] User feedback review process
- [ ] Update plan documented

## Common Issues

### Build Failures

```bash
# Clear cache
eas build --platform ios --clean

# Check logs
eas build:log --id <build-id>
```

### Submission Errors

- Verify bundle ID matches
- Check certificate expiration
- Validate signing credentials
- Ensure app versions incremented

### Review Rejection

- Check store guidelines
- Review rejection reason carefully
- Address issues specifically
- Submit revised version

## Rollback Plan

If critical issues after launch:

1. **Immediate**: Disable features, show banner
2. **Short-term**: Submit patch fix
3. **Long-term**: Post-mortem analysis

## Maintenance

### Regular Updates

- Monthly security patches
- Quarterly feature releases
- Respond to user feedback
- Monitor app store reviews

### Deprecation

- Sunset old API versions
- Remove unused features
- Update dependencies
- Test compatibility

## Emergency Support

For critical issues post-launch:

1. Assess severity
2. Develop fix
3. Test thoroughly
4. Submit expedited build
5. Communicate with users

## Additional Resources

- [Expo Documentation](https://docs.expo.dev)
- [EAS Submit](https://docs.expo.dev/submit/overview)
- [Apple App Store Guidelines](https://developer.apple.com/app-store/review/guidelines)
- [Google Play Policies](https://play.google.com/about/developer-content-policy)
