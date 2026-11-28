# Scalability roadmap

These are design targets, not verified capacity: 100,000 daily active users, 10,000 concurrent users, 500,000 products, 10,000 daily orders.

## Catalog
Replace full-catalog subscriptions with bounded paginated queries and a dedicated search index. Use stable product identifiers independent of category. Cache public catalog pages and use appropriately sized image variants.

## Orders
Use a trusted backend for authoritative prices, delivery totals and idempotent order creation. Design inventory reservations with atomic concurrency control and reconciliation. Preserve historical order snapshots.

## Validation gates
Run synthetic load tests in isolated staging, never against production without approval. Increase concurrency gradually from 100 to 1,000 and 10,000. Measure p95 latency, error rate, database bandwidth, contention and cost. Verify no duplicate orders or negative stock. Set latency and cost budgets before release.

## Operations
Establish privacy-safe monitoring, alerting, encrypted backups and tested recovery. Review database region, provider quotas and data residency before selecting production infrastructure.

No capacity or availability guarantee is made until measured under representative traffic.
