# auth/components

`AccountActions.tsx` dùng chung cho Profile và offline: kiểm pending/draft dưới khóa, xác nhận logout/delete, giữ/xóa local tường minh và chặn dialog stale khi đổi tài khoản.

Dùng public index của feature khi import từ app hoặc feature khác. Không đặt token trong local storage/snapshot/outbox. Luồng và lệnh kiểm thử ở [README feature](../README.md); acceptance dùng HTTPS/Nest/MongoDB replica tạm cục bộ.
