# OPTOVIK N99 — AI Product Studio

## Phase 1: isolated foundation
No deployment, provider calls, new dependencies, database schema changes or client UI changes.
The existing admin editor is src/screens/admin/AdminProductEdit.tsx and image intake is src/components/admin/ImageManager.tsx. The current upload path uses ImgBB, not Firebase Storage. Keep the existing path unchanged until the media strategy is explicitly reviewed. Existing products store HTTPS image URLs and have a ten-image limit.

The policy module validates decoded image metadata, normalizes untrusted AI suggestions into a draft, and excludes unconfirmed vehicle compatibility from artwork. It is a pure module, not an authenticated endpoint. Client-provided metadata alone is insufficient: later intake must inspect actual bytes and dimensions before processing, reject unsupported formats and enforce resource limits.

## Delivery gates
1. Foundation: policy and unit tests; existing CI green.
2. Provider feasibility: verify current Gemini free quota/region, terms, actual model and privacy; no billing activation. Use server-only secrets; authenticated admin role check, rate/size limits, timeouts, no automatic paid fallback. No arbitrary URL fetch.
3. Visual feasibility: web-only local segmentation model, verify license, memory and speed on the target laptop; preserve original photo and markings. Manual cutout/template fallback.
4. Studio preview: web admin product form, explicit click, local preview, original retained, no automatic save; Uzbek/Russian interface. Apply reviewed fields only; do not overwrite nonempty fields without confirmation.
5. Publishing: reuse existing secure product save and media upload, respect image count and product revision, retry safely, never change price/stock. Check media hosting limits; no production migration without approval.
6. End-to-end staging: real sample photos, incorrect fitment, offline/provider quota, repeated clicks, cancellation, mobile regression, CI and human approval before production.

Target: no incremental paid AI spend. Free quotas and existing hosting/storage costs are not guaranteed. ChatGPT Plus does not supply API credits. AI suggestions are not evidence of fitment; confirm against a catalog/article or admin knowledge. No secrets, customer data, order data or production credentials in AI requests. No AI output is automatically published.
