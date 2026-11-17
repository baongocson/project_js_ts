# Checklist hiện trạng frontend và mức sẵn sàng backend — 17/11/2026

> Cập nhật tiếp theo: [EDA, sửa ô3D và TF-IDF ngày17/11](frontend-eda-tfidf-2026-11-17.md). Các giới hạn/mốc27method bên dưới phản ánh thời điểm trước bổ sung này.

**Có thể tiếp tục thiết kế và hoàn thiện toàn bộ frontend ngay.** Backend đã có implementation cho đủ **27 API nghiệp vụ và 27 method xử lý** theo kế hoạch. Frontend đã có các màn hình và luồng chức năng chính online/offline; công việc hiện tại là hoàn thiện trải nghiệm, kiểm tra các tình huống còn thiếu và đóng gói bàn giao. Chưa đủ căn cứ gọi toàn hệ thống đã nghiệm thu production.

## Phạm vi và quy ước

- Kiểm checkout `dev-frontend`, HEAD `43a5422` **cộng working tree chưa commit**. Không suy các chức năng WIP đã có trên remote; không fetch/push/chuyển nhánh/merge trong lượt kiểm tra này.
- Đối chiếu [kế hoạch frontend](../plans/frontend-implementation-plan.md), [kế hoạch backend](../plans/backend-implementation-plan.md), [API](../api/API.md), [DTO](../api/dto-contract.md) và source thực tế.
- Dùng nghiệm thu HTTPS + MongoDB replica tạm cục bộ theo lựa chọn của người dùng. Không dùng kết quả cục bộ để xác nhận Atlas/deployment.
- `[x]` nghĩa là đã có chức năng cụ thể trong source và bằng chứng được ghi; `[ ]` là đầu việc chưa đóng. Không dùng việc có dropdown/route/endpoint để chứng minh toàn bộ nghiệm thu.
- Các baseline “chỉ có scaffold” trong kế hoạch ngày 16/11 là lịch sử. Báo cáo này cập nhật checklist cũ theo working tree ngày 17/11.

## Backend đã đủ toàn bộ chưa?

| Checklist | Nhóm | API | Implementation đã đối chiếu | Frontend có thể tích hợp |
| --- | --- | ---: | --- | --- |
| [x] | Auth | 4 | Register/login/refresh/logout, JWT/session, cookie rotation, Origin/rate limit | Auth, bootstrap, logout |
| [x] | Users | 3 | GET/PATCH/DELETE me, theme/name, account cleanup | Profile/settings/delete |
| [x] | Projects/workspace | 6 | Create/list/get/rename/delete, workspace revision/CAS và adjustments | Dashboard, autosave, conflict |
| [x] | Datasets | 4 | CSV multipart/original source, typed snapshot, metadata, rows/filter/sort/page/getRow | Import, bảng, selection |
| [x] | Processing | 3 | Create/get preview và Apply; candidate, diagnostics, TTL, no-op, receipt/publish | Preview/diff/Apply |
| [x] | History | 2 | List operations, restore thành version mới, idempotency/base check | Timeline/restore |
| [x] | Analysis | 5 | Summary/distribution/correlation/points-3d/value-counts trên published snapshot | Statistics/charts/3D |
| [x] | Shared Data Core | — | Typed CSV/codec/query/mapping và đủ 27 method; engine `data-core-unified-0.6.0` | Cùng semantics browser/server |
| [x] | Persistence/quyền | — | Repository, ownership, transaction/publish, idempotency/lease và cleanup | Tích hợp với dữ liệu thật khi DB bật |
| [ ] | Nghiệm thu triển khai | — | Chưa chạy URL HTTPS/DB test triển khai, proxy thực, multi-instance/tải thực | Không chặn phát triển UI cục bộ |

**Tổng 27 API, không tính health.** Controller đã nối service/repository có xử lý; không chỉ tồn tại decorator. Xem thêm [bằng chứng nghiệm thu backend trước đó](backend-plan-remediation-2026-11-16.md). Số 334 test trong báo cáo đó là kết quả lịch sử, không phải lượt chạy lại hôm nay.

Trong source vẫn có các guard feature cũ ném `NotImplementedException`; chúng được khai báo provider nhưng không gắn `UseGuards` vào các controller nghiệp vụ. Luồng hiện hành dùng global `AuthGuard`/`OwnershipGuard` ở `auth.module.ts` và kiểm ownership trong service. Đây là phần nên dọn để tránh hiểu nhầm, chưa phải bằng chứng API đang trả 501. Auth/Users còn nhánh 501 khi chủ động tắt database; nghiệm thu nghiệp vụ phải bật DB.

Sync hiện replay qua create/import/preview/Apply/restore cùng receipts; chưa thấy thiếu endpoint bulk-sync bắt buộc để hoàn thiện frontend. Backend trả dữ liệu analysis/points; frontend vẫn chịu trách nhiệm chart và tương tác 3D.

## Checklist frontend đã thực hiện

| Checklist | Gói kế hoạch | Chức năng hiện có | Source/bằng chứng chính | Phần cần hoàn thiện |
| --- | --- | --- | --- | --- |
| [x] | FE-00 — nền/layout | React/Vite/TS, app shell/nav/routes, shared controls/dialog/theme, ghép workspace | `app/router.tsx`, `app/providers.tsx`, `shared/ui/controls.tsx`; architecture check | Review thiết kế và states toàn màn hình |
| [x] | FE-01 — HTTP/session | Envelope/details/requestId/Retry-After, 204, FormData, abort/network; memory token, bootstrap, single-flight refresh, owner/logout fence | `shared/api/http-client.ts`, `auth/hooks/session.ts`; frontend unit | Nghiệm thu thêm session hết hạn giữa thao tác và lifecycle nhiều tab |
| [x] | FE-02 — auth/profile/cache | Register/login/profile, name/theme, xác nhận logout/delete và cảnh báo local/draft; cache app shell | Auth/Profile pages, app components, `public/offline-worker.js`; browser auth/reload/offline | Audit mọi đường vào logout/delete và UX tài khoản |
| [x] | FE-03 — project/workspace | CRUD/sort/page, workspace autosave/CAS/adjustments; account-bound draft trước debounce, recover/export/reconcile | ProjectsPage, WorkspacePage, `workspace-drafts.ts`; browser CAS/draft | Kiểm expiry/storage-failure/navigation kết hợp |
| [x] | FE-04 — import/table/editor | Shared wizard online/local, delimiter/type override, exact source/options, CSV location errors; typed filter/sort/page/selection; editor prefill và Preview riêng Apply | ImportWizard, DataTableView, TypedTable, ProcessingPanel; import/cell-editor tests | Mở rộng scope/biên theo ưu tiên, review trải nghiệm bảng |
| [x] | FE-05 — offline storage | IndexedDB schema v2 giữ record v1; config riêng/CAS; atomic snapshot/history/outbox; backup/source recovery/xóa local, quota retry | project-store, local-workspace, project-backup, ProjectRecovery; storage/recovery tests | Backup project chưa chứa cấu hình bảng/chart trong store `workspaces`; ghi rõ khi bàn giao |
| [x] | FE-06 — processing/history | Đủ 27 typed forms, scope/validation, preview/schema/diff/diagnostics/expiry/no-op; Apply keys; history online/page/filter/restore và local restore | ProcessingPanel/MethodParameters/HistoryPanel; [ma trận 27 method](frontend-processing-matrix-2026-11-16.md) | Fixture không bao phủ mọi tổ hợp method × scope × tham số; local history còn giao diện cơ bản |
| [x] | FE-07 — analysis/3D | 5 API online và cùng pure core offline; summary/histogram/valuecounts/Pearson N/A/pairs; trục/color/threshold/sampling/rotate/zoom, point→row ngoài filter | AnalysisPanel, Scatter3D, analysis adapters/core; analysis browser/unit | Kiểm hiệu năng và khả năng sử dụng với dữ liệu lớn; QA visual/a11y rộng |
| [x] | FE-08 — sync/recovery | Durable outbox/map/cursor/key, owner pin, kiểm full candidate trước Apply; conflict giữ local; receipt retry; sync center/progress/server copy; opt-in reconnect/probe/backoff/cap | project-sync, preview-candidate, SyncCenter, SyncCoordinator; offline/sync/recovery tests | Auto sync chỉ khi app/tab còn mở; chưa phải background sync khi mọi tab đã đóng |

Các dấu hoàn thành ở bảng trên áp dụng cho **implementation chức năng được liệt kê**, không đóng toàn bộ tiêu chí bàn giao FE-00–FE-08. UI hiện có `/login`, `/register`, `/profile`, `/projects`, `/projects/:projectId`, `/offline` và `/local/projects`; không cần xây lại từ scaffold.

## Checklist cần xử lý để nghiệm thu frontend

| Ưu tiên | Checklist | Công việc còn mở | Điều kiện đóng |
| --- | --- | --- | --- |
| P1 | [ ] | Audit lifecycle auth và bản nháp | Kiểm session hết hạn giữa autosave/Apply/sync, đổi/logout/delete nhiều tab; không replay mutation sang tài khoản khác, không mất local/draft |
| P1 | [ ] | Thống nhất chính sách tài khoản giữa hai màn hình | Profile kiểm pending local/draft, khóa/recheck và cho lựa chọn xử lý; `/offline` còn gọi logout trực tiếp, delete chỉ `window.confirm` và giữ local. Dùng chung quy trình cảnh báo/xử lý pending theo FE-02; chưa coi hai đường này tương đương nghiệm thu |
| P1 | [ ] | Chốt ma trận nghiệm thu theo yêu cầu | Đối chiếu scope/biên chưa chạy trong ma trận 27 method; ưu tiên missing, invalid/no-op, thay đổi schema, stale response; ghi rõ phạm vi thay vì yêu cầu mọi tổ hợp vô hạn |
| P1 | [ ] | Review thiết kế frontend cuối | Duyệt auth/dashboard/workspace/local/sync trên desktop/mobile; loading/empty/error/success, keyboard/focus, bảng rộng và chart/3D; thống nhất bố cục phù hợp báo cáo |
| P2 | [ ] | Đồng bộ tài liệu với code hiện tại | Offline README còn nhắc `OfflineApiAdapter` dù file đã xóa trong WIP; các báo cáo cũ còn ghi editor/Retry-After/blocked-upgrade chưa làm và count test cũ. Cập nhật README/protocol/demo trước bàn giao |
| P2 | [ ] | Dọn source legacy sau review | Guard feature placeholder không dùng; pure replay/queue fixture cũ cần mô tả rõ ranh giới với runtime ProjectApi/shared transport |
| P2 | [ ] | Chốt giới hạn recovery | Ghi backup giữ source/data/history/outbox/map/keys, chưa giữ workspace config; app cần cache online trước; auto replay cần tab mở và opt-in |
| P2 | [ ] | Đóng gói bàn giao | Review diff, chọn commit, hướng dẫn cài/chạy/test/demo và fixture; chỉ push/merge theo yêu cầu riêng, không merge main trong lượt audit |
| Sau local | [ ] | Nghiệm thu deployment | HTTPS/proxy/cookie/DB test triển khai và tải thực khi có môi trường. Theo quyết định hiện tại dùng kết quả cục bộ trước |

## Gate xác minh trong lượt kiểm tra này

| Gate | Kết quả |
| --- | --- |
| `npm run typecheck` | PASS backend/frontend/core; architecture frontend 100 file, đúng chiều import, không vòng phụ thuộc |
| `npm run lint` | PASS toàn repo |
| `npm run test:unit -w frontend` | **22/22 PASS**: HTTP/session/owner fence, spec boundary, preview reconstruction, analysis, draft, backup và auto retry |
| Build backend/core/frontend | PASS trong runner acceptance |
| Browser acceptance | **40/40 PASS, 4,2 phút**. `npm run test:acceptance -w frontend` build PASS nhưng MongoDB loopback bị sandbox chặn `EACCES`; sau đó chạy `node backend/scripts/test-browser-local.cjs` với quyền phù hợp trên cùng bản build, terminal exit 0 |
| Toàn bộ backend unit/integration | Không chạy lại riêng toàn suite trong lượt audit; đọc implementation và dùng báo cáo lịch sử cùng backend thật trong browser acceptance |
| Deployment/Atlas/multi-browser/stress | Chưa nghiệm thu |

Browser acceptance gồm auth/profile/projects, import/table/editor, autosave/draft/CAS, 27 form online và 27 fixture offline replay, preview/history/restore, analysis/3D, offline reload/cache, mapping/receipt/conflict/account, backup/source recovery, migration/blocked upgrade/quota và reconnect/backoff. Số method trong các vòng lặp không cộng thành số test case riêng.

Ca UI quality đã PASS keyboard/skip-link, field validation, modal focus/return, nội dung dài không tràn ngang tại mobile 390px và desktop 1440px, light/dark. Đây là gate tự động có phạm vi cụ thể; chưa thay buổi review thiết kế tất cả màn hình hoặc audit accessibility toàn diện. Artifact/trace ở `frontend/test-results/acceptance` được gitignore. Lượt audit chỉ tạo báo cáo này và thêm liên kết cập nhật ở checklist cũ; không sửa source nghiệp vụ.

**Kết luận:** backend đã đủ phạm vi nghiệp vụ chính để hoàn thiện frontend; không cần chờ thêm toàn bộ backend mới bắt đầu thiết kế. Frontend cũng đã có phần lớn chức năng thực. Chưa đóng nghiệm thu toàn sản phẩm vì còn review UX, một số gate lifecycle/biên, tài liệu và commit bàn giao. Báo cáo phân biệt rõ working tree cục bộ với code đã phát hành.
