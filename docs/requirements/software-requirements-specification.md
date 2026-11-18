# Đặc tả yêu cầu phần mềm — Dashboard 3D

Phiên bản tài liệu: **1.0 — 18/11/2026**.

## 1. Mục đích và quy ước

Tài liệu xác định phạm vi và các quy tắc của ứng dụng web phân tích, trực quan 3D và tiền xử lý CSV. Đọc cùng [đặt vấn đề](problem-statement.md), [FR](functional-requirements.md), [NFR](non-functional-requirements.md) và [use case](../useCase/use-cases.md).

`FR-xx` là yêu cầu chức năng; `NFR-xx` là yêu cầu phi chức năng; `UC-xx` là tương tác đạt mục tiêu người dùng. Từ “phải” mô tả điều kiện nghiệm thu, không khẳng định triển khai đã đạt. Bộ tài liệu được tổng hợp từ repository, chưa thay thế bước xác nhận nghiệp vụ của nhóm.

## 2. Tổng quan hệ thống

Frontend React/Vite/TypeScript giao tiếp REST JSON/multipart với backend NestJS modular monolith qua `/api/v1`. MongoDB lưu tài khoản, project, dataset, snapshot và lịch sử. Package `@dashboard/data-core` dùng chung semantics CSV, xử lý, truy vấn và phân tích giữa server và browser. IndexedDB lưu dữ liệu local; service worker cache app shell/static assets để mở lại offline.

Tác nhân: khách chưa đăng nhập, người dùng đã đăng nhập/chủ sở hữu tài nguyên và người dùng local/offline. Đây là trạng thái sử dụng, không phải ba vai trò phân quyền riêng trong database. Online yêu cầu xác thực; thao tác local không chứng minh quyền server.

## 3. Thuật ngữ và dữ liệu

| Khái niệm | Ý nghĩa và ràng buộc |
| --- | --- |
| Project | Không gian sở hữu bởi một user; trạng thái nghiệp vụ empty/ready, có workspace mặc định |
| Workspace | Tab, cấu hình biểu đồ, selection, filter/sort/page; có revision và boundVersionId |
| Dataset | Dữ liệu thuộc project, có currentVersionId và revision; import lần hai vào project đã có dataset bị từ chối |
| Version/snapshot | Schema, dòng và ô của một trạng thái; published bất biến, staged không được đọc như published |
| Typed cell | Kiểu number/text/date/datetime/boolean/null theo hợp đồng; cột có thể mixed; rowId/columnId dùng để liên kết |
| Missing | Null, chuỗi rỗng, chuỗi chỉ whitespace hoặc N/A theo policy; bảo toàn token, không tự coi NA hay chuỗi "null" là missing |
| Preview | Kết quả thử một phương pháp trên baseVersion, có diagnostics, diff, canApply và thời hạn |
| Operation | Bản ghi import/process/restore đã công bố thành công |
| Specification | method, parameters, scope, statisticsScope và engineVersion; engineVersion do server gán khi online |
| Idempotency key | Khóa ổn định cho một thao tác logic; retry cùng payload dùng lại khóa |
| Outbox/checkpoint | Lệnh local chờ đồng bộ và tiến độ để tiếp tục sau gián đoạn |

## 4. Giao diện và môi trường

- **Giao diện người dùng:** đăng ký/đăng nhập, hồ sơ/theme, danh sách project, workspace với import/bảng/processing/EDA/3D/history, trang offline và trạng thái sync. Thông báo rõ loading, rỗng, lỗi, preview invalid/no-op, hết hạn và conflict.
- **API:** request/response/DTO, mã lỗi và phương thức HTTP theo [API.md](../api/API.md) và [dto-contract.md](../api/dto-contract.md), bao gồm bổ sung TF-IDF/boxplot/3D ngày 17/11/2026. Không tạo endpoint mới từ các FR.
- **Tệp:** CSV UTF-8, delimiter dấu phẩy/chấm phẩy/tab, hàng đầu là header; override kiểu theo vị trí cột. Header-only hợp lệ; quoted newline/BOM xử lý theo parser, lỗi nêu vị trí.
- **Lưu trữ:** MongoDB hỗ trợ transaction; snapshot chia chunk theo byte. Browser cần IndexedDB và khả năng cache; UI thông báo quota/storage/network error.
- **Triển khai:** Node theo README dự án; HTTPS/cùng origin hoặc reverse proxy phù hợp cookie Secure/CORS. Browser có WebGL dùng renderer 3D, có fallback khi WebGL không khả dụng; chưa cam kết ma trận browser đầy đủ.

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc |
| --- | --- |
| BR-01 | Mọi truy cập online bảo vệ phải xác thực phiên và truy ngược tài nguyên về owner; không tin ownerId từ body. |
| BR-02 | Published snapshot bất biến. Import/Apply/Restore thành công cập nhật head và history nhất quán; restore luôn tạo version mới. |
| BR-03 | Một preview chứa một method. Scope là cell/columns/dataset theo method; filter bảng không giới hạn scope xử lý. Thống kê xử lý dùng whole-columns tại baseVersion. |
| BR-04 | Apply chỉ nhận previewId; preview phải ready, canApply=true, chưa hết hạn và base còn hợp lệ. Không nhận lại tham số xử lý khi Apply. |
| BR-05 | Schema/request sai trả 400; dữ liệu chạy không hợp lệ có thể trả 201 preview invalid. No-op trả ready nhưng canApply=false, không tạo version/history xử lý. |
| BR-06 | Preview online có TTL 30 phút. Dữ liệu của candidate chưa published không xuất hiện trong API đọc version thông thường. |
| BR-07 | Create project/import/preview/Apply/restore yêu cầu Idempotency-Key. Cùng key khác payload trả 409; cùng request thành công replay theo receipt khi quyền/lifecycle còn hợp lệ. |
| BR-08 | Workspace dùng revision/boundVersionId để chống ghi đè. Giữ refs còn hợp lệ, bỏ refs mất và clamp trang; trả adjustments khi điều chỉnh. |
| BR-09 | Sync kiểm account, source hash/options, typed values, ID mapping/lineage, engine và server head. Conflict dừng replay, giữ local; không tự chuyển tài khoản. |
| BR-10 | Xóa tài khoản/project chỉ trả 204 sau cleanup hoàn tất. Trạng thái deleting ngăn tác vụ ghi hoặc publish tái tạo dữ liệu. |
| BR-11 | Missing token giữ nguyên nếu method không yêu cầu thay đổi. Duplicate so typed values và token, không tự trim/casefold/NFC. |
| BR-12 | Correlation v1 là Pearson cho cặp number hợp lệ; không đủ điều kiện trả null và lý do. Không thay missing bằng 0 để tính. |

## 6. Phạm vi chức năng và truy vết

| Nhóm | Yêu cầu | Use case |
| --- | --- | --- |
| Tài khoản và phiên | FR-01–FR-03 | UC-01, UC-02 |
| Project/workspace | FR-04–FR-06 | UC-03, UC-04 |
| Nhập/xem dữ liệu | FR-07–FR-08 | UC-05, UC-06 |
| Phân tích/3D | FR-09–FR-10 | UC-07, UC-08 |
| Xử lý và sửa ô | FR-11–FR-13 | UC-09, UC-10 |
| Lịch sử/khôi phục | FR-14–FR-15 | UC-11, UC-12 |
| Offline/đồng bộ | FR-16–FR-17 | UC-13, UC-14 |

Danh mục phương pháp và tiêu chí chấp nhận nằm trong FR; tiêu chí bảo mật, toàn vẹn và giới hạn nằm trong NFR. Không bổ sung yêu cầu xuất file, cộng tác hoặc ML khi chưa có hợp đồng.

## 7. Nghiệm thu và giới hạn

Nghiệm thu theo tiêu chí của từng FR/NFR và luồng ngoại lệ UC. Dùng fixture cho CSV/typed data/28 phương pháp, kiểm online/offline parity, API quyền sở hữu, conflict/idempotency và luồng browser HTTPS với MongoDB replica cô lập. Test hợp đồng với mock không thay thế kiểm tích hợp thật. Lượt lập tài liệu này không chạy lại bộ test ứng dụng.

Các SLA độ trễ, số user đồng thời, thời gian phục hồi, chính sách backup server và danh sách browser được hỗ trợ cần chốt sau benchmark/kế hoạch triển khai; chưa có giá trị cam kết trong bộ yêu cầu này. Xem bằng chứng triển khai theo thời điểm ở [báo cáo frontend 18/11](../reports/frontend-fix-review-2026-11-18.md) và [backend/offline](../reports/backend-plan-remediation-2026-11-16.md).

## Bổ sung SRS — Gợi ý AI local (18/11/2026)

Ứng dụng cung cấp gợi ý tham khảo bằng Qwen3 4B tại sáu nhóm xử lý dataset online, theo version/tab trên tất cả cột; không cần chọn cột hoặc phương pháp thủ công. Gợi ý gồm phương pháp, phạm vi, lý do, evidence thống kê và cân nhắc. Người dùng chủ động lấy gợi ý, có thể bỏ qua/chọn thủ công; Xem trước gợi ý chỉ tạo Preview, Apply riêng mới ghi dữ liệu. Không tự Apply hoặc thực thi mã mô hình sinh. Không lưu gợi ý vào database nên ERD không thay đổi.

Frontend phải bỏ gợi ý cũ khi đổi tab/version; đổi lựa chọn form không làm mất gợi ý. Mọi ứng viên được chia lượt và tự gọi tiếp; phải hiển thị tiến độ/chưa hoàn tất khi dừng hoặc lỗi. Backend kiểm quyền trước đọc, chỉ chấp nhận ứng viên hợp lệ, không gửi tên cột/nội dung ô vào mô hình. AI lỗi/timeout/không có gợi ý không làm mất hoặc khóa xử lý thủ công. AI local đặt trên máy backend, chưa hỗ trợ snapshot IndexedDB offline. [Thiết kế và tiêu chí nghiệm thu](../architecture/local-ai.md).

**Phân phối và triển khai:** thành viên chạy riêng cần cài/tải runtime/model trên máy mình; clone mã nguồn không kèm mô hình. Với server chung, người dùng chỉ cần trình duyệt, còn người vận hành cấp tài nguyên AI tại server. Script hiện phục vụ Windows. Docker Compose tách backend/Ollama là phạm vi triển khai tiếp theo, chưa sẵn sàng chỉ bằng cấu hình môi trường; cần điều chỉnh validator địa chỉ, khởi tạo model, volume, readiness và nghiệm thu nhiều người dùng. Không thay đổi API nghiệp vụ hoặc ERD trong lượt cập nhật tài liệu này. [Hướng dẫn bàn giao](../architecture/local-ai-deployment.md).
