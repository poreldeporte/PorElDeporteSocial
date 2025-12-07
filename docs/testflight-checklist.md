# TestFlight Checklist (Expo + EAS)

## Prereqs
- Paid Apple Developer account (team matches the bundle identifier).
- Expo/EAS account; `eas-cli` installed (`npm install -g eas-cli`) and logged in (`eas login`).
- `app.json` has `expo.ios.bundleIdentifier` set (unique per env).
- `eas.json` includes an iOS production profile.
- Use the repo `yarn.lock` (remove or ignore `/Users/francoviola/package-lock.json` to avoid a second React copy).
- Xcode CLI tools installed (for local builds if needed).

## One-command path (recommended)
1) From repo root: `npx testflight`
2) Follow prompts: confirm bundle ID, sign in to Apple, let EAS manage certs/profiles, trigger iOS prod build, and submit to App Store Connect.
3) After upload, manage testers/groups in App Store Connect TestFlight tab.

## Granular path
1) Build: `eas build -p ios --profile production`
2) Submit: `eas submit -p ios` (pick the build or point to the .ipa)
3) Manage testers in App Store Connect.

## Notes
- If dev warns about cross-origin in Next dev: set `allowedDevOrigins` in `apps/next/next.config.js` for LAN IP.
- Ensure `ios.bundleIdentifier` matches Apple team; mismatches will fail during credential setup.
- Keep a single React version in use (avoid npm install alongside yarn).***
