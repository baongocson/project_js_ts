# analysis/api

`analysis-adapters.ts` tách online HTTP và local full-snapshot calculations qua cùng Data Core.

Dùng public index của feature khi import từ app hoặc feature khác. Không đặt token trong local storage/snapshot/outbox. Luồng và lệnh kiểm thử ở [README feature](../README.md); acceptance dùng HTTPS/Nest/MongoDB replica tạm cục bộ.
