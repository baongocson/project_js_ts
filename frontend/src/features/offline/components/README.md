# offline/components

`LocalWorkspacePane.tsx` lắp table/processing/analysis trên workspace local CAS. `ProjectRecovery.tsx` quản lý backup/source recovery/delete local. `SyncCenter.tsx` hiển thị progress/outbox/retry/conflict/server copy.

Dùng public index của feature khi import từ app hoặc feature khác. Không đặt token trong local storage/snapshot/outbox. Luồng và lệnh kiểm thử ở [README feature](../README.md); acceptance dùng HTTPS/Nest/MongoDB replica tạm cục bộ.
