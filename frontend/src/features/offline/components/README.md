# offline/components

Giao diện của feature: hiển thị model, nhận callback và phát sự kiện tương tác. Logic tải/xử lý/lưu dữ liệu ở hooks, HTTP/adapter ở api. Page là đầu mối ghép màn hình; renderer giữ state trình bày khi cần.

- [OfflineWorkspaceView.tsx](OfflineWorkspaceView.tsx)
- [LocalWorkspacePane.tsx](LocalWorkspacePane.tsx)
- [SyncCenter.tsx](SyncCenter.tsx)
- [ProjectRecovery.tsx](ProjectRecovery.tsx)
- [SyncCoordinator.tsx](SyncCoordinator.tsx)

Dùng public index của feature từ app/feature khác; không import sâu component nội bộ. Tên public cũ như ProcessingPanel/AnalysisPanel/HistoryPanel/ImportWizard hiện trỏ đến page container để giữ tương thích, không dùng chúng để bỏ qua hook.
