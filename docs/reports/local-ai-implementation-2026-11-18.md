# Triển khai gợi ý AI local — 18/11/2026

## Kết quả

Đã tích hợp Qwen3 4B qua Ollama vào backend NestJS và ProcessingPanel React cho sáu nhóm xử lý dataset online. Gợi ý chỉ tham khảo, gắn version/tab/cột; người dùng chọn Preview rồi Apply tường minh. Không thêm database persistence, migration hoặc thay ERD do tính năng AI.

Đã giữ các thay đổi có sẵn của workspace, gồm tài liệu requirements/useCase chưa được Git theo dõi và việc ERD.html đã bị xóa từ trước khi triển khai. Chỉ bổ sung các phần AI vào tài liệu, không khôi phục hoặc xóa thay đổi của người dùng.

## Máy và runtime đã kiểm tra

- CPU Intel Core i5-12450H; RAM 16.869.052.416 byte (khoảng 15,7 GiB).
- NVIDIA RTX 3050 Laptop 4 GiB VRAM; iGPU Intel UHD.
- Trước triển khai không thấy Ollama trong PATH, vị trí cài tiêu chuẩn hoặc API 11434.
- Tải portable Ollama v0.40.16 từ GitHub chính thức, đối chiếu SHA-256 archive với digest release; Qwen3 4B Q4_K_M tải/verify qua Ollama.
- Server chỉ bind 127.0.0.1:11434, cloud tắt khi khởi động bằng script; runtime/model/log ở `.artifact-work/ollama/`, ngoài Git.
- Smoke test thật với fixture tổng hợp Cleaning/Missing qua AiService: có gợi ý hợp lệ, snapshot trước/sau bằng nhau. Quan sát lần đầu khoảng 83,2 giây (gồm tải model vào bộ nhớ), lần kế tiếp khoảng 5,6 giây; không phải SLA.
- API `/api/ps` sau thử nghiệm báo context 4096, size khoảng 3,53 GB, size_vram khoảng 2,34 GB; phần model chạy kết hợp RAM/VRAM tùy tài nguyên.
- Lần xác minh lại bằng `npm run ai:check` sau build cuối: Cleaning khoảng 12,4 giây, Missing khoảng 5,3 giây; cả hai có gợi ý và giữ nguyên snapshot.

## Kiểm chứng

| Kiểm tra | Kết quả |
| --- | --- |
| `npm run lint` | Đạt |
| `npm run typecheck` | Đạt cả backend/frontend/data-core; không vòng import |
| `npm run test:unit` | 74 data-core + 69 backend đạt |
| `npm run test:unit -w frontend` | 31 đạt |
| `npm run test:e2e -w backend` | 52 HTTP tests đạt, database tắt; auth thật có kiểm tra endpoint AI |
| Playwright `ai-suggestions.spec.ts` | 6 đạt: suggestion/Preview/Apply, stale context, error/empty/offline, mobile 390px |
| Build backend + frontend | Đạt; Vite còn cảnh báo kích thước chunk WebGL hiện hữu |
| `npm run ai:start`, `npm run ai:check` | Khởi động idempotent; kiểm service với Qwen3 4B thật |

Browser tests dùng adapter fixture có engine thật, HTTP tests dùng DB tắt và override được ghi rõ trong tên suite; smoke model dùng repository fixture tổng hợp. Chưa chạy chuỗi trình duyệt → MongoDB thật → Qwen trên dữ liệu tài khoản người dùng; chưa đánh giá chất lượng khuyến nghị dài hạn, workload lớn hoặc nhiều người dùng đồng thời.

## Vận hành và giới hạn phiên bản đầu (đã được thay thế bởi luồng toàn dataset)

Chạy `npm run dev:ai`, đăng nhập/mở dataset online, chọn tab xử lý và cột, bấm Lấy gợi ý AI. Đọc evidence/caution, chọn Xem trước gợi ý rồi quyết định Apply. Mô hình có thể đưa lý do chưa chính xác; bằng chứng thống kê do code tính được hiển thị để đối chiếu.

Tối đa 20 cột/yêu cầu, 12 ứng viên đầu và 5 gợi ý. Không tự Apply, không cloud fallback, không gửi tên cột/nội dung ô. Snapshot IndexedDB offline chưa dùng AI và không bị tải lên server để xin gợi ý. Xem [kiến trúc và hướng dẫn đầy đủ](../architecture/local-ai.md).


## Sửa theo phản hồi: gợi ý trước khi chọn phương pháp/cột

API chỉ nhận group/batch, tự thống kê mọi dòng và cột của phiên bản. Giao diện đặt AI trước form thủ công, nút Phân tích toàn bộ dataset không phụ thuộc lựa chọn form. Bỏ giới hạn 20 cột và việc cắt ở 12 ứng viên đầu; UI gọi tiếp mọi lượt, hiện tiến độ và đánh dấu chưa hoàn tất nếu lỗi/dừng. Đổi cột/phương pháp thủ công giữ gợi ý; đổi tab/version hủy. Preview tự nạp cột/phương pháp được gợi ý, Apply vẫn tường minh.

Kiểm thử bổ sung: 25 cột/25 ứng viên chia ba lượt và gợi ý ở cột cuối; form không chọn cột hoặc chọn phương pháp khác vẫn nhận gợi ý; nhiều lượt, partial failure, cancel, stale tab/version, mobile. Giới hạn hiện hành và API cập nhật tại [local-ai](../architecture/local-ai.md) và [API](../api/API.md).

Kết quả xác minh sau khi sửa luồng toàn dataset: 71 backend unit, 34 frontend unit, 52 HTTP và 11 browser tests đạt. Lint, typecheck cả workspace và build backend/frontend đạt; build giữ cảnh báo chunk WebGL lớn đã có. Smoke test Qwen thật nhận diện strip_html tại cột cuối của dataset 25 cột mà không truyền cột hoặc phương pháp, snapshot không đổi. Cleaning/Missing tổng hợp lần kiểm tra này lần lượt khoảng 13,2 và 5,1 giây. Chưa chạy toàn chuỗi trình duyệt → MongoDB thật → Qwen trên dữ liệu tài khoản.
