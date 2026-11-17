# Tiến độ hoàn thiện frontend — 16/11/2026

**Mốc kiểm mới nhất: xem phần “Gate cuối của đợt này” ở cuối tài liệu.** Các phần đợt đầu được giữ làm lịch sử, không coi checkbox còn mở ở mốc cũ là hiện trạng mới nhất.

Mục tiêu đầy đủ giữ nguyên theo [checklist readiness](frontend-readiness-checklist-2026-11-16.md). Báo cáo này ghi tiến độ working tree trên `dev-frontend`, nền `43a5422`; không thay kết luận toàn frontend chưa hoàn tất.

## Phần đã thực hiện trong đợt đầu

| Nhóm | Đã có implementation | Bằng chứng |
| --- | --- | --- |
| Tái sử dụng WIP | Lấy có chọn lọc transport/auth/session/profile/controls/theme và unit test từ stash cũ; giữ nguyên stash, không áp nguyên cây hoặc thay engine/storage | Các file tương ứng trong frontend/src, stash vẫn giữ nguyên |
| FE-01 | Shared requestJson xử lý envelope/details/requestId/Retry-After, network/abort, 204, FormData; auth session token trong bộ nhớ, refresh single-flight, logout generation fence, cross-tab coordination; khóa owner khi replay request | 7 frontend unit test đã PASS; typecheck PASS |
| FE-02 | Routes login/register/profile, typed field errors, profile/theme, xác nhận logout/delete với kiểm pending local; session bootstrap, RequireSession, app navigation, light/dark/system và controls/dialog dùng chung | HTTP/DB/browser smoke đã qua đăng ký/login/profile lưu rồi reload; acceptance offline cũ không bị phá |
| FE-03 | Server project list/create/open/rename/delete, sort/page, workspace route; autosave debounce/serialize dùng revision/boundVersionId, thông báo 409 và nút tải lại | Browser smoke create/rename/delete + autosave/filter tồn tại sau reload đã qua; CAS hai tab đã PASS: tab stale nhận xung đột, tải lại không ghi đè thay đổi đã commit |
| FE-04 | Import CSV online với delimiter/infer/override columnTypes, lỗi CSV theo vị trí từ server; typed table, missing labels, page/sort/filter, selection và getRow | Browser import/read/filter đã qua; không tự thêm encoding/header ngoài contract |
| Hợp nhất offline | OfflineWorkspace dùng session/transport chung, vẫn giữ UI cũ cho các gate đã có; app shell không chặn local mode | 5 gate offline/HTTPS/parity 27 method đã qua sau thay đổi nền |

Lệnh frontend unit mới: `npm run test:unit -w frontend`. Runner esbuild được khai báo devDependency trực tiếp; artifact test nằm trong .artifact-work đã gitignore. Các kiểm tra chạy theo thứ tự để tránh ghi dist trong khi browser khác đọc assets.

## Chưa đạt — tiếp tục trong cùng mục tiêu

- [ ] Form typed đủ 27 method và scope hợp lệ, preview trước/sau/schema/diagnostics; tách Preview khỏi Apply cho cả online/local.
- [ ] So nội dung preview server với candidate local **trước** Apply khi sync, không chỉ sau publish.
- [ ] History online phân trang/restore và cập nhật table/selection/analysis theo phiên bản.
- [ ] Summary/distribution/value-counts/correlation/3D, click điểm → row và analysis offline dùng semantics chung.
- [ ] Hoàn thiện autosave với draft/recovery khi rời màn hình ngay, request cũ/out-of-order/expired session và multi-tab conflict.
- [ ] Import override preview đầy đủ; nhiều filter/mixed-cell editor/CSV edge UI, thao tác online sau chọn ô.
- [ ] Tách OfflineWorkspace thành UI nghiệp vụ dùng chung, thay form JSON bằng typed controls; sync center/progress/backoff/conflict/export/reconnect.
- [ ] Local workspace persistence, schema migration/quota/missing-source recovery, multi-tab/upgrade tests.
- [ ] Hoàn thiện responsive/keyboard/focus/loading/empty/error/success; chụp/kiểm UI thực và nghiệm thu toàn luồng.
- [ ] Cập nhật README/module/checklist theo bằng chứng cuối, chạy toàn bộ gate và audit mọi yêu cầu trước khi đánh dấu goal complete.

Không commit/push/merge vào main trong đợt này. Môi trường nghiệm thu vẫn là HTTPS + MongoDB replica tạm cục bộ theo lựa chọn trước của người dùng; không dùng dữ liệu Atlas cá nhân làm fixture.

## Gate đã quan sát ở đợt đầu

- Typecheck/architecture frontend: PASS, 81 file trong graph, không vòng import.
- ESLint toàn repo: PASS sau chỉnh vòng đời fetch/effect.
- `npm run test:unit -w frontend`: 7/7 PASS, gồm account-change replay fence.
- Build backend/core/frontend: PASS trong runner acceptance.
- HTTPS/Nest/MongoDB browser acceptance: 7/7 PASS (5 offline gate cũ + online workspace/profile/project + CAS hai tab). Một lượt runner trước dừng với native Windows exit trước Playwright; đã chạy lại runner trực tiếp và có kết quả terminal PASS, không tính lượt crash là đạt.
- Goal vẫn active: các mục chưa đạt ở trên cần tiếp tục và phải được audit lại sau khi hoàn thiện toàn bộ frontend.


## Đợt tiếp theo — processing/history, analysis/3D và autosave recovery

Các hàng chưa đạt của đợt đầu là mốc lịch sử. Hiện trạng mới:

| Nhóm | Implementation / bằng chứng mới | Còn cần nghiệm thu cuối |
| --- | --- | --- |
| Processing | Shared typed form/scope cho 27 method, online/local Preview riêng Apply; before/after/schema/diagnostics, diff page, invalid/no-op/expiry; stable Apply key khi response mất | Mọi tổ hợp scope/biên, UX editor/table hoàn chỉnh |
| Local adapter | Candidate chỉ ở bộ nhớ; Apply kiểm local base dưới Web Lock rồi ghi snapshot/history/outbox nguyên tử; retry bằng operation id; tab stale không overwrite | Preview không sống qua reload (cần tạo lại, published data vẫn giữ); local workspace/migration/quota UX còn mở |
| Runtime sync parity | Đọc đầy đủ preview changes, dựng candidate từ server base/schema, kiểm typed cells/position/identity/lineage trước POST operations; mapping chỉ checkpoint sau receipt | Test nhiều page/quy mô và các failure boundary còn trong audit cuối |
| History online | Phân trang/filter/summary, xác nhận restore, giữ key/target khi chưa rõ kết quả; version mới reload metadata/rows/panels | Full UI states/restore receipt nâng cao |
| Analysis/3D | 5 API + shared pure calculation ở Data Core cho offline; summary/histogram/valuecounts/Pearson/N/A/pairs; SVG 3D axes/màu/rotate/zoom/sampling/hidden counts/point→row ngoài filter; config online CAS | Local workspace persistence; workload lớn và toàn bộ visual/a11y gate cuối |
| Autosave recovery | Bản nháp đồng bộ trước debounce, riêng account/project/tab; fail giữ pending; response-loss reconcile không replay mutation; reload recovery/export có lựa chọn và version/revision check | Storage quota/browser/navigation và hết phiên cần test bổ sung; chưa đóng toàn FE-03 |

Gate đã quan sát:

- Trước thêm draft recovery, **toàn bộ 16/16 browser tests PASS** (khoảng 2,2 phút), gồm 27 online typed form + 27 offline typed form loops, sync loss/parity/expiry guard, history/restore/no-op/invalid, 3 analysis/3D tests và local stale-tab.
- Sau thêm draft, gate riêng **4/4 browser PASS**: CAS cũ + leave-before-debounce + unknown-commit/failure recovery + conflict/export/reconcile. Không cộng các lượt chạy lại thành test mới.
- Frontend unit hiện **16/16 PASS**, gồm 3 draft tests và 3 analysis tests mới; backend calculation/projection unit **11/11 PASS** sau extraction.
- Ảnh analysis desktop/mobile đã được mở kiểm tra; viewport 390px không tràn ngang toàn trang. Bảng dữ liệu/matrix cuộn bên trong; points trùng chiếu có lựa chọn keyboard/list.
- Lint PASS trước phần sửa mới nhất; typecheck toàn workspace và integration BE-3 đang được chạy lại, sẽ ghi kết quả terminal. Không dùng crash hoặc lệnh chưa được chạy làm bằng chứng.
- Có một lần auto-review không chạy được do dịch vụ review trả 401 thiếu authentication; lệnh browser chưa được thực thi lần đó. Sau khi công cụ khả dụng trở lại, các lệnh được xét duyệt và kiểm thử lại thành công; không bypass review.

Theo dõi chi tiết form ở [ma trận processing](frontend-processing-matrix-2026-11-16.md). Các việc vẫn mở: migration/local workspace/quota, shared import/table/editor hoàn chỉnh, sync center/reconnect/export/recovery, lifecycle nâng cao và full polish/docs/audit. Goal chưa hoàn thành, không commit/push/merge.


## Bổ sung wizard/table dùng chung và IndexedDB v2

- ImportWizard online/local dùng cùng CSV core, preview recompute theo override, giữ nguyên nguồn/options và vị trí lỗi. Hai gate online/local BOM + quoted newline + semicolon + override đã PASS; gate blank-record/oversize/header-only và offline sync cũ cũng PASS trong các lượt chạy. Lượt đầu lỗi matcher accessibility của test đã sửa theo header thực, không nới điều kiện dữ liệu.
- DataTableView dùng chung filter typed (gồm mixed-kind/null), AND nhiều điều kiện/xóa từng điều kiện, sort và pagination. Local queryRows chạy từ toàn snapshot.
- IndexedDB version 2 chỉ thêm workspaces, giữ tên DB cũ và toàn record v1. Local workspace lưu filter/sort/page/selection/chart riêng, CAS/base cùng Web Lock với content; normalization dùng pure function chia sẻ từ backend sang core.
- **6/6 browser gate PASS** sau tích hợp: migration giữ exact source/snapshot/history/key/engine; offline reload cấu hình; nhiều filter và point/selection; stale local tab; quota config giữ published data và export; hồi quy analysis online, import/workspace online và offline sync chính.
- Thêm guard pin owner cho cả ProjectApi sync sequence, không chỉ một HTTP request. Frontend unit **17/17 PASS**, test đổi tài khoản giữa hai request chặn mutation trước fetch.
- Typecheck toàn workspaces + lint đã PASS ở mốc trước patch pin-owner cuối; đang kiểm lại gate cuối và backend workspace-normalization regression sau extraction. Integration BE-3 **6/6 PASS** sau shared analysis/preview extraction.
- Đã có config export/retry cho quota workspace. Missing source, backup/project export/recovery, reconnect/backoff/sync center, lỗi quota trên snapshot Apply/import và lifecycle rộng vẫn chưa đóng. Goal tiếp tục active.


## Gate cuối của đợt này

| Gate | Kết quả terminal đã quan sát |
| --- | --- |
| `npm run typecheck` | PASS backend/frontend/core; architecture 96 file, đúng chiều, không vòng |
| `npm run lint` | PASS toàn repo |
| `npm run test:unit -w frontend` | **17/17 PASS** |
| `npm run test:offline -w frontend` | **10/10 PASS** coordinator fixtures cũ |
| Backend analysis/preview unit targeted | **11/11 PASS** sau extraction |
| Backend workspace/normalization unit targeted | **4/4 PASS** sau extraction |
| `npm run test:integration:local -w backend -- --only=be3` | **6/6 PASS**, HTTP/DB preview/apply/history/restore/5 analysis/quyền/concurrency |
| `npm run test:acceptance -w frontend` | **25/25 PASS**, Playwright khoảng 3,2 phút, build backend/core/frontend cùng runner PASS |
| `git diff --check` | PASS, chỉ có cảnh báo LF→CRLF của Git trên vài file cũ; không whitespace error |

Không cộng 27 fixture loop thành 27 Playwright tests riêng hoặc cộng các lần chạy lại thành test mới. Không tuyên bố chạy lại toàn bộ backend historical 334 tests trong đợt này. Gate browser gồm snapshot thực qua API/MongoDB, không mock success; route interception dùng để tạo failure/candidate mismatch có kiểm soát.

Đầu việc tiếp theo vẫn cần làm trước goal complete: sync center/reconnect/backoff/progress/conflict/export; backup/restore nguồn thiếu; quota snapshot/import/Apply và interrupted upgrade/restart; session/account nhiều tab toàn chuỗi và recovery lâu dài; editor/accessibility/responsive/UX polish và audit toàn bộ yêu cầu/README/demo cuối. Lưu ý adapter coordinator cũ không phải UI path và còn cần quyết định dọn/hợp nhất export. Chưa commit/push/merge, giữ nguyên main.


## Đợt 17/11 — backup, sync center và storage failure

Xem [báo cáo recovery/sync](frontend-recovery-sync-2026-11-17.md) cho source mới: backup/restore nguồn, live progress, opt-in auto coordinator, API probe/backoff/cap, conflict server copy và quota import/Apply/checkpoint. Unit 21/21 và các browser gate riêng đã PASS; full regression mới đang được chạy. Các danh sách việc mở của đợt cũ là lịch sử; không áp chúng để phủ nhận implementation mới, cũng không suy toàn goal đã hoàn tất.
