# analysis/components

Giao diện của feature: hiển thị model, nhận callback và phát sự kiện tương tác. Logic tải/xử lý/lưu dữ liệu ở hooks, HTTP/adapter ở api. Page là đầu mối ghép màn hình; renderer giữ state trình bày khi cần.

- [AnalysisPanel.tsx](AnalysisPanel.tsx)
- [BoxplotPanel.tsx](BoxplotPanel.tsx)
- [PointRowTable.tsx](PointRowTable.tsx)
- [Scatter3D.tsx](Scatter3D.tsx)
- [ScatterFallback.tsx](ScatterFallback.tsx)

Dùng public index của feature từ app/feature khác; không import sâu component nội bộ. Tên public cũ như ProcessingPanel/AnalysisPanel/HistoryPanel/ImportWizard hiện trỏ đến page container để giữ tương thích, không dùng chúng để bỏ qua hook.
