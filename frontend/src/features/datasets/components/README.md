# datasets/components

Giao diện của feature: hiển thị model, nhận callback và phát sự kiện tương tác. Logic tải/xử lý/lưu dữ liệu ở hooks, HTTP/adapter ở api. Page là đầu mối ghép màn hình; renderer giữ state trình bày khi cần.

- [DataTableView.tsx](DataTableView.tsx)
- [ImportWizard.tsx](ImportWizard.tsx)
- [TypedTable.tsx](TypedTable.tsx)

Dùng public index của feature từ app/feature khác; không import sâu component nội bộ. Tên public cũ như ProcessingPanel/AnalysisPanel/HistoryPanel/ImportWizard hiện trỏ đến page container để giữ tương thích, không dùng chúng để bỏ qua hook.
