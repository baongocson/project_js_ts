# Trang cấp app

SystemOverviewPage.tsx giữ nội dung trang chủ trước refactor: trạng thái backend và mô tả luồng sẽ triển khai. Dùng useBackendHealth của app và Section từ shared; không tuyên bố các feature đã hoạt động.

index.ts export page cho router. Các màn hình nghiệp vụ sau này nằm tại features/<name>/pages. E2E tại test/E2E/system.e2e.spec.ts; chạy `npm run test:e2e:frontend` từ gốc repo.
