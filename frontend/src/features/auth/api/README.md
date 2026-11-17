# auth/api

`auth-api.ts` khai báo register/login/refresh/logout/me/patch/delete qua shared requestJson.

Dùng public index của feature khi import từ app hoặc feature khác. Không đặt token trong local storage/snapshot/outbox. Luồng và lệnh kiểm thử ở [README feature](../README.md); acceptance dùng HTTPS/Nest/MongoDB replica tạm cục bộ.
