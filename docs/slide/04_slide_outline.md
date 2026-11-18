# Dàn ý 33 slide

Khung trình bày: **15:00 (900 giây)**. Kịch bản luyện nói: **14:15 (855 giây)**, dự phòng 45 giây. Không có slide phụ nằm ngoài số đếm.

| Slide | Tiêu đề | Thông điệp | Giây khung | Giây nói |
|---|---|---|---:|---:|
|1|Dashboard 3D|Phân tích và tiền xử lý dữ liệu CSV|20|18|
|2|Bài toán dữ liệu trước phân tích|Người dùng cần kiểm tra tác động trước khi sửa dữ liệu|25|23|
|3|Mục tiêu và phạm vi|Một workspace cho chuỗi nhập, phân tích và xử lý|25|23|
|4|Tác nhân và Use Case|Người dùng quyết định mọi thay đổi dữ liệu|25|23|
|5|Use Case nhập CSV|CSV hợp lệ tạo snapshot đầu tiên và metadata|25|23|
|6|Use Case Preview–Apply|Preview chuẩn bị thay đổi, Apply công bố phiên bản|30|28|
|7|Yêu cầu phi chức năng|Các chỉ tiêu là mục tiêu nghiệm thu, cần phép đo riêng|25|23|
|8|Luồng người dùng và nhánh lỗi|Mỗi bước có trạng thái tiếp tục hoặc dừng rõ ràng|25|23|
|9|Kiến trúc tổng thể|React gọi NestJS, MongoDB giữ dữ liệu phiên bản|30|28|
|10|Data Core dùng chung|Online và offline dùng cùng quy tắc xử lý dữ liệu|25|23|
|11|MongoDB và 12 collection|Dữ liệu, bản xem trước và receipt có vai trò riêng|30|28|
|12|Schema và index|Index bảo vệ tính duy nhất và hỗ trợ truy vấn|25|23|
|13|Vòng đời phiên bản|Snapshot published bất biến, Restore tạo phiên bản mới|30|29|
|14|API Preview và Apply|Ví dụ theo hợp đồng mã nguồn, dùng ký hiệu thay ID|30|29|
|15|Luồng gợi ý AI local|AI xếp hạng ứng viên, người dùng duyệt Preview–Apply|30|29|
|16|Dữ liệu và giới hạn AI|Không gửi tên cột hoặc nội dung ô tới Ollama|25|24|
|17|Đăng nhập và khôi phục phiên|Ảnh thật từ acceptance, dữ liệu tài khoản thử|20|19|
|18|Workspace phân tích dữ liệu|Ảnh thật của Collection trên fixture kiểm thử|20|19|
|19|Giao diện Preview trước và sau|Fixture uppercase đổi a thành A, b thành B|25|24|
|20|Không gian 3D và lựa chọn điểm|Ảnh thật WebGL từ bộ acceptance|20|19|
|21|Cấu trúc frontend|Chiều import app, features và shared có kiểm tra|25|24|
|22|Thiết kế UI và hiệu suất frontend|Theme và trạng thái thao tác có nguồn trong CSS và component|25|24|
|23|Cấu trúc backend|Controller nhận HTTP, service điều phối, repository lưu trữ|25|24|
|24|Sequence Preview–Apply xuyên suốt|Một thao tác được truy vết qua FE, BE và DB|50|49|
|25|Apply, retry và xung đột|Receipt giúp khôi phục kết quả khi mất response|40|39|
|26|Offline và đồng bộ|IndexedDB giữ snapshot và thao tác đã xác nhận lưu|30|29|
|27|Kiểm thử và mức bằng chứng|Số đếm thuộc từng báo cáo, không cộng thành một suite|30|29|
|28|Docker và Nginx local|Frontend tĩnh nằm trong container Nginx|30|29|
|29|Bảo mật và triển khai công khai|Có cơ chế bảo vệ, chưa nghiệm thu production Internet|25|24|
|30|k6 tải API chưa đạt NFR-18|9,393 request/giây, 357 dropped iterations|35|34|
|31|k6 dữ liệu và AI warm|Đạt ngưỡng trong phạm vi fixture và lượt đo local|30|29|
|32|Kết quả, hạn chế và hướng phát triển|Ưu tiên đóng các khoảng trống đo kiểm trước mở rộng|25|24|
|33|Kết luận|Thay đổi dữ liệu có xem trước, phiên bản và truy vết|20|19|
