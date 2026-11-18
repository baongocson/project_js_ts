# Đặt vấn đề và bài toán Dashboard 3D

Ngày lập: **18/11/2026**. Phạm vi: ứng dụng web phân tích khám phá và tiền xử lý dữ liệu CSV, làm việc online/offline.

## 1. Bối cảnh

Dữ liệu dạng bảng trước khi phân tích thường chứa giá trị thiếu, dòng trùng, kiểu dữ liệu chưa phù hợp hoặc giá trị ngoại lai. Người sử dụng cần quan sát chất lượng dữ liệu, chọn phép biến đổi, kiểm tra tác động và quay lại trạng thái trước đó khi cần. Việc làm bằng nhiều công cụ hoặc sửa trực tiếp trên tệp khiến chuỗi thao tác khó theo dõi và khó kiểm chứng.

Dashboard 3D hướng tới một workspace thống nhất: nhập CSV, xem bảng có kiểu, thống kê và biểu đồ, quan sát điểm 3D, xem trước xử lý rồi công bố phiên bản mới. Chế độ local cho phép tiếp tục công việc khi mất mạng và đồng bộ lên server sau đó.

## 2. Vấn đề cần giải quyết

| Vấn đề | Hệ quả | Hướng giải quyết |
| --- | --- | --- |
| Khó nhận biết missing, duplicate và outlier | Chọn phép xử lý thiếu căn cứ | Thống kê toàn phiên bản, distribution, boxplot, correlation và 3D |
| Sửa dữ liệu trực tiếp mà không xem tác động | Dễ mất trạng thái ban đầu | Preview trước/sau, Apply có kiểm tra, snapshot bất biến |
| Các bước xử lý không được ghi nhận | Khó giải thích và khôi phục | History lưu import/process/restore và phiên bản kết quả |
| Mất mạng làm gián đoạn công việc | Không thể tiếp tục xử lý | Lưu local trong IndexedDB, cùng engine xử lý với server |
| Gửi lại request hoặc đồng bộ khi server đã đổi | Có thể tạo thao tác lặp hoặc ghi đè | Idempotency, kiểm phiên bản và dừng khi xung đột |
| Dữ liệu của nhiều tài khoản cùng hệ thống | Có nguy cơ truy cập sai chủ sở hữu | Xác thực và kiểm quyền theo chuỗi project/dataset/version |

## 3. Phát biểu bài toán

**Đầu vào:** tệp CSV UTF-8 tối đa 16.000.000 byte, tùy chọn nhập, lựa chọn cột/ô/dataset, cấu hình phân tích và tham số phương pháp xử lý.

**Xử lý:** phân tích CSV thành dữ liệu có kiểu; lưu theo project và version; cung cấp truy vấn, thống kê và trực quan; tạo preview cho một phương pháp; chỉ công bố khi dữ liệu hợp lệ, có thay đổi và phiên bản nền còn hiện hành. Ở chế độ offline, lưu snapshot và chuỗi thao tác local để đồng bộ có kiểm tra.

**Đầu ra:** bảng dữ liệu, chỉ số chất lượng, biểu đồ/điểm 3D, chênh lệch trước/sau, phiên bản đã công bố, lịch sử thao tác và trạng thái đồng bộ hoặc nguyên nhân xung đột.

## 4. Mục tiêu

1. Hỗ trợ người dùng phát hiện vấn đề chất lượng dữ liệu trước khi biến đổi.
2. Cho phép làm sạch, xử lý missing/outlier, scaling, transformation và encoding trong cùng workspace.
3. Bảo đảm thao tác có thể xem trước, truy vết và khôi phục bằng phiên bản mới.
4. Giữ kết quả xử lý online/offline nhất quán khi cùng dữ liệu, specification và engine tương thích.
5. Bảo vệ dữ liệu theo chủ sở hữu và xử lý rõ ràng khi mất mạng, gửi lại hoặc xung đột.

## 5. Đối tượng sử dụng

- **Người phân tích dữ liệu:** nhập, khảo sát, tiền xử lý và so sánh kết quả.
- **Người học/nhóm thực hiện đồ án:** quan sát tác động của từng phương pháp qua bảng, thống kê và 3D.
- **Người vận hành:** cấu hình HTTPS, database và kiểm tra health; không suy ra quyền đọc dữ liệu người dùng hay vai trò quản trị trong ứng dụng.

## 6. Phạm vi

Trong phạm vi: tài khoản/phiên, hồ sơ/theme, project/workspace, một dataset cho mỗi project theo API hiện hành, nhập CSV, bảng typed data, EDA/3D, 28 phương pháp xử lý gồm `edit_cell` và TF-IDF, Preview–Apply, history/restore, offline và đồng bộ.

Ngoài phạm vi hợp đồng hiện hành: chia sẻ project/cộng tác nhiều chủ sở hữu, phân quyền quản trị nghiệp vụ, huấn luyện mô hình máy học, pipeline nhiều phương pháp trong một preview, nhập Excel/nguồn streaming và xuất dữ liệu thành tệp. Những chức năng này cần đặc tả riêng nếu bổ sung.

## 7. Điều kiện và tiêu chí thành công

- Người dùng có thể hoàn thành chuỗi nhập CSV → phân tích → Preview → Apply → xem History → Restore; kết quả truy vết được theo version.
- Preview invalid, no-op, hết hạn hoặc dựa trên phiên bản cũ không tạo phiên bản xử lý mới.
- Luồng local còn dữ liệu sau reload; sau khi có mạng và xác thực đúng tài khoản, đồng bộ tiếp tục hoặc báo xung đột, giữ bản local.
- App offline cần được tải/cache trước; xóa storage trình duyệt sẽ xóa dữ liệu local. MongoDB online cần hỗ trợ transaction và production cần HTTPS cho cookie xác thực.
- Tiêu chí chi tiết nằm trong [FR](functional-requirements.md), [NFR](non-functional-requirements.md) và [use case](../useCase/use-cases.md). Chưa đặt SLA độ trễ hoặc tải đồng thời khi chưa có benchmark được duyệt.

## 8. Căn cứ

[README dự án](../../README.md), [API](../api/API.md), [DTO](../api/dto-contract.md), [frontend](../../frontend/README.md), [data-core](../../packages/data-core/README.md). Các nhận định về khó khăn ở mục 1–2 là phân tích bài toán, không phải kết quả khảo sát người dùng.
