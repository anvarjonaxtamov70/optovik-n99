# Backup and recovery runbook

Status: procedure only; production backups and restore drills have not been verified.

## Before deploying database rules
- Record the currently deployed rules, release commit and Firebase project ID.
- Export Realtime Database data using an authorized administrator in Firebase Console. Store the export encrypted in access-controlled storage outside this public repository.
- Never attach database exports, customer addresses, phone numbers, API keys, or service account credentials to GitHub issues, Actions artifacts or logs.
- Verify export completeness, timestamp, checksum and access permissions. Record only non-sensitive metadata.
- Confirm the new rules against the emulator and test legacy and updated clients before production deployment.

## Recovery drill
- Use an isolated emulator or separate staging project, never the production database.
- Restore a sanitized export, compare catalog counts, order/index links, totals, stock and reservation state.
- Test customer isolation, admin permissions, order creation, cancellation and inventory concurrency.
- Verify image URLs separately: a database export does not back up externally hosted images.
- Firebase Authentication users and credentials require a separate authorized recovery procedure; a database export does not include them.
- Record the elapsed recovery time and any discrepancies. Do not mark recovery verified until the drill succeeds.

## Production incident
- Pause affected writes and preserve evidence. Identify whether the problem is rules, client release, or data corruption.
- For a rules regression, prefer restoring the last verified compatible rules rather than replacing data.
- Before any data repair, take a fresh encrypted export and reconcile orders received after the recovery point. Do not blindly overwrite current stock or orders with an old snapshot.
- Require owner approval for production restore and verify the target project twice.
- Resume writes only after validation and document the incident without customer data.

## Proposed policy (owner approval required)
Daily encrypted backups, 30-day retention, monthly restore drill. Confirm storage costs, local data protection requirements, and authorized access before enabling automation. Recovery objectives are provisional: up to 24 hours of data loss and four hours to restore; measure and revise after the first drill.
