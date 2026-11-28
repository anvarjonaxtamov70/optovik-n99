# Gemini adapter — phase 2A

Current provider: gemini-3.1-flash-lite (text output from photo, NOT image generation). Official pricing and supported region verified 2026-11-28:
- https://ai.google.dev/gemini-api/docs/pricing
- https://ai.google.dev/gemini-api/docs/available-regions
- https://ai.google.dev/gemini-api/docs/generate-content/structured-output

The adapter is server-only and disabled by default. No deployment or live request is made in this PR. It accepts trusted decoded metadata plus image bytes; signature checks are not full decoding. A future authenticated endpoint must validate the actual image, strip metadata/re-encode, bound request size before parsing, verify admin privileges, enforce durable per-admin/project quotas, and reuse an instance for local concurrency protection. In-process busy state is NOT a distributed rate limit. Do not expose the adapter directly to users.

Before activating: create a dedicated Google AI Studio project with Free tier, no billing attached; verify available model and project quota in the console. Do not activate billing. Google's free-tier content may be used for service improvement; send only approved product images without personal data. The explicit freeProjectConfirmed flag is an operator attestation, not a billing verification API. Never use a paid project key. Store API key as a server-side secret, never EXPO_PUBLIC, GitHub source, or a browser setting. No automatic provider retries, paid fallback, tools, or model switching. Disable on quota/access failure and offer manual entry.

Next gate: trusted image intake, admin-only staging endpoint, durable quota and actual free-key smoke test. This PR uses mocked provider responses only. Verify actual REST compatibility and output quality on staging before release. Existing catalog write and media upload remain unchanged.
