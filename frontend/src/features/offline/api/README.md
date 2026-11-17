# Offline API boundary

Runtime `ProjectApi` ở `../project-sync.ts` dùng `requestJson` của shared/api cho cả chuỗi create/import/preview/Apply/restore/read. Chuỗi được pin vào owner đã xác thực; keys và checkpoint do protocol project-sync quản lý. Không tạo HTTP client thứ hai, không hard-code API URL hoặc lưu token trong outbox.

`OfflineApiAdapter` cũ đã bỏ; pure queue/replay fixtures vẫn có public exports để kiểm protocol cho dataset đã map sẵn. Chúng không thay luồng runtime CSV/ID mapping. Xem [README feature](../README.md).
