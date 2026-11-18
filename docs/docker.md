# Chạy Dashboard 3D bằng Docker

Yêu cầu Docker Desktop đang chạy Linux containers. Các lệnh dưới đây chạy tại thư mục gốc dự án. Không cần cài Node.js hoặc MongoDB trên máy host.

## Khởi động

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/init-docker.ps1
docker compose up -d --build --wait --wait-timeout 180
```

Mở **https://localhost:8443**. HTTP http://localhost:18080 chuyển sang địa chỉ HTTPS này. Caddy tạo chứng chỉ nội bộ; trình duyệt sẽ cảnh báo cho đến khi máy tin cậy CA của Caddy. Chỉ tiếp tục cảnh báo khi đang truy cập localhost của chính bạn. Cookie đăng nhập vẫn giữ Secure/HttpOnly. Để dùng service worker/offline đầy đủ, cần tin cậy CA trong hệ điều hành và khởi động lại trình duyệt.

Xuất CA để kiểm tra và cài thủ công vào kho Trusted Root Certification Authorities của người dùng Windows nếu muốn:

```powershell
docker compose cp web:/data/caddy/pki/authorities/local/root.crt ./docker/local-root.crt
```

Đây là CA phát triển cục bộ; không cài CA này cho website Internet. Kho CA thuộc volume `caddy-data`; tạo lại volume sẽ tạo CA khác. Không commit khóa riêng hoặc secret.

Lần đầu MongoDB tự tạo replica set `rs0`; dịch vụ `db-init` tạo và kiểm tra 12 collection/validator cùng index trước khi backend chạy. `db-init` kết thúc với mã 0 là bình thường. Database này **mới và độc lập với Atlas**: hãy đăng ký tài khoản mới. Không nhập credentials từ `backend/.env` hoặc `atlas-credentials.env` vào image.

`.env.docker` chứa khóa xác thực ngẫu nhiên, do script tạo và Git/Docker bỏ qua. Script giữ nguyên file nếu đã có. Giữ file này khi restart để không làm mất hiệu lực phiên đăng nhập. Không gửi file này cho người khác.

## AI Ollama tùy chọn

Bản mặc định tắt gợi ý AI; các chức năng xử lý thủ công vẫn hoạt động. Muốn chạy cả Ollama và tự tải `qwen3:4b`:

```powershell
docker compose --profile ai -f compose.yaml -f compose.ai.yaml up -d --build --wait --wait-timeout 1800
```

Lần đầu tải model vài GB, cần Internet và đủ RAM/dung lượng. Backend chỉ bật AI sau khi `ollama-init` tải thành công; nếu tải lỗi, xem `docker compose --profile ai logs ollama-init`. Đây là cấu hình CPU; chưa cấu hình GPU. Kho model giữ trong volume `ollama-data`. Khi quản lý bản AI, tiếp tục dùng cùng `--profile ai -f compose.yaml -f compose.ai.yaml` trong các lệnh Compose. Bộ mặc định đã chạy thử riêng; việc tải model và tốc độ inference phải kiểm tra trên máy triển khai.

`AI_OLLAMA_ALLOWED_HOSTS=ollama` cho phép đúng hostname nội bộ này. URL/model chỉ lấy từ cấu hình backend, không từ request của trình duyệt. Ollama và MongoDB không có cổng public.

## Quản lý

Kiểm tra trình duyệt sau khi khởi động (cần dependency npm và Chromium của Playwright hoặc Chrome/Edge đã cài):

```powershell
$env:DOCKER_SMOKE_CHANNEL = 'msedge' # hoặc chrome; bỏ biến để dùng Chromium của Playwright
node scripts/smoke-docker.mjs
```

Script chỉ truy cập localhost:8443, bỏ qua chứng chỉ tự ký trong context kiểm thử, tạo tài khoản/project/CSV tạm và xóa qua API sau khi kiểm tra.

```powershell
docker compose ps -a
docker compose logs --tail 100 backend web db-init
docker compose stop
docker compose start
# Khi cập nhật source:
docker compose up -d --build --wait --wait-timeout 180
# Gỡ container nhưng giữ dữ liệu:
docker compose down
```

Volume `mongo-data` lưu database; `originals` lưu CSV gốc; `caddy-data` lưu chứng chỉ; `ollama-data` lưu model. `docker compose down -v` sẽ xóa dữ liệu trong các volume của cấu hình đang dùng; không dùng nếu muốn giữ dữ liệu. Cần backup cả MongoDB và CSV gốc trước khi di chuyển máy.

## Chia sẻ link Internet

Cấu hình này chỉ xuất cổng trên loopback của máy bạn. Để người khác dùng qua Internet, triển khai trên server, cấu hình tên miền và HTTPS công khai, sửa `FRONTEND_ORIGIN`, Caddyfile và port binding tương ứng. MongoDB/Ollama tiếp tục chỉ dùng mạng nội bộ. Cấu hình hiện tại dành cho chạy cục bộ; chưa có xác thực MongoDB, backup tự động hoặc giới hạn tài nguyên cho môi trường public.
