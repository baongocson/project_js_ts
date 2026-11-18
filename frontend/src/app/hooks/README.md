# Hook cấp app

use-backend-health.ts giữ trạng thái kiểm tra kết nối. Effect tạo AbortController, gọi getHealth từ shared, hiển thị kết quả hoặc lỗi và hủy yêu cầu khi unmount. Đây là kiểm tra hạ tầng của app, không thuộc nghiệp vụ auth hoặc analysis.

index.ts export useBackendHealth cho page. E2E system kiểm kết nối backend thật, HTTP 503 và lỗi mạng. Chạy `npm run test:e2e:frontend` từ gốc repo.

## Workspace

[useWorkspace.ts](useWorkspace.ts) điều phối workspace online qua public API của các feature: tải project/dataset, autosave revision, draft recovery, selection và khóa điều hướng. app/pages/WorkspacePage ghép hook với app/components/WorkspaceView.
