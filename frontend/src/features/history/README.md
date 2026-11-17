# Feature history

`HistoryPanel` được app ghép vào online workspace. Đọc operations phân trang 10 mục, filter import/process/restore; hiển thị method, thời điểm, result version và summary.

Restore phiên bản cũ có xác nhận, gửi expectedCurrentVersionId và key cố định. Không restore current. Khi response không rõ, giữ target/key để kiểm lại receipt và tránh gửi một action mới. Reply terminal cho phép đóng dialog; lỗi không âm thầm bỏ bản local hoặc overwrite server.

Sau restore thành công, app đọc lại project/workspace/metadata/rows và remount panels theo version. Các controls/loading/empty/error dùng chung shared UI.

Chạy `npm run test:acceptance -w frontend` để kiểm Apply mất response, không tạo history trùng và restore tạo version mới. History local/outbox nằm trong feature offline; chart/analysis và draft recovery còn được xử lý ở gói tương ứng.

## 1. Giới thiệu lớp trình bày Neon
Module history giữ nguyên nghiệp vụ; shared/style/analytics.css nâng giao diện chung.
## 2. Chức năng chính
Phân cấp KPI thật, toolbar, bảng, trạng thái missing, selection, preview và history; không thay công thức, payload hoặc callback.
## 3. Cấu trúc thư mục
components chứa UI hiện hữu; api chứa adapter; README này mô tả module. Skin nằm trong shared/style/analytics.css và tokens.css.
## 4. Luồng hoạt động
Dữ liệu từ adapter/state hiện có đi vào component rồi được render bằng class cũ. CSS không gọi API, tính KPI hay lưu dữ liệu.
## 5. Component và hàm quan trọng
AnalysisPanel hiển thị thống kê toàn phiên bản; DataTableView/TypedTable điều khiển trang/filter; PointRowTable sửa ô; processing preview/apply và history giữ nguyên feature owner.
## 6. Props, state và dữ liệu
Không thêm props/state nghiệp vụ. rowId, version, selection, filters, scope và callbacks giữ nguyên. Số điểm mẫu không được trình bày như tổng dataset.
## 7. Hướng dẫn sử dụng
Import CSV, xem bảng hoặc chuyển tám bước workspace. Filter chỉ lọc hiển thị. Preview để xem trước; Apply mới tạo phiên bản. Ô missing có nhãn chữ và viền nét đứt.
## 8. Hướng dẫn kiểm thử
Chạy frontend unit và browser design-system theo shared/style README. Browser regression local kiểm import/filter độc lập KPI, preview chưa publish, Apply, history và reload IndexedDB. Acceptance server yêu cầu môi trường riêng, chưa được suy ra từ test local.
## 9. Phụ thuộc
React, data-core hiện hữu, shared/ui và các adapter đã có. Không thêm dependency hoặc sửa core.
## 10. Giới hạn và lưu ý
Skin không chứng minh toàn bộ methods hoặc server API. Bảng cuộn trong vùng có focus, header sticky; trên mobile phải kiểm tràn với cột dài. Không thay thuật toán outlier/missing/normalization.
