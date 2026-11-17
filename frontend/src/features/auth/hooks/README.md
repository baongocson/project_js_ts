# auth/hooks

`session.ts` quản lý access token trong bộ nhớ, bootstrap/refresh single-flight, cookie lock, BroadcastChannel và generation/owner fences.

Dùng public index của feature khi import từ app hoặc feature khác. Không đặt token trong local storage/snapshot/outbox. Luồng và lệnh kiểm thử ở [README feature](../README.md); acceptance dùng HTTPS/Nest/MongoDB replica tạm cục bộ.
