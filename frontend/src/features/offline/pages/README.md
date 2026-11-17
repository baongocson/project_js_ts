# offline/pages

`OfflineWorkspace.tsx` lắp local workspace, tài khoản chung, import, history/restore, recovery và sync. Không tự định nghĩa engine hoặc HTTP client riêng.

Dùng public index của feature khi import từ app hoặc feature khác. Không đặt token trong local storage/snapshot/outbox. Luồng và lệnh kiểm thử ở [README feature](../README.md); acceptance dùng HTTPS/Nest/MongoDB replica tạm cục bộ.
