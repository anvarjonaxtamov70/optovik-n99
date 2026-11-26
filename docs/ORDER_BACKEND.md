# Authoritative checkout migration

Current state: client builds an atomic RTDB order/index write. Rules validate individual prices and quantities, but cannot aggregate arbitrary item collections. Admin confirmation recomputes totals. No trusted checkout service is deployed.

## Proposed contract
Authenticated callable endpoint receives product identifiers, integer quantities, delivery mode, checkout details and a stable idempotency key. It derives customer UID from verified authentication, never from request data. It reads current catalog prices and shop delivery settings, calculates totals using integer UZS, validates stock and limits, and returns a canonical quote or a price-change response. Client-supplied totals are not authoritative.

## Migration gates
1. Choose deployment region, billing and runtime with owner approval.
2. Implement and test pure pricing logic, then authenticated endpoint in staging.
3. Test concurrent requests, duplicate keys, changed prices, unavailable stock, disabled delivery, and free delivery boundaries.
4. Ensure order and index are committed together and idempotency survives network retries. Define inventory reservation transaction strategy before enabling checkout.
5. Release compatible clients and disable direct customer order creation only after migration verification. Keep cancellation behavior and existing order history compatible.

Do not deploy or enable billing without owner approval. No production rules changes are required by this document.

## Checkout recovery and catalog maintenance

Pending checkout reconciliation uses an authenticated REST read rather than the SDK's potentially cached snapshot. An ambiguous submission retains its original ID; confirmed orders use their original quantities, and the local cart persists a receipt together with its contents before clearing the pending ID. This is device-local recovery, not cross-device business idempotency.

Product deletion and category moves perform a server-read preflight of active indexed orders. This is deliberately a client guard, not an atomic server invariant; it does not cover an order created between the check and mutation, missing historical index entries or other clients. The scan also costs reads proportional to order history and should be replaced with a trusted product-reference index or stable product IDs before scaling. Existing product IDs remain unchanged. No production deployment or billing changes.

The product editor retains the revision captured when its form opened. A live catalog update must not silently refresh that revision while leaving stale form quantities in place. Reload the editor after a conflict.
