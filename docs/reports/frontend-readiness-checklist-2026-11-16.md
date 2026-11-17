# Checklist frontend và mức sẵn sàng backend — 16/11/2026

> **Cập nhật kiểm kê 17/11:** xem [checklist hiện trạng mới](frontend-status-checklist-2026-11-17.md) để có trạng thái editor, recovery/sync, blocked-upgrade, các gate hiện hành và công việc còn mở. Các số liệu và mục chờ xử lý bên dưới phản ánh các mốc trước đó, không thay thế báo cáo mới.

**Có thể thiết kế và tích hợp frontend hoàn chỉnh ngay theo hợp đồng hiện tại.** Backend có implementation đủ **27 API nghiệp vụ và 27 phương thức xử lý**. Frontend hiện **chưa hoàn chỉnh**: đã có auth/profile, quản lý project online, import/bảng dữ liệu và luồng offline/sync; đã nối processing/Preview/Apply, history online và analysis/charts/3D. Đợt 17/11 đã thêm backup/source recovery, sync center/reconnect/backoff và quota import/Apply/checkpoint. Còn audit lifecycle/edge cases, editor/UX/accessibility, dọn adapter cũ và nghiệm thu/bàn giao cuối; xem [báo cáo mới](frontend-recovery-sync-2026-11-17.md).

Đủ API để làm frontend không đồng nghĩa toàn hệ thống đã nghiệm thu production. Không cần chờ thêm các endpoint nghiệp vụ chính; cần tiếp tục kiểm hợp đồng khi tích hợp từng màn hình.

## 1. Phạm vi kiểm tra

| Mục | Kết quả |
| --- | --- |
| Nhánh / nền | `dev-frontend`, HEAD `43a5422` — Complete backend contract fixes and offline browser acceptance |
| Code được kiểm | HEAD **và working tree hiện tại**, gồm nhiều file sửa/mới chưa commit. Không coi toàn bộ chức năng mới đã có trên remote. |
| Căn cứ | [Frontend plan](../plans/frontend-implementation-plan.md), [backend plan](../plans/backend-implementation-plan.md), [API](../api/API.md), [DTO](../api/dto-contract.md) |
| Đọc source | Router/providers/shell, session/transport, project/workspace/import/table, processing components/API, IndexedDB/outbox/sync; backend controllers/services/repositories và Data Core |
| Bằng chứng trước | [Backend remediation](backend-plan-remediation-2026-11-16.md), [tiến độ frontend](frontend-implementation-progress-2026-11-16.md) |
| Phạm vi môi trường | HTTPS + MongoDB replica tạm cục bộ; theo lựa chọn dùng kết quả cục bộ của người dùng. Không nghiệm thu deployment/Atlas. |
| Thao tác lượt audit | Chạy kiểm tra và cập nhật báo cáo; không commit/push/merge hoặc thay đổi nghiệp vụ trong lượt audit này. Giữ các source WIP hiện có. |

Quy ước: **Đạt** chỉ áp dụng cho đầu việc cụ thể có bằng chứng; **Một phần** khi còn điều kiện nghiệm thu; **Chưa có UI** khi API/component chưa được nối thành luồng người dùng. File, dropdown hoặc endpoint tồn tại không tự chứng minh toàn feature hoàn thành. Các phần baseline ở frontend plan là lịch sử, không phản ánh working tree hiện tại.

## 2. Backend đã đủ toàn bộ chưa?

| Checklist | Nhóm | Số API | Implementation được đối chiếu | Có thể làm frontend ngay |
| --- | --- | --- | --- | --- |
| [x] | Auth | 4 | Register/login/refresh/logout; JWT, cookie refresh/session rotation, Origin và rate limit | Auth và bootstrap phiên |
| [x] | Users | 3 | GET/PATCH/DELETE me, name/theme, cascade/fence khi xóa | Profile/settings/theme |
| [x] | Projects/workspace | 6 | CRUD/list; workspace CAS theo revision/boundVersionId, adjustments | Dashboard và workspace/autosave |
| [x] | Dataset/import/read | 4 | Multipart CSV/original storage, typed snapshot, metadata, rows page/filter/sort và getRow | Wizard và bảng typed |
| [x] | Processing | 3 | Create/get preview, Apply; candidate, diagnostics/schema, TTL/no-op, receipts và publish/CAS | Processing form, diff và Apply |
| [x] | History/restore | 2 | List phân trang; restore tạo version mới, stale/ownership/idempotency | Timeline và restore online |
| [x] | Analysis/3D | 5 | Summary/distribution/correlation/points-3d/value-counts từ published snapshot; N/A/counts/sampling | Biểu đồ/thống kê và scene 3D |
| [x] | Data Core | Ngoài tổng API | Đủ 27 method, typed CSV/codec/query/mapping; engine `data-core-unified-0.6.0` | Dùng chung engine browser/server |
| [x] | Persistence | Ngoài tổng API | 12 collection, validators/indexes, transaction/publish, receipt/lease, cleanup/recovery | Dữ liệu thật khi DB bật |

Tổng **4 + 3 + 6 + 4 + 3 + 2 + 5 = 27 API**, không cộng health. Đã đối chiếu service có xử lý/persistence, không chỉ đếm decorator. Auth/Users có nhánh 501 khi chủ động tắt DB; không lấy chế độ DB-disabled để kết luận backend nghiệp vụ còn scaffold.

| Phạm vi | Kết luận |
| --- | --- |
| Backend theo phạm vi chính của kế hoạch | Có đủ implementation để thiết kế và tích hợp frontend. |
| Backend tạo sẵn UI/chart/scene 3D | Chưa; backend trả dữ liệu, frontend phải render và xử lý tương tác. |
| Offline analysis | Đã có local adapter và UI, dùng cùng pure calculations tách từ backend vào Data Core; không import Nest vào browser. Browser kiểm 120 dòng, reload offline, N/A/counts/sampling. |
| Production HTTPS/Atlas/proxy/tải thực | Chưa nghiệm thu. |
| Mọi tổ hợp input, mọi lỗi/race/failover, mọi trình duyệt | Chưa chứng minh đầy đủ; các test chỉ đảm bảo phạm vi đã chạy. |
| Sync cần API bulk mới | Chưa thấy yêu cầu; protocol đang replay qua API/receipts hiện có. |

## 3. Checklist frontend theo gói công việc

| Checklist toàn gói | Gói | Hiện trạng | Đã thực hiện | Còn thiếu để đóng gói |
| --- | --- | --- | --- | --- |
| [ ] | FE-00 — baseline/layout | Một phần | Baseline chung; shell/nav/routes, controls/dialog/theme; workspace đã ghép table/processing/history/analysis | Sync center/layout cuối; đầy đủ responsive/keyboard/focus/states |
| [ ] | FE-01 — HTTP/session | Phần chính đã có | Shared HTTP parse envelope/details/requestId/Retry-After, 204/FormData/network/abort; memory token, bootstrap, single-flight refresh, owner/logout fence; 7 unit test | Bổ sung nghiệm thu vòng đời cross-tab/reconnect và session hết hạn giữa thao tác; chưa khẳng định mọi race được kiểm |
| [ ] | FE-02 — auth/profile/shell | Phần chính đã có | Login/register/profile routes, GET/PATCH name/theme, route guard; xác nhận logout/delete với pending local; cache app cho lần mở sau | Polish field/error/focus/keyboard/responsive và kiểm đầy đủ lifecycle tài khoản nhiều tab |
| [ ] | FE-03 — projects/workspace | Phần chính đã có | CRUD/sort/page; autosave/CAS/adjustments, account-bound draft trước debounce, response-loss reconcile và explicit recovery/export; reload theo version | Session-expiry/storage-failure/navigation nâng cao và audit states cuối |
| [ ] | FE-04 — import/table | Phần chính đã có | Shared online/local wizard, recompute typed override, CSV vị trí lỗi/BOM/quotes/newline, exact source/options; table shared typed/multi-filter AND/sort/page/selection/getRow | Editor UX/selection scope nâng cao và ma trận biên/states cuối |
| [ ] | FE-05 — storage/adapters | Một phần | IndexedDB v2 thêm workspace riêng, giữ record v1/source/history/keys/engine; config CAS/persistence/normalization chung; shared wizard/table/processing/analysis; quota config có export/retry | Đã có backup/source recovery và quota import/Apply/checkpoint; còn blocked-upgrade/crash/restart/lifecycle rộng và polish quản lý local |
| [ ] | FE-06 — processing/history | Phần chính đã có | Đủ 27 typed forms/scopes, online/local Preview/Apply/diff/schema/diagnostics/expiry, stable keys; history online/page/filter/restore và version reload; ma trận 27 fixture UI | Mọi tổ hợp scope/biên, editor integration/selection persistence/local history UX và full audit |
| [ ] | FE-07 — analysis/3D | Phần chính đã có | 5 API và shared pure core offline; summary/histogram/valuecounts/Pearson N/A/pairs; 3D axes/colors/counts/sampling/rotate/zoom/point→row ngoài filter; config online CAS | Đã có config local persistence; còn quy mô lớn và ma trận đầy đủ visual/accessibility cuối |
| [ ] | FE-08 — outbox/sync UX | Lõi có guard trước publish; UX còn thiếu | Stable keys/map/checkpoint/loss/account/conflict; đọc đầy đủ preview candidate và kiểm nội dung/lineage/identity trước Apply; test mismatch không publish và expired preview retry | Đã có sync center/progress/outbox, opt-in reconnect/probe/backoff/cap và backup/server copy; còn audit multi-tab/account/restart/Retry-After/lifecycle và UX cuối |

Không đánh dấu trọn FE-00–FE-08 chỉ từ một luồng thành công. Bảng sau tách các nhiệm vụ hẹp đã hoàn thành để không bỏ sót tiến độ.

## 4. Những nhiệm vụ đã có implementation và bằng chứng

| Checklist | Nhiệm vụ | Nguồn / bằng chứng | Giới hạn |
| --- | --- | --- | --- |
| [x] | Tooling React/Vite/TS và ranh giới import | Router/providers, architecture checker | Không đại diện cho hoàn thiện UI sản phẩm |
| [x] | HTTP lỗi/204/multipart/replay có kiểm soát | `shared/api/http-client.ts`; unit tests | Chỉ đánh dấu các case đã test |
| [x] | Memory session, refresh single-flight/logout fence | `features/auth/hooks/session.ts`; unit tests | Kiểm nâng cao cross-tab còn thiếu |
| [x] | Register/login/profile/theme lưu qua reload | Auth/Profile pages; browser online workspace test | Chưa đóng toàn gói UX/auth lifecycle |
| [x] | CRUD project online và import/bảng/filter | ProjectsPage, WorkspacePage, ImportWizard/TypedTable; browser test | Editor và full workspace chưa hoàn thành |
| [x] | CAS hai tab không ghi đè thầm | Browser CAS và draft conflict/export/reconcile | Đã giữ draft; session-expiry/quota lifecycle nâng cao còn mở |
| [x] | Offline source/snapshot/history giữ qua reload | project-store/project-sync; acceptance offline | Đã có migration v1→v2/config CAS/quota; còn backup/missing source/quota snapshot/restart rộng |
| [x] | Chạy đủ 27 method qua engine và replay lên server | Browser test loop 27 fixtures và backend matrix được ghi trước | Dropdown/preset không phải 27 form hoàn chỉnh |
| [x] | Restore local → server và retry response mất | Acceptance offline Apply/restore receipts | Không phải history online UI |
| [x] | Sai account/head conflict/delete giữ local | Acceptance offline | Chưa bao phủ mọi tình huống nhiều tab |
| [x] | App đã cache mở lại khi offline | Production worker + acceptance chặn mạng/reload | Cần mở online lần đầu để cache |

## 5. Công việc còn lại và điều kiện đóng

| Ưu tiên | Checklist | Công việc | Điều kiện hoàn thành |
| --- | --- | --- | --- |
| P1 | [x] | Nối typed forms/processing panel vào workspace | Đã có đủ 27 method, scope/validation, ordinal category và fixture qua controls thật online/local; xem ma trận riêng, không suy mọi scope đều đã test |
| P1 | [x] | Preview riêng trước Apply online/local | Đã có diff/schema/diagnostics, invalid/no-op/expiry/diff-failure guard, stable Apply receipt; local preview không đổi current, stale tab bị chặn |
| P1 | [x] | Pre-Apply parity của sync | Đã đọc đầy đủ changes/schema, dựng candidate, kiểm typed position/identity/lineage trước POST operations; test mismatch xác nhận chỉ import được publish, rồi retry đúng dữ liệu |
| P1 | [x] | History online/restore | Đã list/page/filter, target/confirmation, stable key; restore tạo version và refresh workspace; receipt-loss nâng cao tiếp tục audit |
| P1 | [x] | Analysis/charts/3D | Đã nối 5 API và local shared core; browser 120 dòng/N/A/pairs/sampling/point→row/empty/error; local config và quy mô cuối theo FE-05/07 |
| P1 | [ ] | Autosave draft/recovery | Đã PASS leave-before-debounce, response-loss reconcile, failure/reload/recover, CAS/export; còn kiểm session-expiry/storage-failure và lifecycle nâng cao |
| P2 | [ ] | Hoàn thiện import/table | Đã có recompute override, nhiều filter typed, edit_cell qua form; CSV BOM/quoted newline/header-only/blank/missing/oversize qua UI. Còn editor UX nâng cao/biên toàn bộ |
| P2 | [ ] | Local storage và shared adapters | Workspace local; migration giữ dữ liệu, quota/missing original có hướng phục hồi; transaction và tests reload/upgrade/multi-tab |
| P2 | [ ] | Sync center/recovery | Đã có pending/progress, opt-in probe/reconnect/backoff/cap, keep local/backup/server copy và account pin. Còn Retry-After, lifecycle/account/multi-tab mở rộng và UX cuối |
| P2 | [ ] | Responsive/accessibility/states | Kiểm màn hình thật desktop/mobile, keyboard/focus/dialog; loading/empty/error/success đủ từng feature |
| P2 | [ ] | Tài liệu và nghiệm thu bàn giao | README/protocol/migration/demo; test xuyên online/offline/sync/charts/3D; phân biệt local và production; commit/push khi được yêu cầu |

Code hiện đã nối ProcessingPanel/HistoryPanel/AnalysisPanel vào WorkspacePage; OfflineWorkspace dùng ProcessingAdapter để Preview riêng Apply và AnalysisAdapter trên toàn snapshot. Runtime sync dựng candidate từ preview trước publish; editLocalProject ghi ngay đã được bỏ. Khoảng trống còn lại tập trung ở FE-04/05/08 và nghiệm thu toàn luồng/lifecycle/UX cuối, không còn là các public index rỗng.

## 6. Ma trận màn hình có thể thiết kế

| Màn hình | Hiện tại | Backend đủ | Bước tiếp theo |
| --- | --- | --- | --- |
| Auth/profile/settings | Có luồng chính | Có | Polish/states và lifecycle nhiều tab |
| Projects dashboard | Có CRUD online | Có | UX/page/sort/recovery đầy đủ |
| Workspace | Có table/import/processing/analysis/history/autosave/draft recovery | Có | Sync center và UX/recovery nâng cao |
| Import/table | Có luồng chính | Có | Override preview, typed editor, CSV edge cases |
| Processing/preview | Đã nối online/local, 27 form typed | Có | Scope/biên rộng và editor UX cuối |
| History/restore | Online page/filter/restore và local history | Có | Receipt/lifecycle nâng cao, polish |
| Summary/distribution/value-counts/Pearson | Có UI online/local shared core | Có | Ma trận rộng/states/large-feature QA |
| 3D | SVG tương tác online/local | Có | Config local persistence và QA đầy đủ |
| Sync center | Status và nút sync local | Có protocol hiện tại | Reconnect/retry/export/conflict UX; pre-Apply parity đã có guard/test |

Không thêm lựa chọn encoding/header ngoài API V1; hiện UTF-8 và dòng đầu là header. Không thống kê từ riêng trang rows đang xem; không chuyển N/A thành 0. Core engine và contracts là nguồn semantics chung.

## 7. Kiểm tra và giới hạn bằng chứng

| Gate | Kết quả trong lượt audit hiện tại |
| --- | --- |
| `npm run typecheck -w frontend` | PASS toàn backend/frontend/core; architecture 101 file, đúng chiều import, không vòng phụ thuộc |
| `npm run lint` | PASS toàn repo |
| `npm run test:unit -w frontend` | **21/21 PASS**, gồm HTTP/session, owner fence, 27 spec boundary, preview reconstruction, analysis/draft, backup validation và auto eligibility/backoff |
| `npm run test:acceptance -w frontend` | **25/25 PASS** toàn suite trên source hiện tại, khoảng 3,2 phút; gồm analysis/3D, shared import, local migration/config/CAS/quota, sync/parity/loss/expiry, online workspace và draft recovery. Hai loop bao phủ form typed đủ 27 method online và offline |
| Backend toàn suite | Không chạy lại toàn bộ trong lượt audit; báo cáo remediation ghi 334 test + 4 probes trước đó. Không cộng các lượt chạy lại thành test mới |
| Deployment/Atlas/multi-browser/stress | Chưa kiểm; không suy từ kết quả local |

Build backend/core/frontend PASS trong các runner. Backend calculation/projection unit 11/11 và integration BE-3 6/6 PASS sau extraction shared analysis/preview. Typecheck toàn workspace và lint PASS sau shared workspace normalization/storage/table; backend workspace/normalization unit thêm 4/4 PASS. Tiếp tục gate khi có source mới; không lấy gate cũ để chứng minh source chưa được kiểm. Artifact/trace được gitignore, không dùng URI Atlas cá nhân. Chi tiết ở báo cáo tiến độ và ma trận processing.

**Kết luận:** backend đủ phạm vi chính để triển khai toàn bộ thiết kế frontend theo kế hoạch; frontend đã có nền và một số luồng thực, nhưng chưa đủ nghiệm thu sản phẩm. Tiếp tục editor/UX/accessibility, quản lý local, audit lifecycle/session/edge cases, hợp nhất legacy adapters và kiểm tra/bàn giao cuối. Xem báo cáo tiến độ cho các gate wizard/table/storage mới; chưa đánh dấu trọn FE từ test hẹp. Chưa commit/push, không merge vào main. Mục tiêu hoàn thiện frontend vẫn còn các công việc mở trong bảng trên.
