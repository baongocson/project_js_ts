# Kiểm thử frontend

Giao diện theo `frontend_mau`: `reference-workspace.spec.ts` kiểm8tab, nhóm method, WebGL lần đầu khi offline, pin/projection/drag/reset, preview toàn chiều rộng và Hủy, History/tab persistence, pagination/mobile và renderer fallback khi chunk3D không tải được. `workspace-navigation.ts` chỉ hỗ trợ các bài test đi qua tab thật; không thay API/engine hoặc tạo thành công giả. Chạy riêng bằng `npm run test:acceptance -w frontend -- reference-workspace.spec.ts` từ gốc.

| Bộ | Lệnh từ gốc | Phạm vi |
| --- | --- | --- |
| Unit | `npm run test:unit -w frontend` | Transport/session/owner fence, spec/form boundary, preview reconstruction, full-snapshot analysis, backup/draft/coordinator; Node runner + esbuild |
| Pure replay | `npm run test:offline -w frontend` | Queue/receipt/dependency retry fixtures, không cần MongoDB |
| Health/router | `npm run test:e2e:frontend` | `test/E2E`, backend thật DB-disabled, cổng 4300/4173; không thay nghiệm thu nghiệp vụ |
| Nghiệp vụ | `npm run test:acceptance -w frontend` | `test/acceptance`, HTTPS + Nest + MongoDB replica tạm, cổng 4310/4174; online/offline/reload/sync, 27 typed forms + sửa ô trực tiếp từ điểm3D, TF-IDF/boxplot/global flags, receipt/conflict/quota/recovery và account lifecycle |

`npm run test:e2e:install -w frontend` cài Chromium lần đầu. Acceptance build backend/core/frontend, tạo secret/chứng chỉ trong môi trường tạm, provision DB riêng và cleanup; không dùng URI MongoDB cấu hình cá nhân. Cần OpenSSL hoặc OPENSSL_BIN; binary MongoDB được cache vào backend/storage/test-binaries (gitignore). Không chạy nhiều runner hoặc build đồng thời khi browser đang đọc dist.

Dùng `npm run test:acceptance -w frontend -- --grep "account"` để chạy gate hẹp. Sau build đã thành công có thể chạy `node backend/scripts/test-browser-local.cjs --grep "account"`; phải chắc source chưa đổi. Test mô phỏng lỗi bằng page.route/IDB fault injection, còn ca thành công đi qua backend/DB thật. Không mô phỏng thành công để coi sync đã hoàn tất.

Typecheck kiểm cả source và test; `npm run lint` kiểm toàn repo. Artifact/trace nằm ở test-results/acceptance hoặc health và được gitignore. Ảnh/trace hỗ trợ QA, không suy test local thành production/Atlas, multi-browser hoặc benchmark.
