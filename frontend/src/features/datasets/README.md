# Feature datasets

`datasetsApi` đọc metadata/rows/getRow theo immutable version và import multipart qua shared transport. `ImportWizard` dùng chung online/local, `DataTableView` dùng chung controls và `TypedTable`/`CellDisplay` render typed cells.

- Wizard kiểm UTF-8 CSV <=16.000.000 byte bằng core, giữ nguồn, chọn comma/semicolon/tab và override logicalType theo position. Preview tính lại từ toàn nguồn sau mỗi override; chỉ render tối đa 10 dòng mẫu, không tự giới hạn dữ liệu import. Encoding/header cố định theo API V1.
- Inferred schema được giữ để sửa lại override invalid. Lỗi CSV có code/recordIndex/physical lines/columnPosition; quá kích thước/blank record/quoted errors chặn submit. Async inspection có generation fence; logical import key giữ qua retry, local creation cũng có key.
- Bảng phân biệt number/text/date/datetime/boolean/null/empty/whitespace/N/A. Filter typed hỗ trợ nhiều điều kiện AND, xóa từng điều kiện, sort/page/selection theo IDs. Online đọc API; local queryRows từ toàn snapshot. GetRow độc lập filter/page được app/analysis sử dụng.
- Selection không tự sửa published data: chọn ô, chọn edit_cell trong ProcessingPanel rồi Preview và Apply typed value. Scope không bị filter bảng ngầm giới hạn. Callback double-click vẫn là extension boundary; full editor UX/keyboard được audit riêng.

Kiểm thử: `npm run test:acceptance -w frontend` có online/local wizard BOM/quoted multiline/missing/semicolon/override, exact source/hash/options/rawToken giữ trong IndexedDB rồi sync, CSV blank/oversize/header-only; table online và local persistence/CAS/multi-filter/sort/selection qua reload. Không dùng sample 10 dòng để kết luận toàn file hợp lệ; core đã kiểm toàn file trước submit.
