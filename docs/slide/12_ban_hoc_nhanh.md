# Bản học nhanh

Mỗi slide nhớ thông điệp và 2 ý, nói câu chuyển rồi bấm slide. Tổng thời gian mục tiêu 14:15.

## 1. Dashboard 3D (18 giây)

- Phân tích và tiền xử lý dữ liệu CSV
- Đồ án ứng dụng web TypeScript
- Online, offline và quản lý phiên bản

**Câu chuyển:** Trước hết là bài toán nhóm em giải quyết.

## 2. Bài toán dữ liệu trước phân tích (23 giây)

- Người dùng cần kiểm tra tác động trước khi sửa dữ liệu
- CSV có thể chứa missing, dòng trùng và ngoại lai
- Sửa trực tiếp khiến lịch sử thay đổi khó truy vết

**Câu chuyển:** Phần tiếp theo xác định phạm vi.

## 3. Mục tiêu và phạm vi (23 giây)

- Một workspace cho chuỗi nhập, phân tích và xử lý
- Nhập CSV UTF-8 tối đa 16.000.000 byte
- Bảng có kiểu, EDA, 3D, Preview–Apply và Restore

**Câu chuyển:** Các tác nhân của hệ thống được thể hiện ở sơ đồ sau.

## 4. Tác nhân và Use Case (23 giây)

- Người dùng quyết định mọi thay đổi dữ liệu
- Người dùng online quản lý dữ liệu thuộc tài khoản
- Người dùng local tiếp tục xử lý khi mất mạng

**Câu chuyển:** Em minh họa trước bằng ca nhập CSV.

## 5. Use Case nhập CSV (23 giây)

- CSV hợp lệ tạo snapshot đầu tiên và metadata
- Input: project, CSV và tùy chọn nhập
- Luồng chính: upload, parse typed cells, lưu và publish

**Câu chuyển:** Em chuyển sang ca xử lý có hai bước Preview và Apply.

## 6. Use Case Preview–Apply (28 giây)

- Preview chuẩn bị thay đổi, Apply công bố phiên bản
- Input: baseVersionId và một specification
- Preview trả diff, diagnostics và canApply

**Câu chuyển:** Trước đó là các yêu cầu phi chức năng.

## 7. Yêu cầu phi chức năng (23 giây)

- Các chỉ tiêu là mục tiêu nghiệm thu, cần phép đo riêng
- 20 phiên đăng nhập, 5 người thao tác tích cực
- API thường: 10 request/giây trong 10 phút, p95 ≤1 giây

**Câu chuyển:** Tiếp theo là luồng người dùng và các nhánh lỗi.

## 8. Luồng người dùng và nhánh lỗi (23 giây)

- Mỗi bước có trạng thái tiếp tục hoặc dừng rõ ràng
- Đăng nhập, mở project, nhập CSV và phân tích
- Preview hợp lệ mới cho phép Apply

**Câu chuyển:** Em chuyển sang kiến trúc tổng thể.

## 9. Kiến trúc tổng thể (28 giây)

- React gọi NestJS, MongoDB giữ dữ liệu phiên bản
- React/Vite cung cấp workspace và trạng thái UI
- NestJS modular monolith xử lý API và quyền sở hữu

**Câu chuyển:** Một điểm dùng chung giữa hai phía là data-core.

## 10. Data Core dùng chung (23 giây)

- Online và offline dùng cùng quy tắc xử lý dữ liệu
- TypeScript thuần cho typed cells, query và processing
- Backend dùng snapshot server, frontend dùng snapshot local

**Câu chuyển:** Cách tổ chức này liên quan trực tiếp đến mô hình lưu trữ sau đây.

## 11. MongoDB và 12 collection (28 giây)

- Dữ liệu, bản xem trước và receipt có vai trò riêng
- Một project gắn một workspace và tối đa một dataset
- Version có columns và binary chunks

**Câu chuyển:** Các đường nối biểu diễn tham chiếu logic, không phải khóa ngoại do MongoDB tự cưỡng chế.

## 12. Schema và index (23 giây)

- Index bảo vệ tính duy nhất và hỗ trợ truy vấn
- users.emailNormalized: unique
- workspaces.projectId và datasets.projectId: unique

**Câu chuyển:** Em nói rõ hơn về version ở slide sau.

## 13. Vòng đời phiên bản (29 giây)

- Snapshot published bất biến, Restore tạo phiên bản mới
- Candidate đi qua building và staged trước publish
- Apply kiểm currentVersionId và revision bằng CAS

**Câu chuyển:** Sau đây là hợp đồng API thực sự sử dụng cho Preview.

## 14. API Preview và Apply (29 giây)

- Ví dụ theo hợp đồng mã nguồn, dùng ký hiệu thay ID
- POST /api/v1/datasets/:datasetId/previews
- POST /api/v1/datasets/:datasetId/operations

**Câu chuyển:** Em chuyển sang phần AI.

## 15. Luồng gợi ý AI local (29 giây)

- AI xếp hạng ứng viên, người dùng duyệt Preview–Apply
- Input API: group và batch, gắn dataset/version
- Code tính thống kê và tạo ứng viên trên toàn dataset

**Câu chuyển:** Phần tiếp theo nêu dữ liệu gửi model và giới hạn vận hành.

## 16. Dữ liệu và giới hạn AI (24 giây)

- Không gửi tên cột hoặc nội dung ô tới Ollama
- Gửi evidence thống kê, caution, method và ID ứng viên
- Mỗi batch tối đa 12 ứng viên, tối đa 5 gợi ý

**Câu chuyển:** Sau đây là giao diện thật từ bộ kiểm thử.

## 17. Đăng nhập và khôi phục phiên (19 giây)

- Ảnh thật từ acceptance, dữ liệu tài khoản thử
- Router bảo vệ các trang project và hồ sơ
- Access token dùng cho API, refresh qua cookie Secure

**Câu chuyển:** Tiếp theo là workspace phân tích.

## 18. Workspace phân tích dữ liệu (19 giây)

- Ảnh thật của Collection trên fixture kiểm thử
- Bảng hiển thị typed cells và trạng thái missing
- EDA tính trên toàn phiên bản, độc lập trang bảng

**Câu chuyển:** Em chuyển sang bản xem trước thay đổi.

## 19. Giao diện Preview trước và sau (24 giây)

- Fixture uppercase đổi a thành A, b thành B
- Preview hiển thị 2 ô đổi giá trị và 2 dòng cập nhật
- Trạng thái ready cùng diagnostics để người dùng xem xét

**Câu chuyển:** Một cách khảo sát khác là không gian 3D.

## 20. Không gian 3D và lựa chọn điểm (19 giây)

- Ảnh thật WebGL từ bộ acceptance
- Chọn ba cột số làm trục và quan sát điểm
- Hiển thị sampling, missing và outlier rõ ràng

**Câu chuyển:** Em chuyển sang cấu trúc frontend.

## 21. Cấu trúc frontend (24 giây)

- Chiều import app, features và shared có kiểm tra
- app ghép router, provider và workspace
- features giữ API, hooks, components theo nghiệp vụ

**Câu chuyển:** Trước đó là cách giao diện thể hiện trạng thái.

## 22. Thiết kế UI và hiệu suất frontend (24 giây)

- Theme và trạng thái thao tác có nguồn trong CSS và component
- Font hệ thống, spacing theo token, light/dark/system
- Busy, error, stale và expired điều khiển thao tác Apply

**Câu chuyển:** Tiếp theo là cấu trúc backend.

## 23. Cấu trúc backend (24 giây)

- Controller nhận HTTP, service điều phối, repository lưu trữ
- Auth và ownership kiểm quyền theo tài nguyên
- Projects, Datasets, Processing, History, Analysis và AI

**Câu chuyển:** Em sẽ lần theo một thao tác cụ thể ngay sau đây.

## 24. Sequence Preview–Apply xuyên suốt (49 giây)

- Một thao tác được truy vết qua FE, BE và DB
- FE: useProcessing, onlineProcessing và processingApi
- BE: ProcessingController, ProcessingService

**Câu chuyển:** Slide tiếp theo tập trung vào transaction Apply.

## 25. Apply, retry và xung đột (39 giây)

- Receipt giúp khôi phục kết quả khi mất response
- ProcessingService.apply kiểm quyền trước replay receipt
- SnapshotPublisherService.publish dùng transaction ngắn

**Câu chuyển:** Em chuyển sang nhánh offline.

## 26. Offline và đồng bộ (29 giây)

- IndexedDB giữ snapshot và thao tác đã xác nhận lưu
- Data-core xử lý local, không gọi backend cho mỗi phép biến đổi
- Outbox và checkpoint giữ key, version và ID mapping

**Câu chuyển:** Sau đây là bằng chứng kiểm thử.

## 27. Kiểm thử và mức bằng chứng (29 giây)

- Số đếm thuộc từng báo cáo, không cộng thành một suite
- Báo cáo AI: backend unit 71, frontend unit 34, HTTP 52, browser 11
- Báo cáo FE: acceptance HTTPS/replica tạm 53/53

**Câu chuyển:** Tiếp theo là đóng gói.

## 28. Docker và Nginx local (29 giây)

- Frontend tĩnh nằm trong container Nginx
- HTTPS localhost:8443 vào Nginx cổng 443
- /api giữ URI và proxy sang backend:3000

**Câu chuyển:** Kiểm tra này không đăng nhập hay upload, nên em không suy rộng thành nghiệm thu toàn nghiệp vụ qua Nginx.

## 29. Bảo mật và triển khai công khai (24 giây)

- Có cơ chế bảo vệ, chưa nghiệm thu production Internet
- JWT/session, ownership, refresh cookie HttpOnly/Secure
- Origin, rate limit, validation và giới hạn payload

**Câu chuyển:** Sau đây là số đo k6.

## 30. k6 tải API chưa đạt NFR-18 (34 giây)

- 9,393 request/giây, 357 dropped iterations
- Lần chạy lại: 10 phút, tối đa 5 VU, 20 phiên
- 5644 request HTTP 200, lỗi đã gửi 0%

**Câu chuyển:** Em tiếp tục với profile dữ liệu và AI.

## 31. k6 dữ liệu và AI warm (29 giây)

- Đạt ngưỡng trong phạm vi fixture và lượt đo local
- Dữ liệu: 20/20 workflow, 12/12 nhóm đạt p95, lỗi 0%
- Import p95 3,611 giây, TF-IDF 6,281 giây, Apply 0,845 giây

**Câu chuyển:** Cuối cùng là kết quả và hướng tiếp theo.

## 32. Kết quả, hạn chế và hướng phát triển (24 giây)

- Ưu tiên đóng các khoảng trống đo kiểm trước mở rộng
- Có chuỗi CSV, EDA/3D, Preview–Apply, History và local sync
- Đã có AI local và đóng gói Nginx, bằng chứng theo từng phạm vi

**Câu chuyển:** Em xin kết luận.

## 33. Kết luận (19 giây)

- Thay đổi dữ liệu có xem trước, phiên bản và truy vết
- Preview giúp người dùng kiểm tra tác động
- Version và receipt kiểm soát publish, retry và restore

**Câu chuyển:** Em xin cảm ơn thầy cô và xin nhận câu hỏi.
