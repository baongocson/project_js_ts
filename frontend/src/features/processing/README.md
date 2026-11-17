# Feature processing

`ProcessingPanel` là UI dùng chung cho online/local qua `ProcessingAdapter`; app lắp panel vào workspace. Không import app hoặc backend runtime.

- Typed controls cho 27 method trong panel (thêm TF-IDF; edit_cell chuyển sang bảng dòng 3D); JSON chỉ là lựa chọn nâng cao. `makeSpecification` kiểm typed cell, enum, timezone, numeric bounds và mapping/boolean duplicates trước request hoặc local execution.
- `onlineProcessing` gọi Preview/Get/Apply, value-counts toàn cột để tạo mapping ordinal. Preview không thay published version; diff phân trang, summary/schema/diagnostics và expiry được hiển thị. Không Apply khi diff chưa đọc, invalid/no-op/expired hoặc form thay đổi.
- Apply giữ key khi mất response và khóa form tới khi kiểm receipt. Nếu lỗi terminal trước write, người dùng có thể tạo lại preview. Local adapter ở feature offline giữ candidate tạm, ghi snapshot/history/outbox nguyên tử dưới Web Lock khi Apply, từ chối base local stale.
- `projectPreview` dùng chung từ Data Core cho local/backend, không fork thuật toán đếm/statistics.

Kiểm tra: `npm run test:unit -w frontend`, `npm run test:acceptance -w frontend`. Acceptance thao tác 27 fixture trong panel; fixture edit_cell kiểm riêng từ điểm 3D online và offline, giữ bảng trước Apply, sync/parity, receipt loss/restore, expiry/diff failure và stale local tab. Các tests không thay thế nghiệm thu mọi tổ hợp scope/biên và UI cuối.
