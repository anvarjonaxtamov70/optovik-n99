# Production scale decision — not implemented
## Current boundary
The staging Worker reads and conditionally replaces the entire RTDB root. Every order, catalog edit and profile write competes for the same ETag, and each operation transfers data proportional to total database size. The 1 MiB root cap prevents indefinite growth, not overload. Do not deploy this design to production.
## Proposed direction
Evaluate a transactional database with row/document-level conflict isolation (e.g. a relational store with transactions, or Firestore transactions). Select a service only after validating its free-tier limits, geographic availability, transaction semantics and operational requirements. No service provisioned, no billing enabled.
- Order table keyed by persistent customer ID and idempotency key, with a unique constraint; order index projected from authoritative records.
- Inventory rows keyed by category/product; confirm and cancel update only touched products in deterministic order inside one transaction, and update the order state in the same transaction.
- Product prices and delivery settings are validated against the authoritative snapshot; preserve existing reserve-at-confirmation behavior and current UI.
- Store immutable order totals and explicit reservation state. Every committed change writes an outbox event in the same transaction; projections consume idempotently with monotonic versions. Never make both databases independent authorities for stock.
- Keep public catalog projection and current Firebase Auth until migration plan is approved. Anonymous UID is a device/session identity, not a verified customer across devices. Link verified accounts only with explicit user flow; do not infer identity from unverified phone numbers.
## Migration gates
1. Measure existing data volume, order rate and read/write patterns using aggregate counts only.
2. Select a transactional store with documented capacity and no surprise charges; design schema, rules, indexes, and transaction tests in a separate isolated prototype.
3. Import synthetic data, verify parity for all checkout/status/cancel and catalog operations; simulate lost acknowledgements and competing stock changes.
4. Rehearse data export/restore, identity migration, projection replay and rollback in isolation. Compare counts and reconciliation totals without exposing personal data.
5. Obtain owner approval before any production data movement or traffic switch. Never dual-write stock without a single transactional authority.
## Acceptance criteria
No negative inventory; no duplicate order for the same persistent idempotency key; no stock/index divergence after retry or crash; bounded transaction scope; measured latency and contention at an agreed workload; documented backup/restore and rollback. Set quantitative load targets after measuring actual workload. No claim of production scalability until implemented and measured.

## Local architecture prototype (implemented, not deployed)
`backend/prototype/transaction-store.mjs` uses Node's built-in SQLite and an in-memory synthetic database. It reuses existing order validation and loads only the target order, affected products, settings and customer rate gate. It uses a unique order key and commits order, stock, and outbox marker in one SQL transaction. It is a feasibility test, not a cloud service or production migration: no concurrent connections, persistent storage, identity linking, full catalog writer, event projection, auth adapter or load benchmark is implemented. The current staging Worker is unchanged.

## Prototype recovery and projection extension
The synthetic prototype now stores an immutable order-index snapshot with each outbox marker, supports bounded cursor pages and demonstrates idempotent stale-event rejection in an in-memory order-index projection. The local SQLite backup API is exercised by opening a separate backup file and continuing the order lifecycle. A deterministic test uses 1,000 unrelated catalog records and 100 sequential order lifecycles. This is not a throughput benchmark or distributed load test. SQLite writes still serialize; the file option is for disposable synthetic tests, not production. The prototype schema is experimental, has no migration support, and older prototype files must not be reused. Durable projection checkpoints, catalog/stock projections, real account linking, hosting and cloud transaction semantics remain open.

## Multi-connection local concurrency tests
Six independent Node worker threads open the same disposable SQLite file, wait for a start signal, then attempt duplicate checkout, competing stock confirmation or cancellation replay. A 5-second SQLite busy timeout permits short lock contention; transactions still serialize writes. The assertions require one order/event on identical retries, exactly three confirmations for three units, and exactly one release event on cancellation. These are local file contention tests, not deployed Worker tests or a distributed benchmark. No customer data, cloud service, or production credentials are used.
