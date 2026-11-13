# Internal testing track checklist

## Build
- [ ] `eas build --platform android --profile production` produces an AAB
- [ ] Install on a physical device via Play internal testing
- [ ] App icon + splash render correctly

## Core offline
- [ ] Onboarding completes (goal → experience → hand → stance test → ready)
- [ ] Pad Cam: permission, skeleton, FPS, punch/defense HUD
- [ ] Drill: voice calls, mute/intensity, avatar states, results XP
- [ ] Home streak / XP / calendar update after a drill
- [ ] Fighter card share sheet opens

## League (with Firebase configured)
- [ ] Anonymous auth on League open
- [ ] Submit this week succeeds (or callable validation message)
- [ ] City / Friends / Global tabs populate
- [ ] Invite code add-friend works between two testers

## Monetization
- [ ] Locked drills open paywall
- [ ] Purchase / mock premium unlocks drills + plan days
- [ ] Restore purchases path does not crash

## Stability
- [ ] Force-close mid-drill recovers cleanly
- [ ] No crash when Firebase/RevenueCat/Sentry env vars are empty
- [ ] Privacy notes reviewed against `docs/PRIVACY.md`

## Jev punch classify (optional)

### Debug (in-app key — use this while validating)
In `.env`:
```
EXPO_PUBLIC_JEV_PUNCH_CLASSIFY=1
EXPO_PUBLIC_JEV_PUNCH_DEBUG=1
EXPO_PUBLIC_OPENROUTER_API_KEY=sk-or-...
```
Restart Expo. App calls OpenRouter Decisions API directly (no Firebase).

### Production (Firebase proxy)
```bash
firebase functions:secrets:set OPENROUTER_API_KEY
firebase deploy --only functions:classifyPunch
```
Set `EXPO_PUBLIC_JEV_PUNCH_DEBUG=0` (or unset) so the app uses the callable.

- [ ] With classify flag off, Pad Cam / drills still label punches locally
- [ ] Debug mode: punch types can update after ~100–200ms without Firebase
- [ ] Prod mode: signed-in user + deployed callable works
- [ ] Missing key / timeout falls back to local (no crash)
