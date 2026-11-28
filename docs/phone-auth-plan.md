# Phone-first customer identity (proposed, not yet enabled)
 
Goal: +998 phone, six-digit SMS OTP, persistent account without email/password, existing order history retained. Admin authentication remains separate. Current staging Spark + Expo Go workflow must remain intact. No paid service enabled.
 
## Options
- Firebase native phone authentication: Firebase Blaze billing required for real SMS; use configured fictional numbers for non-SMS tests. Native iOS verification uses APNs/reCAPTCHA; React Native Firebase requires a custom development build and is not supported in Expo Go. A native SDK migration must ensure the JS Firebase session used by existing APIs remains the same identity, not a second independent session.
- Local SMS gateway (e.g. Eskiz): existing Cloudflare Worker can host an OTP flow and return Firebase custom tokens via a securely authorized signer. Existing JS SDK can use signInWithCustomToken in Expo Go. Requires a provider account, approved OTP template, real SMS balance, service account permissions, a reviewed anti-abuse design. Do not expose provider secrets to app. Pricing and carrier delivery must be confirmed before enabling.
 
## Requirements for local gateway
1. Separate staging-only OTP endpoints, authenticated guest actor for attaching a new number. Normalize E.164 +998 format, explicit consent, no lookup by unverified phone. Never assign an account by profile phone alone.
2. Cryptographically random short-lived code, keyed hash with a server-side secret, constant-time validation, transactionally enforced attempt budget, per-number/actor/IP/global rate limits, resend cooldown, one-use challenge, bounded storage and cleanup; no code or raw phone in logs. Fail closed when storage/provider unavailable. No public test bypass.
3. Atomic unique phone identity binding; preserve the original Firebase UID for guest with orders. If a number already belongs to another UID, do not silently merge or abandon existing history. Require verified ownership and separate reviewed migration.
4. Sign custom tokens only for verified customer UID, never admin UID; verify dataset marker, fixed project and audience, least privilege; no client-supplied UID for login. Existing backend authorization still checks verified Firebase ID token and server role.
5. UI: number, request code, countdown, six-digit input, resend/change number, errors in Uzbek and Russian, restore session, retain email recovery until migration complete. No fabricated SMS success.
6. Automated tests: synthetic provider and isolated data, no real SMS; concurrency, expiry, replay, brute force, duplicate number, guest order ownership, admin separation, interruption and lost response. Then authorized live test on real iPhone and second device.
 
Sources: https://firebase.google.com/docs/auth/limits ; https://firebase.google.com/docs/auth/ios/phone-auth ; https://docs.expo.dev/guides/using-firebase/ ; https://eskiz.uz/uz/sms .
