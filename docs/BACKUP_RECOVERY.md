# Backup and recovery (Spark-compatible)

## Scope and responsibility
Use Firebase Console Realtime Database JSON export for manual backups. No scheduled paid backup service is required. Exports contain customer personal data and possibly private configuration: store encrypted, outside GitHub, with access restricted to the owner. Never attach exports to CI or support chats.

Before a release or bulk inventory edit, export the complete database, record UTC time and project ID, and retain a separate copy of the deployed rules. Export Authentication users separately using authorized Firebase CLI access; database exports do not include Auth accounts or externally hosted images. Keep original product images separately. Do not store credentials in the backup manifest.

## Restore rehearsal
Use only synthetic data in the local emulator. Run:
```sh
node --test tests/backup.test.mjs
```
The local verification tool checks the JSON structure and prints only aggregate counts. It never connects to Firebase or changes data.
```sh
node scripts/check-backup.mjs /secure/path/export.json
```
A passing check is not proof of a complete or consistent backup. Compare counts against the source, verify sample orders and inventory, and rehearse import into an isolated emulator before any live recovery.

Production restore requires owner approval, a maintenance window, a fresh pre-restore export, matching Auth identities and rules, and a documented reconciliation of orders received since the backup. Never overwrite a live database merely to test recovery.

Suggested manual cadence: daily after closing and before each release. Keep seven daily and four weekly copies, subject to applicable privacy retention requirements. Actual exports, encrypted storage and restore rehearsal remain owner/operator tasks.

### Offline consistency verification
After exporting, run `node scripts/verify-restore.mjs <local-export.json>` in addition to the basic checker. It checks order/index links, totals and reserved inventory references and prints aggregate counts only. A synthetic JSON roundtrip is covered by unit tests; this is not an actual Firebase restore or an Auth/image backup. Keep export files outside the repository and encrypted at rest.
