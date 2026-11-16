# Checklist đối chiếu backend với kế hoạch — 16/11/2026

> **Đã có cập nhật xử lý:** xem [kết quả remediation và checklist hiện tại](backend-plan-remediation-2026-11-16.md). Bốn probe ban đầu đã khớp contract, có gate HTTP/DB cho 27 method và gate browser HTTPS/offline. Nội dung mục 1–9 dưới đây giữ nguyên là **snapshot trước khi sửa tại b7e33f6**, không phải trạng thái working tree hiện tại; JSON probe được cập nhật theo lần chạy sau sửa. Người dùng chọn nghiệm thu cục bộ trước, chưa nghiệm thu deployment.

**Kết luận: chưa hoàn thành đầy đủ yêu cầu nghiệm thu của kế hoạch backend.** Đã có implementation cho 27 API và 27 phương pháp xử lý, cùng nhiều kiểm thử thành công trên MongoDB cục bộ. Tuy nhiên còn lỗi hợp đồng đã tái hiện, thiếu ma trận nghiệm thu cho từng phương pháp qua HTTP và chưa chứng minh luồng offline → reload → đồng bộ → đọc từ phiên mới.

## 1. Phạm vi và cách đánh giá

| Mục | Giá trị |
| --- | --- |
| Nhánh kiểm tra | `dev-backend` |
| HEAD | `b7e33f60d1f4d99e8747576d0dc9b98b9b51a769` |
| Phần đã tích hợp | BE-1 `bfaedf6`, BE-2 `a4529c9`, BE-3 đến `b7e33f6` |
| So với remote tại lúc kiểm tra | Local đi trước `origin/dev-backend` 8 commit; chưa push bản tích hợp |
| Kế hoạch đối chiếu | [backend-implementation-plan.md](../plans/backend-implementation-plan.md), phần 4–7 |
| Hợp đồng đối chiếu | [API.md](../api/API.md), [DTO/D01–D26](../api/dto-contract.md), [ERD](../erd/ERD.html) |
| Bằng chứng bổ sung | [BE-1](../teamwork/be1-handoff.md), [BE-2](../teamwork/nguyen-be2.md), [BE-3](../teamwork/be3-final-handoff.md), [integration readiness](../teamwork/be3e-integration-readiness.md) |
| Thay đổi có sẵn ngoài HEAD | `docs/plans/be1-handoff.md` đang được chuyển sang `docs/teamwork/be1-handoff.md`; giữ nguyên thao tác của người dùng |
| Giới hạn | Kiểm tra source, test và chạy probe thuần; không thay đổi nghiệp vụ, không push/merge vào `main`, không kiểm tra Atlas triển khai hoặc browser offline thật |

Phần kiểm kê baseline đầu kế hoạch mô tả thời điểm scaffold cũ. Báo cáo này đối chiếu **yêu cầu thực hiện và nghiệm thu**, không dùng mô tả “27 route trả 501” cũ để kết luận code hiện tại chưa triển khai.

Quy ước: **Đạt** = có code và bằng chứng kiểm thử phù hợp trong phạm vi ghi rõ; **Một phần** = đã có implementation nhưng thiếu một phần yêu cầu hoặc bằng chứng; **Chưa đạt** = tái hiện sai hợp đồng hoặc thiếu luồng bắt buộc; **Chưa xác minh** = chưa có bằng chứng đủ để kết luận. “Đạt” của một hàng không chứng minh toàn hệ thống không còn lỗi. Checkbox chỉ được đánh dấu khi toàn yêu cầu của hàng đạt.

## 2. Tổng hợp theo gói BE-00–BE-07

| Hoàn tất | Gói | Kết quả | Nhận định |
| --- | --- | --- | --- |
| [ ] | BE-00 — Nền chung | Một phần | Có commit nền, package core CJS/ESM, test và bàn giao; thiếu bằng chứng nghiệm thu chung FE/BE, HTTPS/cookie qua trình duyệt và tài liệu tổng hợp cập nhật. |
| [x] | BE-01 — Auth/bảo vệ API | Đạt trong phạm vi backend local | 4 API auth, bcrypt 12, JWT/session, Origin, rate limit, ownership và test DB-enabled. Chưa chứng minh môi trường HTTPS/browser triển khai. |
| [x] | BE-02 — Users/xóa tài khoản | Đạt trong phạm vi test hiện có | 3 API Users, projection, patch và cleanup/fence/resume; test quyền và lỗi cleanup. Cạnh tranh với toàn bộ tác vụ BE-3 chưa được nghiệm thu riêng. |
| [x] | BE-03 — CSV/snapshot/datasets | Đạt trong phạm vi test hiện có | 4 API, CSV nguồn bất biến, typed codec/chunk/checksum, đọc dữ liệu và adapter; có core + DB/HTTP integration. |
| [x] | BE-04 — Projects/publish | Đạt trong phạm vi test hiện có | 6 API, workspace CAS, receipt/lease/fence, transaction publish, delete/recovery; có test retry/rollback/cạnh tranh. |
| [ ] | BE-05 — 27 method/Preview/Apply | Chưa đạt nghiệm thu cuối | Có engine và 3 API; lỗi summary D21, mã LAST_COLUMN, giới hạn ordinal; thiếu ma trận đúng/biên/sai và HTTP/parity đủ 27 method. |
| [ ] | BE-06 — History/Analysis | Một phần | 7 API có luồng thật; Restore summary sai D21; thiếu một số kiểm thử biên/concurrency/load. |
| [ ] | BE-07 — Offline → server | Chưa đạt | Có protocol, mapping helpers, IndexedDB outbox/replay core. Chưa nối đầy đủ create/import/map/checkpoint/UI/browser với server thật. |

Không tính tỷ lệ hoàn thành từ số route hoặc số test: BE-07 là điều kiện bắt buộc của kế hoạch và các gói có trọng số công việc khác nhau.

## 3. Checklist chi tiết yêu cầu

| Hoàn tất | ID | Yêu cầu kế hoạch | Trạng thái/bằng chứng | Còn cần làm |
| --- | --- | --- | --- | --- |
| [x] | 00.1 | Nền chung, cấu trúc phẳng, dependencies/workspaces | Commit `2cf3120`; root package/lock; repository nằm trực tiếp trong module. | — |
| [x] | 00.2 | Core thuần dùng browser/backend | [packages/data-core](../../packages/data-core/README.md), exports CJS/ESM, test parity/parser/codec. | — |
| [ ] | 00.3 | Hai nhóm xác nhận protocol, fixture, trách nhiệm | Có docs/teamwork và fixture trong test; chưa có bằng chứng hai nhóm chạy cùng luồng tích hợp. | Chốt commit/core và ma trận nghiệm thu FE/BE. |
| [ ] | 00.4 | Môi trường test, HTTPS/cookie, bảng API cập nhật | Có replica local, env mẫu, test user tạm; bảng API ở mục 4 báo cáo này. Chưa kiểm browser HTTPS. | Bổ sung setup HTTPS, browser refresh/logout và lưu log. |
| [x] | 01.1 | Register/login, bcrypt cost 12, projection | [auth.service.ts](../../backend/src/modules/auth/auth.service.ts), [user-response.mapper.ts](../../backend/src/modules/users/dto/user-response.mapper.ts); BE-1 integration. | — |
| [x] | 01.2 | JWT 15 phút, refresh opaque/hash, 7 ngày tuyệt đối | [auth-crypto.ts](../../backend/src/modules/auth/security/auth-crypto.ts), AuthRepository. | — |
| [x] | 01.3 | Cookie HttpOnly/Secure/Lax/path; rotate CAS, revoke | AuthController; integration concurrent refresh một thắng, token cũ/logout bị từ chối. | — |
| [x] | 01.4 | Global guard JWT/session/user + ownership; D26 | AuthModule đăng ký AuthGuard trước OwnershipGuard; [ownership.service.ts](../../backend/src/modules/auth/security/ownership.service.ts) recheck trong write fence. | — |
| [x] | 01.5 | Origin/CORS/rate limit, lỗi login thống nhất | AuthMutationGuard/AuthRateLimit/main.ts; security E2E và BE-1 integration. Rate limit trong bộ nhớ tiến trình. | Môi trường nhiều instance cần thiết kế riêng nếu triển khai; không coi là yêu cầu đã nghiệm thu ở đây. |
| [x] | 02.1 | GET/PATCH me, chỉ sửa tài khoản hiện tại | UsersController/Service/Repository; test projection, patch/null/theme, cross-user. | — |
| [x] | 02.2 | DELETE me, cascade/fence, không giả 204 khi lỗi | AccountCleanupService; BE-1 integration cleanup + lỗi 503/resume; BE-2 bổ sung storage barrier. | — |
| [ ] | 02.3 | FE xóa token và xử lý dữ liệu offline còn lại | Backend có hợp đồng; chưa nghiệm thu frontend tích hợp trên nhánh này. | Test đổi tài khoản/xóa account khi có outbox. |
| [x] | 03.1 | Typed snapshot, UUID/token, chunk ≤4 MiB, snapshot ≤100 MiB | Core codec + codec/query-limits tests; BE-2 snapshot hash/read corruption tests. | — |
| [x] | 03.2 | CSV multipart ≤16.000.000 byte, BOM/quotes/newline/header-only/lỗi vị trí | CsvUploadInterceptor, core csv.ts; core + BE-2 HTTP integration. | — |
| [x] | 03.3 | Infer/override toàn cột, giữ CSV gốc | importCsv, DatasetsService, OriginalStorageService; test nguồn byte-for-byte và override. | — |
| [x] | 03.4 | Import V1 + operation/receipt, 3 API đọc, không lộ staged | DatasetsService/Repository, OwnershipGuard; BE-2 read/filter/sort/getRow và sai owner/version. | — |
| [x] | 03.5 | Boundary đọc/publish dùng chung BE-3 | DatasetsService.readSnapshot, AnalysisRepository, SnapshotPublisherService; test BE2↔BE3 codec. | — |
| [x] | 04.1 | Create/list/get/rename/project delete | ProjectsService/Repository; BE-2 HTTP/DB test. | — |
| [x] | 04.2 | Workspace CAS/no-op/stale; GET không ghi workspace | planWorkspacePatch + normalizeWorkspace + replaceOne CAS; integration hai PATCH cạnh tranh. | — |
| [x] | 04.3 | Receipt payload/key, pending Retry-After, lease/CAS/fence | IdempotencyService + ApiExceptionFilter; BE-2 test mất response, takeover/heartbeat/rollback. | — |
| [x] | 04.4 | Candidate ngoài transaction; publish/operation/receipt nguyên tử | SnapshotPublisherService + DatasetsRepository; BE-2 rollback participant, BE-3 concurrent Apply. | — |
| [x] | 04.5 | Delete cascade/resume, ngăn ghi sau delete | AccountCleanupService, StorageWriteBarrier, ProjectsService.recover, ImportRecoveryService; BE-2 race import/delete. | — |
| [ ] | 05.1 | Đủ 27 method, ca đúng/biên/sai và parity online/offline từng method | Đủ nhánh implementation và nhiều core tests; chỉ edit_cell có luồng Preview/Apply HTTP trong BE-3 integration. | Ma trận từng method; test schema-changing methods xuyên HTTP/DB và browser core. |
| [ ] | 05.2 | Preview summary/schemaChanges/diagnostics đúng hợp đồng | Có projection + sample cap/usedStatistics; **F-01 sai updatedCellCount**. | Sửa D21, thêm regression có row thật khi thêm/xóa cột. |
| [x] | 05.3 | engineVersion/specHash do server, TTL 30 phút, no-op/invalid không publish | ProcessingService, preview-policy/read-policy, unit orchestration; integration Apply/replay. | — |
| [ ] | 05.4 | Applied 200, expired 410, purged 404; cleanup/restart an toàn | Có policy/recovery và test unit; integration mới chứng minh applied 200. | Kiểm thử với đồng hồ/DB thật, worker chết và cleanup đồng thời Apply. |
| [x] | 05.5 | Apply chỉ previewId, receipt trước stale, CAS một publish | parseApplyPreview + ProcessingService.apply; DB test same-key + 2 Apply cạnh tranh. | — |
| [x] | 05.6 | Whole-columns, không mutate nguồn, phân biệt ZERO_SPREAD/ZERO_VARIANCE | Core advanced + preview statistics; core tests, immutable published version trong integration. | — |
| [ ] | 05.7 | Mã lỗi/giới hạn theo API đã khóa | **F-02 LAST_COLUMN**, **F-03 ordinal >5000** không khớp. | Sửa engine/DTO và test status/code. |
| [x] | 06.1 | History list; restore tạo version mới; receipt/stale/ownership | HistoryService; BE-3 integration V1→V2→restore V3, replay và sai owner. | — |
| [ ] | 06.2 | Restore summary và đầy đủ biên target/current | Unit kiểm current/stale/unpublished; **F-01 restore summary sai D21**. | Sửa summary; bổ sung HTTP cho sai target/unpublished và restore cạnh tranh. |
| [x] | 06.3 | 5 API analysis đọc published; typed missing/duplicate, Pearson/N/A, histogram/3D | AnalysisService/Repository/calculations; 7 unit tests và BE-3 HTTP 5 endpoint. | — |
| [ ] | 06.4 | Frontend dùng thống kê thống nhất, tải lớn/1000 cột | Chưa có bằng chứng chart frontend và stress toàn luồng; unit distribution 80.000 dòng chỉ chứng minh một phép tính. | Kiểm chi phí correlation/points/preview, RAM/latency và chart integration. |
| [x] | 07.1 | Protocol tạo/upload/map bằng CSV gốc/position/typed data | [be2-sync-contract.md](../teamwork/be2-sync-contract.md), core mapOriginalIds/mapEncodedColumns; core tests. | — |
| [ ] | 07.2 | Tạo project offline → upload → map IDs → replay tuần tự hoàn chỉnh | Replay hiện yêu cầu dataset đã có server ID; helper chưa thành luồng ứng dụng. | Nối import gốc, full typed snapshot, ID/version mapping và checkpoint. |
| [x] | 07.3 | Unknown commit retry nguyên key; stale/account/engine dừng | Replay core, resumeAction, IdempotencyService; 10 replay tests dùng adapter giả, BE-2 mất response create và BE-3 HTTP retries. | — trong phạm vi core/server đã thử. |
| [ ] | 07.4 | IndexedDB bền vững, đóng/mở lại app và tiếp tục sync | Có IndexedDbQueueStore; test replay dùng store/adapter doubles, chưa browser reload thật. | Test persistence và resume sau process/browser restart. |
| [ ] | 07.5 | Offline → mạng/đăng nhập → server → phiên mới đọc; conflict/delete giữ local | Chưa có bằng chứng nghiệm thu chung bắt buộc. | FE-1/FE-2/FE-3 + BE-1/BE-2/BE-3 cùng chạy gate với môi trường test. |

## 4. Bảng kiểm kê 27 API

Tất cả đường dẫn có prefix `/api/v1`. “Có HTTP+DB” nghĩa đã thấy ca thành công với DB bật trong suite liên quan; không đồng nghĩa phủ đủ mọi lỗi/biên. Health là API hạ tầng, không nằm trong tổng 27.

Mã bằng chứng: **I1** = [auth.integration-spec.ts](../../backend/src/test/integration/modules/auth/auth.integration-spec.ts); **I2** = [be2.integration-spec.ts](../../backend/src/test/integration/modules/datasets/be2.integration-spec.ts); **I3** = [be3.integration-spec.ts](../../backend/src/test/integration/modules/processing/be3.integration-spec.ts).

| STT | Method | Route | Implementation | Bằng chứng/giới hạn |
| --- | --- | --- | --- | --- |
| 1 | POST | `/auth/register` | AuthService.register | I1, có HTTP+DB 201/duplicate 409 |
| 2 | POST | `/auth/login` | AuthService.login | I1, có HTTP+DB 200 và sai credential/Origin |
| 3 | POST | `/auth/refresh` | AuthService.refresh | I1, HTTP+DB rotate CAS/expiry |
| 4 | POST | `/auth/logout` | AuthService.logout | I1, HTTP+DB 204/revoke/idempotent |
| 5 | GET | `/users/me` | UsersService.getMe | I1, HTTP+DB projection/session |
| 6 | PATCH | `/users/me` | UsersService.updateMe | I1, HTTP+DB patch/null |
| 7 | DELETE | `/users/me` | UsersService.deleteMe | I1, HTTP+DB cascade/failure/resume |
| 8 | POST | `/projects` | ProjectsService.create | I2, HTTP+DB create/replay/mất response |
| 9 | GET | `/projects` | ProjectsService.list | I2, HTTP+DB sort/lifecycle/page |
| 10 | GET | `/projects/:projectId` | ProjectsService.get | I2, HTTP+DB defaults/owner |
| 11 | PATCH | `/projects/:projectId` | ProjectsService.rename | I2, HTTP+DB rename |
| 12 | PATCH | `/projects/:projectId/workspace` | ProjectsService.saveWorkspace | I2, HTTP+DB no-op/stale/concurrency |
| 13 | DELETE | `/projects/:projectId` | ProjectsService.delete | I2, HTTP+DB 204/503/recovery/race |
| 14 | POST | `/projects/:projectId/datasets` | DatasetsService.importCsv | I2, HTTP+DB multipart/V1/limits |
| 15 | GET | `/datasets/:datasetId/versions/:versionId` | DatasetsService.getVersion | I2, HTTP+DB version/owner |
| 16 | GET | `/datasets/:datasetId/versions/:versionId/rows` | DatasetsService.listRows | I2, HTTP+DB filter/sort/page |
| 17 | GET | `/datasets/:datasetId/versions/:versionId/rows/:rowId` | DatasetsService.getRow | I2, HTTP+DB row độc lập trang |
| 18 | GET | `/datasets/:datasetId/versions/:versionId/analysis/summary` | AnalysisService.summary | I3, HTTP+DB; unit typed counts |
| 19 | GET | `/datasets/:datasetId/versions/:versionId/analysis/columns/:columnId/distribution` | AnalysisService.distribution | I3, HTTP+DB; unit histogram/N/A |
| 20 | GET | `/datasets/:datasetId/versions/:versionId/analysis/correlation` | AnalysisService.correlation | I3, HTTP+DB; unit Pearson |
| 21 | GET | `/datasets/:datasetId/versions/:versionId/analysis/points-3d` | AnalysisService.points3d | I3, HTTP+DB; unit stable-rowid |
| 22 | GET | `/datasets/:datasetId/versions/:versionId/analysis/columns/:columnId/value-counts` | AnalysisService.valueCounts | I3, HTTP+DB; unit counts/missing |
| 23 | POST | `/datasets/:datasetId/previews` | ProcessingService.createPreview | I3, HTTP+DB edit_cell; summary lỗi F-01 |
| 24 | GET | `/datasets/:datasetId/previews/:previewId` | ProcessingService.getPreview | I3, HTTP+DB ready/applied/owner; thiếu expired/purge integration |
| 25 | POST | `/datasets/:datasetId/operations` | ProcessingService.apply | I3, HTTP+DB edit_cell/replay/concurrent Apply |
| 26 | GET | `/datasets/:datasetId/operations` | HistoryService.listOperations | I3, HTTP+DB list/filter; summary chịu ảnh hưởng F-01 |
| 27 | POST | `/datasets/:datasetId/versions/:versionId/restore` | HistoryService.restore | I3, HTTP+DB immutable/replay; summary lỗi F-01 |

Auth/Users vẫn có nhánh trả 501 khi DB bị tắt; các suite DTO có override security và chấp nhận 501/503 chỉ kiểm transport/validation. Bằng chứng nghiệp vụ ở bảng là **integration DB-enabled**, không lấy các assertion scaffold làm nghiệm thu thành công.

## 5. Ma trận 27 phương pháp xử lý

Implementation nằm trong [processing.ts](../../packages/data-core/src/processing.ts) và [processing-advanced.ts](../../packages/data-core/src/processing-advanced.ts). Bộ core có ca phù hợp trong `starter.test.mjs`, `a3-processing.test.mjs`, `a45-advanced.test.mjs`, `be2-be3-compat.test.cjs`, `be3-final-contract-audit.test.mjs`; xem [thư mục test](../../packages/data-core/test).

| Method | Có code | Bằng chứng hiện có | Thiếu để nghiệm thu toàn bộ |
| --- | --- | --- | --- |
| edit_cell | Có | Core + I3 Preview/Get/Apply thật | Bổ sung đầy đủ đúng/biên/sai qua HTTP |
| remove_duplicates | Có | Core + codec compatibility | HTTP publish và offline mapping sau xóa dòng |
| strip_html | Có | Core, script/style/entities | HTTP + ma trận biên/sai |
| normalize_whitespace | Có | Core trim/collapse/remove, missing | HTTP cho các mode |
| uppercase | Có | Core cleaning | HTTP + Unicode/biên/sai |
| lowercase | Có | Core cleaning | HTTP + Unicode/biên/sai |
| replace_value | Có | Core typed exact | HTTP + sai kiểu/no-op |
| convert_number | Có | Core D06/D07 + codec | HTTP + parity browser |
| convert_text | Có | Core canonical | HTTP + biên/sai |
| convert_date | Có | Core date/leap/UTC date | Chốt mâu thuẫn timezone D10 và API, test HTTP |
| convert_datetime | Có | Core timezone/offset/DST | HTTP + parity runtime/browser |
| convert_boolean | Có | Core mapping | HTTP + mapping giao nhau/kiểu |
| fill_mean | Có | Core whole-column/missing | HTTP + fixture shared |
| fill_median | Có | Core interpolation | HTTP + fixture shared |
| fill_mode | Có | Core typed tie-break | HTTP + fixture shared |
| fill_max | Có | Core missing | HTTP + fixture shared |
| fill_constant | Có | Core missing/immutability | HTTP + sai schema/no-op |
| drop_missing_rows | Có | Core any/all + codec | HTTP + ID mapping sau xóa dòng |
| drop_missing_columns | Có | Core any/all + codec | **F-02**, HTTP + summary D21 |
| clip_iqr | Có | Core ZERO_SPREAD/linear quantile | HTTP + fixture shared |
| clip_zscore | Có | Core population std | HTTP + fixture shared |
| scale_minmax | Có | Core range/constant | HTTP + fixture shared |
| standardize | Có | Core population std | HTTP + fixture shared |
| log1p | Có | Core -0.5/≤-1 | HTTP + fixture shared |
| square | Có | Core overflow/immutability | HTTP + fixture shared |
| one_hot | Có | Core D11/D14, category limit, names/lineage/codec | **F-01**, HTTP encoding + mapping nhiều bước |
| ordinal | Có | Core mapping/lineage/codec | **F-03**, HTTP encoding + mapping nhiều bước |

Không đánh dấu đã đủ “đúng/biên/sai cho từng method” chỉ từ việc có một test gọi method. Test dùng chung CJS/ESM chứng minh tái sử dụng core ở mức module; chưa thay thế parity offline qua browser/server thật. D10 trong DTO contract nói datetime→date theo zone, trong khi API `convert_date` chỉ có `inputFormat` và implementation dùng UTC; cần ghi quyết định thống nhất, không tự thêm tham số.

## 6. Sai lệch đã tái hiện và việc còn mở

Các probe thuần đã chạy trực tiếp trên build của commit kiểm tra; không gọi MongoDB hoặc thay đổi dữ liệu. [Script tái hiện](backend-plan-audit-probes.cjs), [kết quả JSON](backend-plan-audit-probes.json).

| ID | Mức độ | Yêu cầu | Thực tế đã xác minh | Vị trí và hướng xử lý |
| --- | --- | --- | --- | --- |
| F-01a | P2 — sai số liệu hợp đồng | D21: updatedCellCount chỉ đếm ô tồn tại ở cả hai bản; cột thêm/xóa có counters riêng | Thêm một cột vào một dòng, ô cũ giữ nguyên: expected 0, actual **1**. | [preview-projection.ts](../../backend/src/modules/processing/preview-projection.ts), dòng 71–79: hợp ID và tăng khi thiếu một phía. Chỉ cộng updatedCellCount trên giao cột/ô; vẫn phản ánh row/schema diff riêng. |
| F-01b | P2 — sai số liệu hợp đồng | D21 áp dụng summary của restore/history | Restore bỏ một cột, ô chung giữ nguyên: expected 0, actual **1**. | [restore-summary.ts](../../backend/src/modules/history/restore-summary.ts), dòng 14–20. Sửa như F-01a, giữ so sánh rawToken trên ô chung. |
| F-02 | P2 — sai mã lỗi | API `drop_missing_columns`: không xóa cột cuối, diagnostic **LAST_COLUMN** | Candidate bị từ chối đúng nhưng code là **EMPTY_SCHEMA_NOT_ALLOWED**. | [processing-advanced.ts](../../packages/data-core/src/processing-advanced.ts), dòng 83. Thống nhất mã với API và sửa regression tests theo hợp đồng. |
| F-03 | P2 — sai HTTP status | API ordinal: mapping >5000 trả **413** | 5001 entry khác nhau, label hữu hạn: parser ném **400 VALIDATION_ERROR**. | [processing.validation.ts](../../backend/src/modules/processing/dto/processing.validation.ts), dòng 70, gọi InputValidator.integer. Tách lỗi giới hạn 413 với lỗi nội dung 400; kiểm HTTP thật. |
| G-01 | P1 — thiếu gate bắt buộc | BE-07 offline→reload→sync→phiên mới | Chưa có luồng create/import/map/UI tích hợp và browser E2E. Replay chỉ dành cho dataset đã gắn ID server. | FE + BE cùng triển khai/kiểm thử. Không đánh dấu toàn kế hoạch done chỉ vì core replay xanh. |
| G-02 | P2 — thiếu bằng chứng | BE-05 mỗi method có đúng/biên/sai và parity | BE-3 integration chỉ dựng specification `edit_cell`. | Thêm ma trận HTTP+DB nhất là one_hot/ordinal/drop rows/drop columns và thống kê. |
| G-03 | P2 — thiếu bằng chứng | D25/recovery/concurrency | Có policy/recovery code, nhưng thiếu integration expired→410/purge→404, crash giữa staging/publish, concurrent restore/delete. | Dùng replica tạm, fake clock/fault injection và assertion không orphan/publish sau delete. |
| G-04 | P2 — tài liệu chưa đồng bộ | README/API/handoff phải phản ánh code mới | architecture.md còn ghi 20 route scaffold; dto-contract.md còn ghi toàn route 501, storage/engine chưa có; link BE-1 kế hoạch trỏ vị trí cũ. | Cập nhật trạng thái, đường dẫn, API/method checklist và thống nhất D10; giữ lịch sử baseline có nhãn thời điểm. |
| G-05 | Chưa xác minh | HTTPS/cookie/browser và môi trường triển khai | Supertest kiểm header cookie; integration dùng MongoDB replica cục bộ, chưa chứng minh trình duyệt HTTPS hoặc Atlas test triển khai. | Chạy môi trường test tích hợp, không suy kết quả local thành đã nghiệm thu deployment. |

P1 ở G-01 phản ánh tính bắt buộc của phạm vi bàn giao, không phải kết luận có lỗ hổng bảo mật. Các lỗi F-01–F-03 được ghi nhận, **chưa sửa** trong lượt lập báo cáo này.

## 7. Bằng chứng kiểm thử và giới hạn

Các suite dưới đây đã chạy thành công trong lượt tích hợp ngay trước audit, trên **cùng commit `b7e33f6`** trong chat này. Source backend/core không thay đổi sau đó; lượt audit đọc lại code/test và chạy thêm 4 probe ở mục 6. Không ghi các suite này là vừa chạy lại sau khi tạo báo cáo; báo cáo là snapshot của commit được nêu.

| Lệnh/bộ kiểm tra | Kết quả quan sát | Phạm vi |
| --- | --- | --- |
| `npm ci --ignore-scripts --no-audit --no-fund` | Thành công, 751 packages | Dependency theo lockfile lúc tích hợp |
| `npm run lint` | PASS | ESLint toàn repo |
| `npm run typecheck` | PASS | Backend/frontend/core + frontend architecture |
| `npm run build` | PASS | Backend/frontend; backend prebuild core CJS/ESM |
| `npm run test:unit` — core | **70/70 PASS** | Parser/codec/query/methods/sync helpers/parity module |
| `npm run test:unit` — backend | **54/54 PASS**, 23 suites | DTO/domain/orchestration/analysis/history/storage |
| `npm run test:offline -w frontend` | **10/10 PASS** | Replay với adapters/store doubles |
| `npm run test:e2e:backend` | **49/49 PASS**, 3 suites | Có suite DTO với security override/DB-disabled; không phải toàn bộ nghiệp vụ thật |
| `npm run test:integration:local -w backend` — BE-2 | **17/17 PASS** | HTTP + MongoDB + filesystem, publish/retry/recovery |
| Cùng runner — Auth | **9/9 PASS** | HTTP + DB auth/users/session/ownership/delete |
| Cùng runner — Database | **42/42 PASS** | Validator/index/BSON/transaction |
| Cùng runner — Database health | **1/1 PASS** | Ping và disconnect |
| Cùng runner — BE-3 | **6/6 PASS** | edit_cell Preview/Apply, History/Restore, 5 Analysis, concurrent Apply |
| `node docs/reports/backend-plan-audit-probes.cjs` | **4/4 trường hợp lệch hợp đồng đã tái hiện** | expected/actual trong JSON; probe in kết quả, exit 0 không mang nghĩa mọi assertion đạt |

Tổng suite hồi quy đã quan sát: **258 test PASS**, gồm 75 integration test. Số này không bao gồm 4 probe lệch hợp đồng. Có test xanh không đồng nghĩa hoàn tất plan: bộ test hiện có chưa phát hiện các input đã dùng trong probe.

Muốn chạy lại probe sau sửa:

```powershell
npm run build -w backend
node docs/reports/backend-plan-audit-probes.cjs
```

Đối với integration, dùng runner replica tạm `npm run test:integration:local -w backend`; runner provision/verify schema và tự dừng replica. Không chạy trực tiếp bộ test ghi dữ liệu lên URI Atlas người dùng. Chưa chạy frontend E2E/browser offline trong lượt audit này, chưa đánh giá stress/security tuyệt đối hay độ bền của môi trường production.

## 8. Checklist nghiệm thu cuối theo phần 7 kế hoạch

| Hoàn tất | Điều kiện nghiệm thu | Kết luận hiện tại |
| --- | --- | --- |
| [x] | Đủ 27 API, từng API có fixture/test và trạng thái | Đã có implementation + ca HTTP/DB thành công; xem mục 4. Chưa có nghĩa mọi contract đều đúng. |
| [x] | Không nghiệm thu route bằng input đúng trả 501 | Có integration DB-enabled nghiệp vụ. Giữ test scaffold tách riêng, ghi rõ override. |
| [ ] | Unit + DB-enabled HTTP, concurrency/rollback, cross-owner đầy đủ | Có coverage nền đáng kể; còn ma trận methods, expired/cleanup/crash và concurrent restore/delete. |
| [ ] | Lint/typecheck/unit/backend E2E/build và frontend DB-enabled E2E | Gate backend đã PASS; frontend nghiệp vụ DB-enabled/offline E2E chưa có bằng chứng trên bản tích hợp. |
| [x] | Verify/schema + database integration, fixture cleanup đúng phạm vi | Runner replica tạm provision/verify + test cleanup/rollback đã PASS. Không đại diện Atlas triển khai. |
| [ ] | Sync mất mạng/resume/conflict/delete/mapping có bằng chứng | Core/server từng phần có test; G-01 còn mở. |
| [ ] | README/module/API/protocol/env/scripts/giới hạn cập nhật | Nhiều handoff/env/script có; còn G-04 và F-02/F-03. |
| [ ] | Bàn giao commit/provision/lệnh chạy/lỗi còn lại và nghiệm thu cuối | Có commit và tài liệu; cần sửa lỗi, chốt test tích hợp và commit báo cáo chung. Credentials qua kênh riêng không được xác minh trong audit. |

## 9. Thứ tự xử lý đề xuất

| Ưu tiên | Công việc có thể giao | Chủ trì | Bằng chứng đóng việc |
| --- | --- | --- | --- |
| 1 | Sửa F-01a/b, F-02, F-03 và regression theo hợp đồng | BE-3; BE-1 review HTTP/DTO | 4 probe trở về expected; core/unit/HTTP test cho các ca lỗi mới |
| 2 | Chốt D10, cập nhật tài liệu G-04, ma trận 27 method | BE-1 + BE-3 | API/DTO/code thống nhất, link hợp lệ, không còn tuyên bố scaffold sai thời điểm |
| 3 | Chạy G-02/G-03 trên replica tạm | BE-2 + BE-3, BE-1 hỗ trợ quyền/delete | Log đúng/biên/sai từng method; expiry/crash/concurrency không tạo orphan/version/history trùng |
| 4 | Nối create/import/map/outbox/engine với frontend và gate BE-07 | FE-1/2/3 + BE-1/2/3 | Browser offline/reload/resume, ngắt response sau commit, conflict/delete/account mismatch, phiên mới đọc đúng server |
| 5 | Nghiệm thu HTTPS/cookie và môi trường test triển khai, chốt commit bàn giao | BE-1 + FE-1 + trưởng nhóm | Log browser auth/refresh/logout, setup/provision/restore rõ ràng, danh sách giới hạn còn lại được xác nhận |

Chỉ đánh dấu hoàn thành toàn bộ kế hoạch khi các lỗi hợp đồng đã được xử lý và gate offline bắt buộc có bằng chứng. Không cần merge vào `main` để tiếp tục hoàn thiện và nghiệm thu trên `dev-backend`.
