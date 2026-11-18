# Yêu cầu chức năng — Dashboard 3D

Ngày lập: **18/11/2026**. Các yêu cầu dưới đây thuộc phạm vi hiện hành; cột tiêu chí dùng để nghiệm thu, không phải kết quả test. Quy tắc chung ở [SRS](software-requirements-specification.md); trường dữ liệu chính xác theo [API](../api/API.md).

## 1. Tài khoản, project và dataset

| Mã | Chức năng bắt buộc | Tiêu chí chấp nhận |
| --- | --- | --- |
| FR-01 | Đăng ký, đăng nhập, refresh và đăng xuất | Email chuẩn hóa duy nhất; thông tin sai bị từ chối; login cấp phiên, refresh rotation; logout thu hồi phiên kể cả access hết hạn; không lộ password/hash/refresh token. |
| FR-02 | Xem/sửa hồ sơ và theme | GET/PATCH hồ sơ người hiện tại; sửa displayName và theme light/dark/system; trường không gửi được giữ nguyên; dữ liệu giữ sau reload online. |
| FR-03 | Xóa tài khoản và dữ liệu phụ thuộc | Có xác nhận rõ ở UI; chỉ báo hoàn tất khi server trả 204 sau cleanup; phiên bị thu hồi; lỗi chưa hoàn tất hiển thị đúng, không giả thành công. |
| FR-04 | Tạo, liệt kê, mở và đổi tên project | Chỉ thấy project của mình; có page/sort/lifecycle theo API; tên được trùng; project mới có workspace mặc định và trạng thái empty. |
| FR-05 | Xóa project | Có xác nhận; dọn workspace/dataset/version/chunk/preview/history/receipt; chỉ loại khỏi UI như đã xóa hoàn tất sau xác nhận thành công từ server. |
| FR-06 | Lưu và khôi phục workspace | Giữ tab, trục 3D, selection, tableState; PATCH kèm revision/boundVersionId; stale trả conflict; refs không hợp lệ được điều chỉnh có thông báo, không reset toàn bộ cấu hình. |
| FR-07 | Nhập CSV thành dataset/version ban đầu | Kiểm UTF-8, delimiter/header/override kiểu và trần file; cho xem suy kiểu trước gửi; tạo version published cùng history import; lỗi nêu vị trí; project đã có dataset trả conflict; retry không tạo bản lặp. |
| FR-08 | Xem metadata, bảng typed data và dòng theo ID | Phân trang/filter AND/sort theo API; missing cuối hai chiều; hiển thị đúng kiểu và missing; lấy rowId từ điểm 3D độc lập trang/filter; không đọc staged như published. |

## 2. Phân tích và xử lý

| Mã | Chức năng bắt buộc | Tiêu chí chấp nhận |
| --- | --- | --- |
| FR-09 | Phân tích khám phá dữ liệu | Summary có kích thước gốc, dòng/cột, missing/duplicate/outlier/datatype; distribution/histogram/value counts/boxplot theo toàn cột; correlation giữ mọi feature, cặp không hợp lệ có null/lý do/validPairCounts. |
| FR-10 | Trực quan 3D và chọn dòng | Chọn ba cột number; hiển thị bounds toàn phiên bản, màu missing/outlier, sampling/counts; dòng thiếu/tọa độ sai ở vùng riêng, không gán 0; chọn điểm mở đúng rowId; fallback dùng cùng phép biến đổi trục/điểm. |
| FR-11 | Tạo và xem Preview | Chọn một method cùng scope/tham số hợp lệ; trả summary/schema diff/diagnostics và các cặp before/after phân trang; invalid/no-op không cho Apply; preview online hết hạn được báo rõ. |
| FR-12 | Apply Preview | Chỉ gửi previewId với khóa idempotency; công bố đúng candidate của preview, cập nhật head/revision và history nhất quán; preview invalid/no-op/hết hạn hoặc base stale bị từ chối, không tạo version thừa. |
| FR-13 | Sửa ô từ bảng/dòng được chọn | Giá trị typed hợp schema, dùng edit_cell qua Preview–Apply; không cập nhật trực tiếp snapshot published; đổi kiểu toàn cột dùng convert; sửa token missing được ghi nhận nếu có thay đổi. |
| FR-14 | Xem lịch sử thao tác | Phân trang/lọc kind import/process/restore, mới nhất trước; operation truy được base/result version và specification khi áp dụng; preview chưa Apply không thành history xử lý. |
| FR-15 | Restore phiên bản | Chọn version published thuộc dataset, gửi expectedCurrentVersionId; tạo version mới có restoredFromVersionId và history restore; không sửa version cũ; stale hoặc target=current bị từ chối. |

### Danh mục phương pháp thuộc FR-11–FR-13

| Nhóm | Method |
| --- | --- |
| Sửa ô | `edit_cell` |
| Cleaning/chuyển kiểu | `remove_duplicates`, `strip_html`, `normalize_whitespace`, `convert_number`, `convert_text`, `convert_date`, `convert_datetime`, `convert_boolean`, `uppercase`, `lowercase`, `replace_value` |
| Missing | `fill_mean`, `fill_median`, `fill_mode`, `fill_max`, `fill_constant`, `drop_missing_rows`, `drop_missing_columns` |
| Outlier | `clip_iqr`, `clip_zscore` |
| Scaling | `scale_minmax`, `standardize` |
| Transformation | `log1p`, `square`, `tfidf` |
| Encoding | `one_hot`, `ordinal` |

Tổng cộng **28 method**; panel processing có 27 method, `edit_cell` đi từ thao tác lưu ô. Scope/tham số và miền dữ liệu theo bảng method trong API; không suy ra mọi method đều hỗ trợ cả cell/columns/dataset. TF-IDF chỉ nhận đúng một cột text, ordinal một cột mỗi lần. Filter bảng không giới hạn dữ liệu xử lý; thống kê dùng toàn cột. Không được xóa cột cuối; không có dữ liệu hợp lệ hoặc miền toán học sai phải trả diagnostics thay vì âm thầm tạo số giả.

## 3. Offline và đồng bộ

| Mã | Chức năng bắt buộc | Tiêu chí chấp nhận |
| --- | --- | --- |
| FR-16 | Làm việc local/offline | Sau khi app đã cache, mở/reload được offline; tạo local project, nhập CSV, xem bảng/phân tích/3D, Preview–Apply/History/Restore bằng core chung; lưu snapshot/file/workspace/outbox bền trong IndexedDB; báo quota/lỗi ghi, không báo đã lưu khi thất bại. |
| FR-17 | Đồng bộ local lên server khi có mạng | Xác thực đúng account; tạo/map project/dataset/row/column/version; kiểm source/options/typed values/lineage/engine/head; replay đúng thứ tự với key/checkpoint ổn định; tiếp tục sau gián đoạn; conflict giữ local và nêu nguyên nhân; phân biệt “đã lưu local” với “đã đồng bộ”. |

Online FR-04–FR-15 yêu cầu owner hợp lệ. Offline không dùng local ID làm ObjectId server và không lưu token vào snapshot/outbox. Đăng xuất/đổi tài khoản không tự gán queue cũ sang tài khoản mới.

## 4. Truy vết và kiểm chứng

Ánh xạ đầy đủ FR → UC ở [SRS mục 6](software-requirements-specification.md#6-phạm-vi-chức-năng-và-truy-vết). Các tiêu chí xuyên suốt về quyền sở hữu, CAS/idempotency, độ bền local và giới hạn tài nguyên được quy định tại [NFR](non-functional-requirements.md). Khi nghiệm thu cần gắn kết quả test/fixture thực tế với từng FR; danh mục này chưa gán trạng thái đạt.

## Bổ sung FR-AI — Gợi ý tham khảo (18/11/2026)

- FR-AI-01: Chủ sở hữu dataset online phân tích mọi cột của published version theo tab hiện tại mà không cần chọn cột/phương pháp. Mỗi lượt AI xét tối đa 12 ứng viên, chọn tối đa năm gợi ý; UI tự gọi tiếp đến hết và gộp kết quả, không cắt bỏ phần cuối.
- FR-AI-02: Hiển thị phương pháp/cột hoặc toàn dataset, lý do, evidence và caution; có trạng thái loading, empty, lỗi, tiến độ nhiều lượt, chưa hoàn tất và AI chưa hỗ trợ offline.
- FR-AI-03: Người dùng chọn Xem trước gợi ý để nạp phương pháp/tham số/phạm vi và tạo Preview; chỉ Apply tường minh mới công bố thay đổi. Bỏ qua gợi ý không có mutation.
- FR-AI-04: Đổi tab/version phải hủy/bỏ kết quả cũ; đổi cột/phương pháp thủ công giữ gợi ý. Hiển thị tiến độ và chưa hoàn tất khi lỗi/dừng. Backend xác thực/ownership, validate DTO và kết quả mô hình, dry-run và loại invalid/no-op.
- FR-AI-05: Chỉ gửi evidence thống kê/phương pháp ứng viên tới Ollama local; không lưu gợi ý, không tự Apply, không cloud fallback. Xem [danh mục ứng viên và nghiệm thu](../architecture/local-ai.md).
