# Privacy notes (BoxingAI)

## On-device camera & mic
- Pose tracking and punch detection run **on-device** via MediaPipe / local audio processing.
- Camera frames are **not uploaded** for coaching inference.
- Microphone audio for bag-hit fusion stays on-device unless the user explicitly exports a debug session file.

## Optional account data (League)
- If the user opens League and Firebase is configured, we may create an anonymous (or Google-linked) account.
- Stored remotely: display name, city, weekly XP/score, friend invite links.
- Users can avoid League and still use Pad Cam, drills (local), and missions offline.

## Purchases
- Subscription status is handled by Google Play / RevenueCat. We do not store full payment card details.

## Crash & analytics
- Optional Sentry crash reports and anonymized product analytics events (drill start/complete, paywall, league submit).
- Disable or omit `EXPO_PUBLIC_SENTRY_DSN` to turn crash reporting off in a build.

## Contact
Replace with your support email and public privacy policy URL before Play submission.
