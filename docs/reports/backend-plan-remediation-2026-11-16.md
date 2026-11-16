# Kết quả xử lý checklist backend và offline — 16/11/2026

Đã xử lý lỗi hợp đồng, bổ sung nghiệm thu backend và nối luồng frontend offline trên `dev-backend`. Các gate cục bộ đã qua; **chưa tuyên bố nghiệm thu môi trường triển khai**. Người dùng đã chọn dùng kết quả HTTPS + MongoDB cục bộ trước.

Phạm vi là working tree dựa trên `b7e33f6`, engine hiện tại `data-core-unified-0.6.0`. Chưa tạo commit/push hoặc merge vào `main`. Giữ nguyên việc người dùng chuyển BE-1 handoff sang `docs/teamwork`; không lấy hoặc sửa các stash frontend có sẵn.

## 1. Công việc đề xuất và trạng thái mới

| Hoàn tất | Hạng mục từ checklist | Kết quả/bằng chứng |
| --- | --- | --- |
| [x] | F-01a — D21 Preview | Chỉ đếm ô có ở cả hai bản; cột thêm/xóa vẫn thể hiện row/schema diff. Regression có dòng thật, probe expected 0/actual 0. |
| [x] | F-01b — D21 Restore | Sửa tương tự Preview; giữ so sánh rawToken của ô chung. Probe expected 0/actual 0. |
| [x] | F-02 — LAST_COLUMN | Engine trả đúng `LAST_COLUMN`; core + HTTP/DB kiểm diagnostic và không publish. |
| [x] | F-03 — ordinal limit | Mapping >5000 trả `413 LIMIT_EXCEEDED`; lỗi nội dung vẫn 400. Probe và HTTP/DB đều qua. |
| [x] | G-02 — ma trận 27 method | Cùng [fixture JSON](../../packages/data-core/fixtures/processing-acceptance.json) cho backend HTTP/DB và browser offline. Mỗi method có success/Apply, invalid parameters không publish và biên header-only. Browser xử lý offline rồi đối chiếu toàn snapshot đã publish, đủ 27 method. |
| [x] | G-03 — expiry/recovery/races | Kiểm 410 trước purge, 404 sau purge, expired Apply cạnh tranh cleanup, orphan candidate cleanup, retry sau lỗi publish, receipt sau purge, concurrent restore, Apply cạnh tranh xóa project/account. |
| [x] | G-04 — tài liệu và D10 | Cập nhật architecture/DTO/README và link BE-1; `convert_date` V1 lấy ngày UTC theo API không có timezone; `convert_datetime` giữ timezone chọn. Không thêm field API mới. |
| [x] | G-01 — nối offline ứng dụng | Trang `/offline`: auth, CSV nguồn, typed snapshot, lịch sử local, restore, IndexedDB, create/import/ID mapping/replay/checkpoint. Gate browser thật mất mạng/reload → sync → đọc từ phiên mới đã qua. |
| [x] | G-05 — HTTPS/cookie cục bộ | Chromium gửi/rotate/clear refresh cookie Secure/HttpOnly/Lax đúng path qua HTTPS reverse proxy cục bộ với backend/DB thật. |
| [ ] | G-05 — môi trường triển khai | Chưa chạy trên URL HTTPS/MongoDB test đã triển khai. Người dùng chọn nghiệm thu cục bộ trước; cần kiểm khi có môi trường đó. |

Các ca mới có thể phát hiện lỗi ngoài 4 probe ban đầu. Không dùng số test để khẳng định không còn bug hoặc coi ma trận này là kiểm thử mọi tổ hợp tham số.

## 2. Lỗi bổ sung phát hiện trong lúc nghiệm thu

| Vấn đề | Cách xử lý | Kiểm chứng |
| --- | --- | --- |
| `Math.log1p` giữa Chromium và Node có thể lệch bit cuối, làm typed equality từ chối snapshot đã đồng bộ | Thêm `deterministicLog1p` bằng phép toán IEEE trong core, kiểm cancellation/subnormal/domain và tăng engineVersion 0.5.0 → 0.6.0. Không nới typed equality hay làm tròn snapshot để che sai khác. | Core test độ chính xác + browser/server fixture `log1p`; ma trận đủ 27 method qua. |
| Preview pagination có thể overflow `page * limit` dù page là safe integer | Count trước; trang vượt tổng trả rỗng mà không truyền skip vượt safe integer cho driver. | 12.000 change records, trang đầu/cuối, page=Number.MAX_SAFE_INTEGER đều đúng. |
| Hai cấu hình Playwright dùng cùng output directory có thể xóa trace của nhau | Tách `test-results/health` và `test-results/acceptance`. | E2E cũ và acceptance có kết quả riêng. |
| Service Worker trên chứng chỉ tự ký không hoạt động chỉ với ignoreHTTPSErrors | Runner tính fingerprint SPKI của chứng chỉ tạm, chỉ truyền fingerprint đó vào Chromium test. Không bỏ kiểm TLS của backend/runtime. | Reload app shell khi offline trên HTTPS test. |

EngineVersion mới cố ý làm queue từ engine cũ dừng với lỗi không khớp phiên bản. Không tự gán nhãn engine mới cho lịch sử offline cũ; cần review/tạo lại các thao tác từ CSV gốc nếu gặp trường hợp đó.

## 3. Frontend offline đã triển khai

| Thành phần | Trách nhiệm |
| --- | --- |
| [project-store.ts](../../frontend/src/features/offline/project-store.ts) | IndexedDB giữ CSV bytes/hash, snapshot gốc/current, operations, stable keys, tài khoản đích, mapping và cursor. Không lưu access/refresh token. Web Locks tuần tự hóa thao tác cùng project giữa các tab. |
| [project-sync.ts](../../frontend/src/features/offline/project-sync.ts) | Xác minh user; create project, upload CSV gốc; đọc đầy đủ các trang; map IDs bằng source hash/position/schema/typed cells và lineage; replay Preview/Apply/restore; chỉ checkpoint khi xác minh server head và nội dung. |
| [OfflineWorkspace.tsx](../../frontend/src/features/offline/pages/OfflineWorkspace.tsx) | UI đăng ký/login/refresh/logout/delete account, import offline, 27 method, bảng local, lịch sử/restore và trạng thái sync có lỗi rõ ràng. Tham số nâng cao dùng JSON theo contract; không thay cho toàn bộ UI chuyên sâu của nhóm frontend. |
| [offline-worker.js](../../frontend/public/offline-worker.js) | Cache app shell/assets để mở lại offline sau lần mở online đầu tiên. Không cache API hoặc credentials. |
| [test-browser-local.cjs](../../backend/scripts/test-browser-local.cjs) | Replica MongoDB riêng, provision/verify, backend thật, HTTPS reverse proxy/static server, chứng chỉ tạm, Chromium acceptance và cleanup. Kiểm tra cổng trước khi chạy. |

Quy tắc retry: create/import/Preview/Apply/restore giữ nguyên key/payload khi chưa rõ commit. Với Apply đã gửi, replay receipt trước stale-head check. Chỉ đổi preview attempt/key khi reply terminal 404/410 của Apply cũ xác nhận không commit và server head vẫn đúng. Sai tài khoản, resource bị xóa, engine mismatch hoặc stale version dừng và giữ local; không tự tạo project thay thế/overwrite. Quyền vẫn do backend xác minh, không tin accountId local.

Restore offline lưu target theo lịch sử local và giải ra version server đã được receipt xác nhận. Encoding kiểm UUID mapping, source lineage và category; không đoán từ tên cột. Các checkpoint sau publish chứa cursor, mapping, confirmed version cùng một bản ghi IndexedDB.

## 4. Ma trận gate đã chạy

| Gate | Lệnh | Kết quả |
| --- | --- | --- |
| Lint | `npm run lint` | PASS |
| Kiểu/kiến trúc | `npm run typecheck` | PASS backend/frontend/core và chiều import frontend |
| Build | `npm run build` | PASS; cũng chạy trong acceptance |
| Core | `npm run test -w @dashboard/data-core` | **71/71 PASS**, gồm deterministic log1p |
| Backend unit | `npm run test:unit -w backend` | **58/58 PASS**, 24 suites |
| Offline replay core | `npm run test:offline -w frontend` | **10/10 PASS** |
| HTTP E2E backend | `npm run test:e2e:backend` | **49/49 PASS** |
| Health/router browser | `npm run test:e2e:frontend` | **4/4 PASS** |
| Integration nền BE-2/Auth/DB/Health/BE-3 | `npm run test:integration:local -w backend` | **75/75 PASS** trên replica tạm |
| Method matrix + lifecycle/capacity integration | `npm run test:integration:local -w backend -- --only=method-matrix` | **62/62 PASS** trên bản mở rộng cuối |
| Browser HTTPS nghiệp vụ/offline | `npm run test:acceptance -w frontend` | **5/5 PASS**, gate cuối bao gồm loop 27 method |
| Probe 4 lỗi ban đầu | `node docs/reports/backend-plan-audit-probes.cjs` | **4/4 khớp contract**, [JSON](backend-plan-audit-probes.json) |

Tổng test riêng biệt đã quan sát: **334 PASS**, không cộng các lượt chạy lại; thêm 4 probe khớp contract. Bộ integration nền đã qua cùng lượt xử lý; sau mở rộng tests/engine, matrix 62 ca được chạy lại riêng. Không tuyên bố tất cả các suite này nằm trong một invocation duy nhất hoặc chạy trên Atlas triển khai.

Chi tiết gate browser:

| Test | Bằng chứng |
| --- | --- |
| Offline/reload/restore/new session | CSV và 2 thao tác (trim + one-hot) tồn tại sau reload offline; upload/map/Apply; mất response sau commit Apply rồi retry không nhân đôi; restore offline, mất response Restore rồi retry; browser context mới đọc được rows/history từ API. |
| Create/import response loss | Ngắt response sau khi server đã tạo project/import; reload/refresh rồi retry giữ key; cuối cùng chỉ một project và một import operation. |
| Account/delete | Sai account dừng, không chuyển bản offline; project bị xóa dừng; xóa account qua UI xóa token trong bộ nhớ và giữ bản offline. |
| Conflict | Một phiên khác đổi server head; sync dừng `BASE_VERSION_STALE`, bảng local vẫn còn. |
| 27 method parity | Cùng fixture với integration backend; mỗi method chạy thật trong browser khi offline rồi publish qua HTTP/DB và so typed snapshot/ID mapping. |

Kiểm capacity chỉ chứng minh các workload đã chạy: correlation 1.000 cột × 8 dòng, stable sampling 50.000 dòng, distribution 80.000 dòng ở suite có sẵn, phân trang preview 12.000 thay đổi. Không suy thành benchmark SLA, stress nhiều người dùng hay bảo đảm correlation 1.000 cột trên mọi dataset cực lớn.

## 5. Lệnh tái hiện từ checkout này

```powershell
npm ci --ignore-scripts --no-audit --no-fund
npm run test:e2e:install -w frontend   # nếu máy chưa có Chromium
npm run lint
npm run typecheck
npm run test:unit
npm run test:offline -w frontend
npm run test:integration:local -w backend
npm run test:e2e
npm run test:acceptance -w frontend
npm run build
node docs/reports/backend-plan-audit-probes.cjs
```

Acceptance cần OpenSSL trong PATH hoặc `OPENSSL_BIN`; dùng cổng 4174/4310, chứng chỉ một ngày và original-storage tạm. Runner tạo secret trong bộ nhớ và không dùng MongoDB URI đang cấu hình của người dùng. Binary MongoDB 8.0.16 được cache tại `backend/storage/test-binaries` (đã gitignore). Chạy các build/gate lần lượt để không ghi lại `dist` khi browser khác đang đọc assets. Không cài chứng chỉ vào trust store hệ điều hành.

Kết quả/trace nằm trong `frontend/test-results/acceptance` hoặc `health`, đã gitignore. Không đưa token, mật khẩu, URI hay dữ liệu test vào Git. Không cần endpoint bulk-sync mới hoặc migration đổi schema để chạy thay đổi này.

## 6. Những phần không đánh dấu hoàn thành toàn bộ sản phẩm

- Nghiệm thu URL HTTPS/Atlas test đã triển khai, reverse proxy thực, multi-instance rate limit và performance trên tải thực chưa chạy; người dùng đã chọn dùng kết quả cục bộ trước.
- Màn hình `/offline` là luồng tích hợp chức năng, không thay các màn hình dashboard/3D/charts chuyên sâu và UX của nhóm frontend.
- Fault injection, durable cleanup/recovery và các race được kiểm trên local replica. Chưa chạy ma trận SIGKILL tại mọi điểm commit, multi-node failover, mọi trình duyệt hoặc mọi tổ hợp tham số của 27 method.
- Chưa chốt commit bàn giao/push hoặc thực hiện review/đồng thuận thay mặt các thành viên. Source và báo cáo đang ở working tree để người dùng review.

Trong phạm vi checkout và nghiệm thu cục bộ đã thống nhất, các công việc sửa lỗi, bổ sung gate, nối offline và cập nhật tài liệu đã thực hiện. Việc đánh dấu hoàn thành toàn bộ kế hoạch/sản phẩm vẫn phải giữ rõ các giới hạn trên.
