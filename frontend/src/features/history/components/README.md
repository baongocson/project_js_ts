# history/components

`HistoryPanel.tsx` đọc history phân trang/lọc, xác nhận restore với base version và stable receipt key, rồi refresh workspace.

Dùng public index của feature khi import từ app hoặc feature khác. Không đặt token trong local storage/snapshot/outbox. Luồng và lệnh kiểm thử ở [README feature](../README.md); acceptance dùng HTTPS/Nest/MongoDB replica tạm cục bộ.
