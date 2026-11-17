# Ma trận processing frontend — 16/11/2026

> Cập nhật tiếp theo: [EDA, sửa ô3D và TF-IDF ngày17/11](frontend-eda-tfidf-2026-11-17.md). Các giới hạn/mốc27method bên dưới phản ánh thời điểm trước bổ sung này.

Working tree `dev-frontend`, nền `43a5422`. Bảng ghi phạm vi **fixture success đã quan sát**, không chứng minh mọi tổ hợp tham số/scope. Chưa commit/push.

- Form typed tại `MethodParameters.tsx`, scope/validation tại `methods.ts`; cùng `ProcessingPanel` cho online và local adapter.
- Preview/Get/Apply online qua HTTPS/Nest/MongoDB replica tạm. Local chạy core, preview không ghi current; Apply atomically ghi current/history/outbox dưới Web Lock, kiểm base version.
- Browser test nhập bằng controls riêng, **không dùng JSON shortcut**, đủ 27 fixture trong `packages/data-core/fixtures/processing-acceptance.json`. Online kiểm bảng không đổi trước Apply, version 2 và history 2 operations sau Apply. Local tạo Preview/Apply rồi sync; runtime đối chiếu candidate trước publish và snapshot sau receipt.
- Bộ browser đã mở rộng và toàn **25/25 PASS** gồm 27 online + 27 offline fixture loops; có expiry/diff failure/local stale tab, invalid/no-op, lost Apply receipt, restore, pre-Apply mismatch và safe expired-preview retry. Gate cuối đã gồm draft, shared import/table, storage migration/config/quota và analysis/3D; kết quả chi tiết ở báo cáo tiến độ.

| Method | Scope UI cho phép | Scope fixture đã chạy | Form typed | Online Preview/Apply | Local Preview/Apply | Sync parity |
| --- | --- | --- | --- | --- | --- | --- |
| edit_cell | cell | cell | [x] | [x] | [x] | [x] |
| remove_duplicates | dataset | dataset | [x] | [x] | [x] | [x] |
| strip_html | cell / columns / dataset | columns (1) | [x] | [x] | [x] | [x] |
| normalize_whitespace | cell / columns / dataset | columns (1) | [x] | [x] | [x] | [x] |
| uppercase | cell / columns / dataset | columns (1) | [x] | [x] | [x] | [x] |
| lowercase | cell / columns / dataset | columns (1) | [x] | [x] | [x] | [x] |
| replace_value | cell / columns / dataset | columns (1) | [x] | [x] | [x] | [x] |
| convert_number | columns / dataset | columns (1) | [x] | [x] | [x] | [x] |
| convert_text | columns / dataset | columns (1) | [x] | [x] | [x] | [x] |
| convert_date | columns / dataset | columns (1) | [x] | [x] | [x] | [x] |
| convert_datetime | columns / dataset | columns (1) | [x] | [x] | [x] | [x] |
| convert_boolean | columns / dataset | columns (1) | [x] | [x] | [x] | [x] |
| fill_mean | cell / columns / dataset | columns (1) | [x] | [x] | [x] | [x] |
| fill_median | cell / columns / dataset | columns (1) | [x] | [x] | [x] | [x] |
| fill_mode | cell / columns / dataset | columns (1) | [x] | [x] | [x] | [x] |
| fill_max | cell / columns / dataset | columns (1) | [x] | [x] | [x] | [x] |
| fill_constant | cell / columns / dataset | columns (1) | [x] | [x] | [x] | [x] |
| drop_missing_rows | columns / dataset | columns (1) | [x] | [x] | [x] | [x] |
| drop_missing_columns | columns / dataset | columns (1) | [x] | [x] | [x] | [x] |
| clip_iqr | cell / columns / dataset | columns (1) | [x] | [x] | [x] | [x] |
| clip_zscore | cell / columns / dataset | columns (1) | [x] | [x] | [x] | [x] |
| scale_minmax | cell / columns / dataset | columns (1) | [x] | [x] | [x] | [x] |
| standardize | cell / columns / dataset | columns (1) | [x] | [x] | [x] | [x] |
| log1p | cell / columns / dataset | columns (1) | [x] | [x] | [x] | [x] |
| square | cell / columns / dataset | columns (1) | [x] | [x] | [x] | [x] |
| one_hot | columns / dataset | columns (1) | [x] | [x] | [x] | [x] |
| ordinal | columns (1) | columns (1) | [x] | [x] | [x] | [x] |

Các tham số cố định theo contract (keep=first, match=exact, canonical, inputFormat, tieBreak) hiển thị giải thích, không tạo lựa chọn backend không hỗ trợ. Mapping ordinal tải category non-missing từ toàn cột và sửa nhãn; typed editor giữ null/empty/whitespace/date/datetime/number/boolean/text.

Bằng chứng: `frontend/test/acceptance/method-form.ts`, `processing-workspace.spec.ts`, `offline-server.spec.ts`; `frontend/test/unit/processing.test.ts` kiểm 27 specification qua boundary và các input invalid. Case invalid/no-op/expiry/retry là gate riêng, không tự đánh dấu mọi biên của từng method đạt. Scope nhiều cột/dataset/cell ngoài fixture và các tổ hợp phức tạp còn cần bổ sung gate trong nghiệm thu cuối.
