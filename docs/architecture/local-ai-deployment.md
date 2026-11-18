# Sử dụng AI trong team và kế hoạch đóng gói Docker

Cập nhật ngày **18/11/2026**: đã bổ sung Dockerfile, Compose, MongoDB replica set và chế độ Ollama tùy chọn. Hướng dẫn chạy hiện hành ở [Docker](../docker.md). Các phần “Kế hoạch Docker Compose” và “Tiêu chí nghiệm thu” bên dưới được giữ làm kế hoạch/tiêu chí ban đầu, không phải mô tả trạng thái cấu hình hiện tại. Validator nay cho phép hostname nội bộ do người vận hành chỉ định bằng `AI_OLLAMA_ALLOWED_HOSTS`; mặc định vẫn chỉ nhận loopback.

## Trạng thái hiện tại

| Cách sử dụng | Trạng thái và điều kiện |
| --- | --- |
| Mỗi thành viên chạy ứng dụng và AI trên máy Windows riêng | Có script thiết lập; mỗi máy cần tải runtime/model và cấu hình ứng dụng/database riêng. Đã kiểm chứng trên máy phát triển hiện tại, chưa nghiệm thu trên mọi máy của team. |
| Team mở website trên một server chung | Kiến trúc cho phép backend gọi Ollama cùng máy qua loopback; cần triển khai, cấu hình và nghiệm thu server thực tế. Người dùng trình duyệt không cần cài mô hình. |
| Backend và Ollama ở các container Compose riêng | Đã có cấu hình trong repository, volume model và bước tải model trước khi bật AI. Xem [Docker](../docker.md); kiểm thử model thật/CPU/GPU và nhiều người dùng vẫn cần thực hiện trên máy triển khai. |

“AI local” là mô hình tự chạy trong môi trường của backend, không phải bắt buộc chạy trên máy của từng người mở trình duyệt. Với server chung, thống kê dataset được xử lý bởi mô hình trên server đó. Backend chỉ gửi evidence thống kê/phương pháp ứng viên, không gửi tên cột hoặc nội dung ô tới Ollama. Dataset local trong IndexedDB vẫn chưa hỗ trợ gợi ý AI.

## Thành viên chạy riêng trên Windows

1. Clone đầy đủ mã nguồn được bàn giao, gồm `scripts/` và module AI. Cài Node/npm theo [README](../../README.md), chạy `npm install` và thiết lập ứng dụng/database theo hướng dẫn của dự án. Không sao chép `.env` chứa thông tin riêng của thành viên khác.
2. Từ thư mục gốc, chạy các lệnh dưới đây. Chỉ cần Internet khi tải/cập nhật dependency, runtime và model; việc inference dùng Ollama local.

```powershell
npm run ai:setup
npm run ai:check
npm run dev:ai
```

`ai:setup` tải Ollama portable Windows và `qwen3:4b`; `ai:check` build backend và kiểm thử service với dữ liệu tổng hợp, không cần database. Chỉ `ai:check` thành công chưa chứng minh toàn bộ ứng dụng online đã được cấu hình: đăng nhập, database và dataset vẫn có yêu cầu riêng. Mở dataset online, chọn tab xử lý và bấm **Phân tích toàn bộ dataset** để kiểm tra luồng thực tế.

Runtime, model và log đặt tại `.artifact-work/ollama/`, đã bị Git bỏ qua. Clone/pull chỉ nhận mã nguồn, không tự nhận mô hình. Mỗi máy cần tải riêng; đủ dung lượng cho cả runtime và model, không chỉ tệp model khoảng 2,5 GB. RAM/VRAM và tốc độ phụ thuộc cấu hình, ngữ cảnh và tải máy; các thời gian đo trên một máy không phải cam kết cho cả team.

Nếu Ollama đã chạy ở `127.0.0.1:11434`, script dùng dịch vụ đó và không thay cấu hình hiện có. Model nằm ở kho của dịch vụ đang chạy; kiểm bằng `ai:check`. Các lệnh `ai:setup`, `ai:start`, `dev:ai` hiện dùng PowerShell/portable Windows; chưa có script tương đương cho Linux/macOS hoặc container Linux. Không đưa các lệnh này nguyên trạng vào image Linux.

## Team dùng một server chung

Người vận hành cài ứng dụng, database và Ollama trên server, tải `qwen3:4b` một lần và quản lý tài nguyên tại server. Nếu backend chạy trực tiếp cùng máy với Ollama, địa chỉ mặc định `http://127.0.0.1:11434` phù hợp với validator hiện có. Không suy ra rằng backend trong container sẽ gọi được Ollama trên host qua cùng địa chỉ này.

Thành viên chỉ truy cập website, đăng nhập bằng tài khoản được cấp và thao tác trên dataset mình sở hữu. Quyền truy cập dataset/version vẫn được kiểm tại backend; việc dùng chung mô hình không cấp quyền đọc dataset của người khác. Thiết lập HTTPS, cookie/CORS, database replica set và vận hành theo [hướng dẫn dự án](../../README.md) và [database](../database/database.md).

Backend hiện cho một inference đang chạy mỗi process; yêu cầu trùng thời điểm có thể nhận `AI_BUSY`. Đây chưa phải hàng đợi công bằng cho nhiều người dùng. Chạy nhiều backend replica không tự tạo giới hạn dùng chung cho Ollama; cần đánh giá hàng đợi, điều phối, timeout và tải mô hình trước khi tăng số người sử dụng. Bật hoặc tắt AI bằng `AI_ENABLED`; khi AI không khả dụng, xử lý thủ công vẫn dùng được.

## Kế hoạch Docker Compose — chưa triển khai

Phương án đề xuất tách frontend/reverse proxy, backend, MongoDB và Ollama thành các dịch vụ riêng. Khởi tạo model là bước có kiểm tra kết quả trước khi cho dùng gợi ý. Chưa có lệnh `docker compose up` đã được nghiệm thu trong repository.

### Địa chỉ kết nối

Trong container backend, `127.0.0.1` trỏ về chính container backend. Nếu Ollama nằm trong container khác, backend cần gọi hostname dịch vụ trên mạng nội bộ Compose. Ví dụ mục tiêu cấu hình:

```dotenv
# MỤC TIÊU SAU KHI SỬA VALIDATOR; hiện tại sẽ bị từ chối khi backend khởi động.
AI_OLLAMA_URL=http://ollama:11434
AI_MODEL=qwen3:4b
```

Validator ở [environment.ts](../../backend/src/config/environment.ts) hiện chỉ chấp nhận origin HTTP loopback (`localhost`, `127.0.0.1`, `[::1]`). Cần mở rộng có kiểm soát cho địa chỉ nội bộ triển khai được chỉ định bởi người vận hành và cập nhật test. Không nhận URL/model tùy ý từ request của người dùng. Cấu hình kết nối chỉ ở backend; frontend tiếp tục gọi API của ứng dụng, không gọi trực tiếp Ollama.

### Các hạng mục cần thực hiện trước khi bàn giao

| Hạng mục | Kết quả cần có |
| --- | --- |
| Image và Compose | Build/run frontend/backend, cấu hình mạng nội bộ, biến môi trường và database theo yêu cầu dự án; không dùng script Windows trong image Linux. |
| Runtime/model | Chọn, cố định và kiểm chứng phiên bản image Ollama phù hợp; tải `qwen3:4b` bằng bước khởi tạo tương đương `ollama pull qwen3:4b`; phát hiện lỗi tải hoặc thiếu model. |
| Volume | Lưu kho model trong volume bền vững để restart/recreate không tải lại khi volume còn nguyên. Volume model độc lập với dữ liệu/backup MongoDB và không làm đổi ERD. |
| Sẵn sàng và phục hồi | Kiểm tra Ollama đã phục vụ API và có model cần dùng; chỉ mở được cổng chưa chứng minh model sẵn sàng. Có trạng thái khởi tạo/lỗi rõ ràng và khôi phục sau restart. |
| CPU/GPU | Chuẩn bị cấu hình CPU hoặc GPU phù hợp môi trường đích; nghiệm thu khả năng nhận GPU thực tế. Đóng gói Docker không tự bảo đảm có GPU hay cùng tốc độ với máy phát triển. |
| Kết nối | Cho phép origin nội bộ đã cấu hình trong validator, kiểm backend gọi được Ollama trong mạng container. |
| Nhiều người dùng | Đo tải và xác định có cần hàng đợi/điều phối chung; giữ rõ hành vi `AI_BUSY`, timeout từng lượt và hủy request. |
| Quyền truy cập | Chỉ đưa dịch vụ ứng dụng ra ngoài theo nhu cầu; giữ Ollama trong mạng nội bộ, không công khai API Ollama cho trình duyệt. Quản lý secrets riêng với image/Git. |
| Bàn giao | Hướng dẫn lần chạy đầu, thời gian tải, dung lượng, cập nhật phiên bản, khởi động lại và cách giữ/xóa volume model. |

Không cần API key cloud khi inference bằng mô hình local đã tải. Mô hình miễn phí không đồng nghĩa hạ tầng miễn phí: người vận hành chịu tài nguyên máy/server, điện và chi phí thuê hạ tầng nếu có. Khi phân phối kèm runtime/model hoặc xây image có sẵn model, cần giữ thông tin giấy phép của các thành phần; xem [nguồn mô hình và giấy phép](local-ai.md).

## Tiêu chí nghiệm thu môi trường bàn giao

Đây là tiêu chí cho lần triển khai Docker/server, chưa phải kết quả đã đạt:

- Máy mới nhận đầy đủ mã nguồn, thiết lập thành công mà không phụ thuộc `.artifact-work` từ máy tác giả.
- Lần đầu tải được model; lần sau tái sử dụng kho model khi volume còn nguyên; thiếu model hoặc lỗi mạng được thông báo rõ.
- Backend khởi động với địa chỉ Ollama của môi trường và gọi mô hình thật thành công; CPU/GPU được xác nhận trên máy đích.
- Trình duyệt dùng AI trên dataset online mà không cần Ollama trên máy người dùng khi truy cập server chung.
- AI rà soát mọi cột theo tab; Preview chưa đổi dữ liệu và Apply vẫn do người dùng quyết định; auth/ownership được giữ nguyên.
- Ollama dừng, timeout, hủy hoặc bận không chặn xử lý thủ công; restart không làm mất dataset hay tự xóa volume model.
- Kiểm thử nhiều phiên/người dùng và ghi giới hạn tải thực tế; không dùng fixture một người làm SLA cho team.

Xem [thiết kế và hành vi AI hiện có](local-ai.md), [hợp đồng API](../api/API.md) và [báo cáo triển khai đã kiểm chứng](../reports/local-ai-implementation-2026-11-18.md).
