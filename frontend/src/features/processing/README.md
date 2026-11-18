# Feature processing

`ProcessingPanel` là UI dùng chung cho online/local qua `ProcessingAdapter`; app lắp panel vào workspace. Không import app hoặc backend runtime.

- Typed controls cho 27 method trong panel (thêm TF-IDF; edit_cell chuyển sang bảng dòng 3D); JSON chỉ là lựa chọn nâng cao. `makeSpecification` kiểm typed cell, enum, timezone, numeric bounds và mapping/boolean duplicates trước request hoặc local execution.
- `onlineProcessing` gọi Preview/Get/Apply, value-counts toàn cột để tạo mapping ordinal. Preview không thay published version; diff phân trang, summary/schema/diagnostics và expiry được hiển thị. Không Apply khi diff chưa đọc, invalid/no-op/expired hoặc form thay đổi.
- Apply giữ key khi mất response và khóa form tới khi kiểm receipt. Nếu lỗi terminal trước write, người dùng có thể tạo lại preview. Local adapter ở feature offline giữ candidate tạm, ghi snapshot/history/outbox nguyên tử dưới Web Lock khi Apply, từ chối base local stale.
- `projectPreview` dùng chung từ Data Core cho local/backend, không fork thuật toán đếm/statistics.

Kiểm tra: `npm run test:unit -w frontend`, `npm run test:acceptance -w frontend`. Acceptance thao tác 27 fixture trong panel; fixture edit_cell kiểm riêng từ điểm 3D online và offline, giữ bảng trước Apply, sync/parity, receipt loss/restore, expiry/diff failure và stale local tab. Các tests không thay thế nghiệm thu mọi tổ hợp scope/biên và UI cuối.

## 1. Giới thiệu lớp trình bày Neon
Module processing giữ nguyên nghiệp vụ; shared/style/analytics.css nâng giao diện chung.
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
