# processing/components

`MethodParameters.tsx` cung cấp typed controls cho 27 method. `ProcessingPanel.tsx` tách Preview khỏi Apply, chặn stale/no-op/expiry và retry key cũ. `PreviewView.tsx` hiển thị diff/schema/diagnostics/pagination.

Dùng public index của feature khi import từ app hoặc feature khác. Không đặt token trong local storage/snapshot/outbox. Luồng và lệnh kiểm thử ở [README feature](../README.md); acceptance dùng HTTPS/Nest/MongoDB replica tạm cục bộ.
