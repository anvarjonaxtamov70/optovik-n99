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

## Stable inventory paths and acknowledged requests

Product removal is now a permanent catalog archive: the physical category/key record and inventory remain available for existing orders. The client hides archived products and the rules reject them in new orders. Ordinary admin writes cannot delete product records; physical category moves are temporarily disabled to keep legacy order references valid. An admin archive does not remove the physical stock. A future stable-ID migration will support category reassignment and a dedicated archive management screen.

Checkout and order transitions use authenticated REST requests without the SDK offline write queue. Timeouts still have unknown outcomes: checkout retains the ID, checks the actual server, and can reconcile confirmed orders from the order history screen. The old coordinates-stripping fallback was removed because it could silently lose the address pin. Admin status changes read the current order and product revisions from the server before making a single atomic write. Arbitrary aggregate totals, cross-device idempotency and enforcing every stock delta against a specific order remain limitations of this client/rules architecture.

Staging can be selected explicitly with a different Firebase project; invalid staging settings fail closed and local storage is isolated. The staging project itself is not provisioned. No production changes were applied.

Cart startup reconciliation now runs after hydration even if the catalog arrived first, and only prunes on a connected ready catalog. Undo restores only currently available quantities within normal cart limits. Invalid checkout payloads are rejected before creating a new pending ID. These changes do not provide cross-device idempotency or a trusted server-side aggregate calculator.

Checkout now compares each displayed price, quantity and delivery total with fresh authenticated database reads before sending a new order. This is a client preflight, not an authoritative backend: rules remain the final write gate and cross-device idempotency remains unresolved. It adds up to 51 reads per checkout (50 products plus settings).

Pending-order metadata is now validated by one shared strict parser. Recovery waits for cart hydration; a malformed local cooldown fails closed, while a future local clock value does not indefinitely block checkout (server rate rules remain in force).
