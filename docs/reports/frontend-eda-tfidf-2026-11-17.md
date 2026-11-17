# Bổ sung EDA, sửa ô từ 3D và TF-IDF — 17/11/2026

Thực hiện trên working tree `dev-frontend`, giữ cấu trúc app/features/shared, API và nghiệp vụ hiện hành; không sửa `frontend_mau`. Không commit/push. Báo cáo này bổ sung và thay thế các giới hạn boxplot/sửa ô/27 method trong báo cáo giao diện trước đó.

## Hành vi đã triển khai

| Yêu cầu | Hành vi hiện tại |
| --- | --- |
| Sửa một ô | Bỏ `edit_cell` khỏi panel xử lý. Click điểm WebGL, hình chiếu hoặc danh sách để mở bảng dòng theo rowId; sửa kind/value và Lưu ô ngay trong bảng. Preview/Apply chạy nội bộ với kiểm kiểu, idempotency, CAS và history như cũ. Lưu từng ô, khóa đổi dòng/tab khi còn draft; có Bỏ thay đổi. Lần lưu mất phản hồi dùng nút Kiểm tra lại với cùng khóa. |
| Outlier boxplot | Có ở tổng quan Collection và Phân phối và tần suất. Chọn cột number, hiển thị Q1/median/Q3, râu, dấu outlier và missing. Thống kê toàn cột; Tukey 1,5×IQR, không dựng từ sample3D. |
| EDA | Histogram cho số và biểu đồ thanh tần suất cho giá trị typed/category, có bảng số liệu và phân trang category. Tỷ lệ tính trên toàn dataset; filter/trang bảng không đổi tập thống kê. |
| Trục3D | Điểm và ticks dùng chung scatter-model/full-version bounds, cùng hệ tọa độ với gốc trục và mặt phẳng chiếu. Tooltip giữ giá trị thật; co giãn chỉ phục vụ hiển thị. Cột hằng ở giữa. |
| Màu toàn dòng | Missing xét mọi cột. Chế độ outlier xét mọi cột number, độc lập trục/cột chọn. Dòng thiếu/sai tọa độ ở vùng dấu riêng để chọn/sửa, không gán0. |
| TF-IDF | Transformation có TF-IDF cho một cột text với lowercase/minDf/maxFeatures/sublinearTf/norm/keepSource. Shared core0.7 chạy cả API và offline; Preview schema/diff, Apply/history và sync theo lineage. |
| Backend/database | Bổ sung validation/union TF-IDF; distribution trả boxplot; points3D trả axes/flags/unplottable. Không thêm endpoint. Đã chạy migration chỉ mở enum tfidf trong hai validator processingPreviews/processingOperations của database cấu hình; toàn12collection/index verify thành công, không sửa document/index. |

## Hợp đồng và giới hạn

- 28 method lõi/API: 27 trong panel (thêm TF-IDF, bỏ edit_cell khỏi panel) và edit_cell qua bảng dòng3D. Vẫn27endpoint.
- TF-IDF: mỗi dòng là document kể cả missing/rỗng; token chữ/số Unicode, không stopwords/stemming/NFC. IDF làm trơn, L2/none; document rỗng vector0. maxFeatures≤1000 và tổng schema≤1000; preview invalid nếu từ vựng rỗng/sai kiểu/xung đột ID. Không phát hành một phần.
- Engine0.7 cho phép replay27method cũ từ0.6 với kiểm đầy đủ candidate/receipt; TF-IDF phải khớp engine. Engine không biết vẫn blocked, giữ local.
- 3D tối đa10000điểm hợp lệ và10000dấu vùng thiếu/sai tọa độ, ưu tiên dòng được tô màu nếu lấy mẫu. Hiển thị counts toàn dataset và số chưa vẽ; không tuyên bố đã vẽ tất cả khi vượt giới hạn.
- Boxplot outliers tối đa100dấu nhưng tổng đếm đầy đủ; frequency chart tối đa20category mỗi trang. Cột không số/all-missing có N/A rõ ràng, cột hằng có boxplot suy biến.
- Camera/pin là trạng thái phiên UI, chưa lưu lâu dài trong workspace. Candidate3D chưa thuộc phạm vi bổ sung này.

Chi tiết công thức/response: [API.md](../api/API.md#bổ-sung-hợp-đồng-ngày-17112026), [DTO](../api/dto-contract.md), [migration database](../database/database.md#nâng-cấp-tf-idf-17112026). API.xlsx cũng đã cập nhật các response liên quan, dòng TF-IDF và quy ước engine/EDA; giữ ba sheet và kiểm các ô ngoài phạm vi không đổi.

## Xác minh

Toàn bộ acceptance: **53/53 PASS** trên HTTPS/Nest/MongoDB replica tạm, gồm click WebGL thật→sửa ô, mất phản hồi Apply/cùng khóa, online/local/mixed/sync, boxplot chọn cột, frequency/histogram, global flags ngoài trục, sửa dòng thiếu tọa độ và ảnh desktop/mobile. Các kiểm tra khác đạt:74test core (TF-IDF công thức, Unicode,0vector,invalid,ESM/CJS);27test frontend unit (trục/tick cùng phép đổi, global flags ngoài trục, missing coordinate, boxplot);59test backend unit. Lint/typecheck frontend/backend và architecture check đạt. Browser fixture loops đã xác minh27method trong panel online và offline/sync, gồm TF-IDF. Các ảnh desktop/mobile nằm trong frontend/test-results/acceptance (artifact kiểm thử, không commit).
