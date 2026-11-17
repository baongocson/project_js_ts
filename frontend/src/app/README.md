# App

`providers.tsx` lắp BrowserRouter/StrictMode, SessionBootstrap, theme/cache effects và SyncCoordinator. `router.tsx` định nghĩa auth/profile/projects/online workspace/local/system/fallback; RequireSession chỉ bảo vệ điều hướng, quyền dữ liệu vẫn do backend.

`WorkspacePage.tsx` lắp public features table/import/processing/history/analysis, workspace CAS/autosave và account/project/tab-bound draft recovery. `AppShell` cung cấp nav, trạng thái mạng/phiên và skip link. App inject inspect/lock local callbacks vào Profile để feature auth không import ngược offline runtime.

Chiều import: app → features/shared; consumer dùng public index. Production cần SPA fallback về index.html và reverse proxy API. Chạy typecheck/architecture, health E2E và acceptance theo [frontend README](../../README.md).
