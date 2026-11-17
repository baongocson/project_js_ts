# datasets/components

`ImportWizard.tsx` dùng typed CSV core cho preview/override và exact source/options. `DataTableView.tsx` quản lý typed filter/sort/page/selection; `TypedTable.tsx` hiển thị typed cells/missing rõ ràng.

Dùng public index của feature khi import từ app hoặc feature khác. Không đặt token trong local storage/snapshot/outbox. Luồng và lệnh kiểm thử ở [README feature](../README.md); acceptance dùng HTTPS/Nest/MongoDB replica tạm cục bộ.
