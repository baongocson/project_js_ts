# Offline replay E2A — existing-server dataset

`IndexedDbQueueStore` persists per-queue state in IndexedDB. `createOfflineQueue` validates IDs and independent idempotency keys. `replayOfflineQueue` checkpoints **before every external mutation**, retries uncertain commits with exactly the original key, stops on stale base/account/engine/owner, and only marks synced after a server-head verification.

This is an independently testable replay infrastructure, **not a finished offline feature**. The current frontend does not yet provide offline CSV Blob/V1 snapshot persistence, local→server mapping for new projects and imports, multi-operation re-mapping, app shell/service worker, auth UI, and browser end-to-end proof. FE integration must supply a trusted authenticated `readRemoteState` adapter, local IDs mapped to the published server IDs, and UI for user-visible blocked/conflict states. Do not claim all offline commands are synced merely because this module passes unit tests.

The replay adapter calls existing BE endpoints:

- `POST datasets/:datasetId/previews` with `Idempotency-Key`
- `POST datasets/:datasetId/operations` with `Idempotency-Key`
- `POST datasets/:datasetId/versions/:versionId/restore` with `Idempotency-Key`

The implementation intentionally refuses to guess local-to-server ID mapping after the first operation changes the base version. It also never stores an access token or refresh token in the IndexedDB outbox.

Run `npm run test:offline -w frontend` and the ordinary root typecheck/lint/build suite. The test suite is a pure coordinator test with an in-memory store; real IndexedDB and Chrome offline E2E need FE wiring.
