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

### Disposable emulator rehearsal
CI runs `npx --yes firebase-tools@14 emulators:exec --only database --project demo-n99-restore "node --test tests/restore.emulator.mjs"` against a dedicated local demo namespace. Synthetic JSON is exported, the disposable namespace is emptied, restored, compared, and cancellation is checked after restore. This never opens a production or staging database, and does not verify Auth users, real backups or images. Run real backup export separately and retain it outside GitHub.

## Firestore candidate offline report
`node scripts/plan-firestore-migration.mjs <local-export.json>` validates and reports counts and excluded root names only. No files or remote data are written. Do not run against actual exports in CI. The current candidate has not been deployed; real encrypted exports, Auth user exports, image backup and restoration need operator access. Never merge or publish as a substitute for these checks.

## Offline encrypted RTDB backup (new)
Use an encrypted, access-restricted directory outside the repository. Example PowerShell commands after exporting JSON from the correct Firebase console:
```powershell
node scripts/encrypted-backup.mjs keygen D:\\secure-keys\\n99.key
node scripts/encrypted-backup.mjs seal D:\\secure-keys\\n99.key D:\\private\\n99-export.json D:\\private\\n99.n99backup
node scripts/encrypted-backup.mjs verify D:\\secure-keys\\n99.key D:\\private\\n99.n99backup
```
Replace paths with existing private directories. Never upload key or export to GitHub or chat. The key is random and must be backed up separately; losing it loses recovery access. Windows ACLs must be set by the operator (Unix mode flags do not ensure Windows permissions). Verification authenticates ciphertext and checks order/index structure, not completeness. The original plaintext remains on disk: protect it and remove it under your retention policy after successful verification and redundant backup. The optional open command writes to a new *-export.json file; it never uploads to Firebase. 32 MiB limit; Auth users and images require separate backup. No actual user export processed by CI.

## Firestore candidate encrypted format (offline milestone)
The current candidate uses Firestore, so a legacy RTDB export alone is insufficient. `scripts/firestore-backup-format.mjs` defines n99-firestore-candidate-v1, fixed staging project, capture timestamp and unique path/value documents. The offline AES-256-GCM seal/verify/open CLI now recognizes that format as well as legacy RTDB. The candidate validator checks mandatory dataset/shop/banner records, catalog and order/index totals, reserved inventory references, known document families, duplicate paths, and reports aggregate counts. It refuses unknown document families instead of silently dropping them. Tests replay a synthetic reserved order from decrypted data and verify wrong keys and altered ciphertext fail. This does not collect a real remote snapshot, establish export completeness, restore remote data, or include Auth users/images. The next step is a read-only consistent staging export and a disposable emulator restore rehearsal. Do not treat a successful seal as proof that every source document was exported. Keep real customer data and keys outside GitHub. No billing enabled.
