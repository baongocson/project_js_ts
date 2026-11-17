# Feature datasets

`datasetsApi` đọc metadata/rows/getRow theo immutable version và import multipart qua shared transport. `ImportWizard` dùng chung online/local, `DataTableView` dùng chung controls và `TypedTable`/`CellDisplay` render typed cells.

- Wizard kiểm UTF-8 CSV <=16.000.000 byte bằng core, giữ nguồn, chọn comma/semicolon/tab và override logicalType theo position. Preview tính lại từ toàn nguồn sau mỗi override; chỉ render tối đa 10 dòng mẫu, không tự giới hạn dữ liệu import. Encoding/header cố định theo API V1.
- Inferred schema được giữ để sửa lại override invalid. Lỗi CSV có code/recordIndex/physical lines/columnPosition; quá kích thước/blank record/quoted errors chặn submit. Async inspection có generation fence; logical import key giữ qua retry, local creation cũng có key.
- Bảng phân biệt number/text/date/datetime/boolean/null/empty/whitespace/N/A. Filter typed hỗ trợ nhiều điều kiện AND, xóa từng điều kiện, sort/page/selection theo IDs. Online đọc API; local queryRows từ toàn snapshot. GetRow độc lập filter/page được app/analysis sử dụng.
- Selection không tự sửa published data: mở Không gian 3D, chọn điểm hoặc dòng rồi sửa typed value trong PointRowTable. Nội bộ vẫn Preview và Apply; edit_cell không nằm trong menu processing. Scope không bị filter bảng ngầm giới hạn. Callback double-click vẫn là extension boundary.

Kiểm thử: `npm run test:acceptance -w frontend` có online/local wizard BOM/quoted multiline/missing/semicolon/override, exact source/hash/options/rawToken giữ trong IndexedDB rồi sync, CSV blank/oversize/header-only; table online và local persistence/CAS/multi-filter/sort/selection qua reload. Không dùng sample 10 dòng để kết luận toàn file hợp lệ; core đã kiểm toàn file trước submit.

## 1. Giới thiệu lớp trình bày Neon
Module datasets giữ nguyên nghiệp vụ; shared/style/analytics.css nâng giao diện chung.
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
