# Khảo sát repository

Ngày 18/11/2026. Chỉ đọc ứng dụng, không thay code, không deploy hoặc chạy tải.

Prompt có sẵn: 00, 01, 02, 04, 05. **Không có prompt 03 trong thư mục được cung cấp.** Giai đoạn dựng/xuất thực hiện theo yêu cầu của 00–02 và 05, không tự nhận đã đọc file thiếu.

| Thành phần | Nguồn | Trạng thái | Phạm vi bằng chứng |
|---|---|---|---|
|Bài toán / yêu cầu|docs/requirements/problem-statement.md|Chỉ thiết kế|FR/NFR/Use Case là tiêu chí, không tự chứng minh chạy đạt.|
|Frontend React/Vite|frontend/src/app/router.tsx|Đã triển khai có kiểm chứng|Mã router, ảnh acceptance và báo cáo FE. Chưa chạy lại trong phiên tạo slide.|
|Processing Preview–Apply|backend/src/modules/processing/processing.service.ts|Đã triển khai có kiểm chứng|Có controller/service/repository và acceptance screenshot.|
|MongoDB / 12 collection|backend/src/infrastructure/database/collection-contracts.ts|Đã triển khai có kiểm chứng|Hợp đồng schema/index trong code; integration và benchmark replica tạm được lưu.|
|AI Qwen3 / Ollama|backend/src/modules/ai/ai.service.ts|Đã triển khai có kiểm chứng|Có code, báo cáo smoke và raw k6 warm Missing batch 0; chưa suy rộng mọi nhóm.|
|Offline / đồng bộ|frontend/src/features/offline/project-sync.ts|Đã triển khai có kiểm chứng|Có source, acceptance và báo cáo; cần cùng engine và kiểm account/head.|
|Docker / Nginx local|docs/nginx-deployment-report.md|Đã triển khai có kiểm chứng|Báo cáo kiểm tra chỉ đọc HTTPS/health/SPA. Chưa chứng minh login/upload/AI qua Nginx.|
|Production Internet|compose.production.yaml|Chỉ thiết kế|Có cấu hình/hướng dẫn. Chưa có DNS/domain/certificate/public probe.|
|AI Compose|compose.ai.yaml|Đã triển khai chưa kiểm chứng|Có cấu hình. Báo cáo Nginx không nghiệm thu inference qua Docker.|
|Tải API theo NFR-18|docs/performance/results/2026-11-18T12-32-43-038Z-load/summary.json|Một phần|Raw kết quả có thật nhưng không đạt 4 threshold lần chạy lại.|
|Dữ liệu / AI warm|docs/performance/results/2026-11-18T12-43-12-297Z-data/summary.json|Đã triển khai có kiểm chứng|Chỉ đạt fixture local, dữ liệu 20 workflow và AI 20 lượt.|
|LCP / CLS / FPS|docs/requirements/non-functional-requirements.md|Chưa có|Chưa có bằng chứng phép đo theo điều kiện NFR trong repository đã khảo sát.|
|Backup / RPO / RTO|docs/requirements/non-functional-requirements.md|Chỉ thiết kế|Có yêu cầu, chưa có biên bản diễn tập đạt mục tiêu.|
|Chi phí AI|docs/architecture/local-ai.md|Chưa có|Chưa có bằng chứng trong repository về điện năng/chi phí phần cứng/phân bổ vận hành.|

## Cấu trúc
- frontend/src/app, features, shared; Vite, React Router, hooks.
- backend/src/modules: auth, users, projects, datasets, processing, history, analysis, ai. Controller/service/repository; schema tập trung tại infrastructure/database.
- packages/data-core: types, cell, csv, codec, processing, analysis, sync-contract.
- scripts/performance: k6 và runner cô lập. scripts/check-nginx.mjs kiểm local chỉ đọc.
- test: backend/src/test, frontend/test, packages/data-core/test.

## Tài liệu cũ khác code
- docs/database/database.md còn ghi chưa có codec/blob storage. Code packages/data-core/src/codec.ts và SnapshotPublisherService.prepare đã encode snapshot và writeChunk. Slide lấy hiện trạng code.
- docs/architecture/architecture.md còn mô tả FE chuyên sâu/Docker AI chưa hoàn thiện. Code/Compose và báo cáo ngày 18/11 được ưu tiên đúng phạm vi.
- API.md có bảng cũ 27 endpoint trước AI; không dùng tổng đó để khẳng định tổng endpoint hiện hành. Có 28 method xử lý theo phần bổ sung, gồm edit_cell.
- Số test khác nhau giữa báo cáo FE và AI là các lượt riêng, không cộng thành một kết quả hiện tại.
