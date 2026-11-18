# Báo cáo bàn giao Dashboard 3D

## Kết quả
**33 slide**, 16:9 Academic Minimalism. Khung tối đa **15:00**, kịch bản mục tiêu **14:15** +45s dự phòng. Thời gian cần luyện với người nói thực tế.

## File chính
- D:/JS_TS/project_js_ts/docs/slide/output/Dashboard_3D_Presentation.pptx
- D:/JS_TS/project_js_ts/docs/slide/output/Dashboard_3D.html
- D:/JS_TS/project_js_ts/docs/slide/output/Dashboard_3D_package.zip (slide, tài liệu và assets, không gồm .build hoặc secret)

## Tài liệu đã tạo
- D:/JS_TS/project_js_ts/docs/slide/01_repo_inventory.md
- D:/JS_TS/project_js_ts/docs/slide/02_evidence_matrix.md
- D:/JS_TS/project_js_ts/docs/slide/03_missing_evidence.md
- D:/JS_TS/project_js_ts/docs/slide/04_slide_outline.md
- D:/JS_TS/project_js_ts/docs/slide/05_slide_content.md
- D:/JS_TS/project_js_ts/docs/slide/06_workflow_trace.md
- D:/JS_TS/project_js_ts/docs/slide/07_design_spec.md
- D:/JS_TS/project_js_ts/docs/slide/08_diagram_sources.md
- D:/JS_TS/project_js_ts/docs/slide/09_build_and_usage.md
- D:/JS_TS/project_js_ts/docs/slide/10_qa_report.md
- D:/JS_TS/project_js_ts/docs/slide/11_kich_ban_thuyet_trinh_15_phut.md
- D:/JS_TS/project_js_ts/docs/slide/12_ban_hoc_nhanh.md
- D:/JS_TS/project_js_ts/docs/slide/13_cau_hoi_giang_vien.md
- D:/JS_TS/project_js_ts/docs/slide/14_time_check.md
- D:/JS_TS/project_js_ts/docs/slide/15_bao_cao_nghiem_thu.md

## Hình và sơ đồ
- D:/JS_TS/project_js_ts/docs/slide/assets/diagrams/ai.svg
- D:/JS_TS/project_js_ts/docs/slide/assets/diagrams/architecture.svg
- D:/JS_TS/project_js_ts/docs/slide/assets/diagrams/backend.svg
- D:/JS_TS/project_js_ts/docs/slide/assets/diagrams/core.svg
- D:/JS_TS/project_js_ts/docs/slide/assets/diagrams/database.svg
- D:/JS_TS/project_js_ts/docs/slide/assets/diagrams/deployment.svg
- D:/JS_TS/project_js_ts/docs/slide/assets/diagrams/frontend.svg
- D:/JS_TS/project_js_ts/docs/slide/assets/diagrams/offline.svg
- D:/JS_TS/project_js_ts/docs/slide/assets/diagrams/sequence.svg
- D:/JS_TS/project_js_ts/docs/slide/assets/diagrams/usecase.svg
- D:/JS_TS/project_js_ts/docs/slide/assets/diagrams/userflow.svg
- D:/JS_TS/project_js_ts/docs/slide/assets/diagrams/version.svg
- 4 screenshot thật: assets/screenshots/login.png, collection.png, preview.png, webgl.png; nguồn gốc tại 08_diagram_sources.md.
- 2 biểu đồ native chỉnh sửa được, số liệu load và data của lần k6 chạy lại.

## Nguồn chính
- docs/requirements/problem-statement.md, docs/requirements/non-functional-requirements.md, docs/useCase/use-cases.md: yêu cầu và tác nhân.
- frontend/src/features/processing/hooks/useProcessing.ts, frontend/src/features/processing/api/processing-api.ts, backend/src/modules/processing/processing.controller.ts, backend/src/modules/processing/processing.service.ts, backend/src/modules/datasets/snapshot-publisher.service.ts, backend/src/infrastructure/database/collection-contracts.ts: chứng minh triển khai và workflow.
- backend/src/modules/ai/ai.service.ts, docs/architecture/local-ai.md: AI local và persistence.
- docs/reports/frontend-fix-review-2026-11-18.md, docs/reports/local-ai-implementation-2026-11-18.md: phạm vi các lượt kiểm thử.
- docs/performance/rerun-2026-11-18.md và ba thư mục results/2026-11-18T12-32-43-038Z-load, 12-43-12-297Z-data, 12-45-12-447Z-ai: raw metrics.
- Dockerfile, compose.yaml, compose.production.yaml, docs/nginx-deployment-report.md: đóng gói và giới hạn local/public.

## Bằng chứng cần bổ sung
Prompt 03 chưa có. Chưa có đo LCP/CLS/FPS/RPO/RTO, full logs cho mọi số test, public deployment, AI cold/full multi-batch và chi phí vận hành. Tải API **chưa đạt NFR-18**, không bị che bởi 0% lỗi request đã gửi. Xem 03_missing_evidence.md.

## QA và giới hạn
33 slide đã render/xem, cấu trúc/layout/font policy/import và workbook chart qua kiểm tra, không lỗi/cảnh báo hình học. HTML đã mở bằng Edge headless, kiểm 33 trang, điều hướng và notes. Đã đọc PPTX thực tế để đối chiếu kịch bản. **Chưa mở PowerPoint native và chưa bấm giờ người nói.** Xem 10_qa_report.md. Không sửa code nghiệp vụ, không deploy hoặc chạy stress test.
