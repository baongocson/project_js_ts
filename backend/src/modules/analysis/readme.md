# BE-3D Analysis / 3D API

Five GET endpoints implement existing DTOs under `datasets/:datasetId/versions/:versionId/analysis`:

- `summary`: original file size, typed duplicate rows, missing by column, numeric outliers.
- `columns/:columnId/distribution`: numeric histogram and outlier bounds; missing/constant/non-numeric statuses.
- `correlation`: pairwise finite numeric Pearson, null and explicit N/A reason for unsupported/insufficient/constant pairs.
- `points-3d`: numeric XYZ, excluded-coordinate counts, stable row-ID sample capped by existing maxPoints validator.
- `columns/:columnId/value-counts`: exact typed counts, missing aggregate, pagination, total-row rates.

Controller validates DTO/query via existing parsers; AnalysisService validates dataset ownership, published version and referenced columns; AnalysisRepository reads the BE-2 published snapshot only. Pure `analysis-calculations.ts` does not mutate source snapshots and creates no MongoDB collections.

## Tests / limits

`backend/src/test/unit/modules/analysis` covers computational edge cases and authorization ordering; existing HTTP e2e contract expects a database-unavailable error (503) instead of 501 with DB disabled. Run root typecheck, lint, unit, build and backend e2e. **Still required**: real MongoDB replica integration, ownership/cross-dataset checks, performance profiling on large inputs, validation of 3D output with frontend.

The existing API schema has no new ceiling on bins or correlation columns; this implementation does not invent one. Do not treat passing unit tests as complete scale/security certification.
