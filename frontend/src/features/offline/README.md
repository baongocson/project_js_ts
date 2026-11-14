# Browser-first Demonstration Module

## Status and scope

This is a **local-only functional demonstration**, not the finalized server-backed implementation. It accepts a CSV directly in a browser, keeps published local versions in IndexedDB, performs mathematically computed 3D rotations and projections using Canvas, previews one transformation before apply, and supports history/restore by producing new local versions. The demo continues to work when an already-open browser page loses connection to the API or Internet.

## Important limitations

- **No synchronization with NestJS/MongoDB Atlas yet.** `pendingSync=true` indicates unsynchronized local work. Do not claim upload, eventual sync or conflict resolution is implemented.
- CSV parser is limited (supports quoted fields and doubled quotes, comma/semicolon). It does not yet cover the complete CSV import policy.
- Version metadata and schema do **not** yet match the final 12-collection MongoDB ERD. Do not use local version numbers as server version numbers.
- Only `trim` and fixed-value missing fill are supported here; their implementation is local. Does not yet offer full operations/preview API parity.
- 3D points are mathematically rotated and projected, not image/video animation; sample cap is 4,000 points. This is a Canvas-based projection demo, not yet a full Three.js scene.
- IndexedDB persistence is scoped to one local project. Clearing site data erases it. No PWA cold-start guarantee.
- Existing Backend API routes remain scaffold endpoints returning 501; browser demo deliberately does not misrepresent them as completed.

## Manual smoke test

1. Open Frontend (Vite) and import a CSV. Table and 3D appear.
2. Preview a fill/trim operation, then Apply. Verify a new local version appears.
3. Restore V1. Verify a **new** version is created.
4. Stop Backend while page stays open. Continue using Preview, Apply, and 3D.
5. Refresh page while Frontend server is still serving. Check IndexedDB reload.
6. Confirm UI says **not synchronized with Atlas**.
