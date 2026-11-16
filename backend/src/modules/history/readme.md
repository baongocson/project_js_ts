# BE-3C — History and Restore

- `GET /api/v1/datasets/:datasetId/operations`: owner check, page/limit/kind filter, newest first; reads committed operations only.
- `POST /api/v1/datasets/:datasetId/versions/:versionId/restore`: target must be published in same dataset. Uses BE-2 idempotency receipt before stale checks, loads immutable target snapshot, stages a **new** version via `SnapshotPublisherService.prepare`, publishes via BE-2 CAS transaction (dataset revision/version, operation ledger, receipt). `restoredFromVersionId` points at target, `parentVersionId` at previous current version.
- A restore to current version is 409 `NO_CHANGES_TO_RESTORE`; expected current mismatch is 409 `BASE_VERSION_STALE`; unknown/unpublished/wrong dataset target is 404 `VERSION_NOT_FOUND`.
- The publisher's callback now receives the same `createdAt` as persisted processingOperations ledger. This is an additive internal BE-2 interface change: obtain BE-2 review before merge.
- Requires actual MongoDB replica-set integration testing for concurrency, deletion/recovery fences, idempotency retries and rollback; unit tests are not sufficient.
