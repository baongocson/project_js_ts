# auth/pages

`AuthPage.tsx` là form register/login; `ProfilePage.tsx` cập nhật hồ sơ/theme và lắp AccountActions.

Dùng public index của feature khi import từ app hoặc feature khác. Không đặt token trong local storage/snapshot/outbox. Luồng và lệnh kiểm thử ở [README feature](../README.md); acceptance dùng HTTPS/Nest/MongoDB replica tạm cục bộ.
