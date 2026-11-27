# Staging Worker — PR 14

This is a deliberately bounded staging-only prototype. Do not deploy against production.
The Worker verifies a Firebase ID token with Identity Toolkit before using a separate staging service account. It reconstructs item names/prices and totals, applies the existing 30-second per-UID rate gate, and reserves inventory at admin confirmation (existing behavior). Cancel releases stock only once. Firebase REST root ETag conditional PUT is used to commit the order/index/customer or stock changes together. Root snapshot is limited to 1 MiB, with up to four CAS attempts. This is not a scalable production strategy; it reads the entire staging database, including private data internally, and assumes no priority metadata. No raw credentials, database snapshots or errors are returned or logged. Public GET / is a static status endpoint.

Deployment (staging project only):
1. Add FIREBASE_WEB_API_KEY (the public web config apiKey) to the existing staging Worker variables; keep FIREBASE_SERVICE_ACCOUNT secret. Do not upload credentials to GitHub.
2. Copy backend/staging-worker.mjs into the Worker editor and deploy; public root should return version 3.
3. Stop Metro, publish backend/database.staging.rules.json in the staging Firebase console only. These rules deny direct order creation/transition/index writes and preserve admin note editing and catalog/profile reads/writes. Existing production rules remain unchanged.
4. Add EXPO_PUBLIC_N99_BACKEND=worker to .env.local and restart Metro. No fallback to direct order writes when enabled. Verify staging checkout, admin confirmation/cancellation and retry behavior. No production deployment.
5. Before any production design, replace root-wide CAS with bounded transactional storage architecture and establish persistent customer identities if cross-device deduplication across anonymous UIDs is required. Anonymous devices cannot be reliably identified as the same customer; do not use unverified phone numbers as identity. No blanket dedup claim.
6. After trial, rotate/revoke the staging service key if no longer needed, and restrict public Worker access or remove it.

Manual and emulator security tests still required on the actual staging rules and live ETag operations. Existing unit tests are not a live deployment verification.

Version 2 diagnostics: search Worker logs for `n99-stage` and `n99-upstream`. Only fixed stage labels and upstream HTTP statuses are logged; the public error response remains generic. The conditional PUT uses the documented plain JSON URL and GET requests request uncompressed data to preserve the ETag. These changes are not proof that the original 503 is fixed.

## Observed staging acceptance (2026-11-27)
Operator reported iPhone checkout N159084 succeeded after deploying v2, and confirmation/cancellation changed the sample Cobalt stock 6 → 5 → 6. The earlier v1 503 cause was not isolated; this is observed functional success, not a comprehensive security or load test. Parallel tests use a synthetic in-memory ETag store; live concurrency is still a release gate.

Version 3 (not deployed yet): shared 24-second upstream budget, capped per-call timeouts, short randomized backoff on explicit ETag conflicts, four-attempt ceiling and no implicit retries of ambiguous writes. Request-body parsing is still bounded by bytes, not an independent hard time limit; this is not a strict end-to-end latency guarantee. Mobile retry and reconciliation continue to use the original pending order ID. See `SCALE_PLAN.md` for production architecture decision and migration gates.
