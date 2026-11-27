# Phase 1 acceptance — code candidate, not production release

1. Confirm all PR checks green (mobile/typecheck/lint/unit/bundles, RTDB emulator, Firestore emulator, dependency audit).
2. Merge is not deployment. Web production Hosting is manual with explicit approval on master; do not run publishing/setup workflows now.
3. Export staging data and retain encrypted off-repository copies; resolve old pending orders before changing stores. Do not import real data into the candidate.
4. Current staging V3: deploy V4 from standalone staging-worker.mjs to the existing staging Worker only; check version, checkout, confirm, cancel, lost response and close attempt.
5. Persistent account: link guest to synthetic test email, verify, sign out, sign in from second device, check same UID/history, wrong password and profile isolation.
6. Firestore candidate: separate staging Worker and synthetic-only Firestore dataset, default deny direct client access; configure indexes and scoped credentials. Do not turn on billing. Endpoint name is planned, not yet created. Candidate client mode EXPO_PUBLIC_N99_BACKEND=firestore-candidate is disabled by default. Test catalog, product changes, quote, order recovery, status, settings and admin access on iOS and web. Banners/media remain RTDB auxiliary data; don't change real content or use a real customer identity. No active traffic cutover.
7. Record counts and stock before/after, actual latency, quota consumption, restore test and limitations. Keep RTDB as current authority until owner approves a single-authority migration. Rollback candidate test by returning to the old staging mode; never roll back committed real orders by switching stores.
8. Remaining moderate dependencies: keep audit gate, review stable compatible updates; no forced Expo downgrade. A green CI result does not prove absence of security bugs.

No production migration, release, paid services or real backup performed by this PR.
