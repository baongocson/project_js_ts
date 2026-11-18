# Nguồn sơ đồ và ảnh

Sơ đồ tổng hợp theo code triển khai, không khẳng định runtime hiện tại. PPTX chứa đối tượng native editable. SVG và source authoring ở .build/diagrams.mjs để sửa/tái tạo.

- assets/diagrams/usecase.svg: `docs/useCase/use-cases.md`, `frontend/src/app/router.tsx`, `backend/src/modules/ai/ai.controller.ts`
- assets/diagrams/userflow.svg: `frontend/src/app/router.tsx`, `frontend/src/features/processing/hooks/useProcessing.ts`, `frontend/src/features/processing/components/ProcessingPanel.tsx`, `frontend/src/shared/api/http-client.ts`
- assets/diagrams/architecture.svg: `backend/src/app.module.ts`, `frontend/src/app/router.tsx`, `compose.yaml`, `backend/src/modules/ai/ai.service.ts`
- assets/diagrams/core.svg: `packages/data-core/README.md`, `packages/data-core/src/types.ts`, `packages/data-core/src/processing.ts`, `docs/api/API.md`
- assets/diagrams/database.svg: `backend/src/infrastructure/database/collection-contracts.ts`
- assets/diagrams/version.svg: `backend/src/modules/datasets/snapshot-publisher.service.ts`, `backend/src/modules/datasets/datasets.repository.ts`, `backend/src/infrastructure/database/collection-contracts.ts`, `backend/src/modules/history/history.service.ts`
- assets/diagrams/ai.svg: `backend/src/modules/ai/ai.controller.ts`, `backend/src/modules/ai/ai.service.ts`, `backend/src/modules/ai/ollama.service.ts`, `docs/architecture/local-ai.md`
- assets/diagrams/frontend.svg: `docs/reports/frontend-feature-structure-2026-11-18.md`, `frontend/scripts/check-architecture.mjs`, `frontend/src/app/hooks/useWorkspace.ts`
- assets/diagrams/backend.svg: `backend/src/app.module.ts`, `backend/src/modules/processing/processing.controller.ts`, `backend/src/modules/processing/processing.service.ts`, `backend/src/modules/processing/processing.repository.ts`, `backend/src/common/filters/api-exception.filter.ts`
- assets/diagrams/sequence.svg: `frontend/src/features/processing/hooks/useProcessing.ts`, `frontend/src/features/processing/api/online-processing.ts`, `frontend/src/features/processing/api/processing-api.ts`, `backend/src/modules/processing/processing.controller.ts`, `backend/src/modules/processing/processing.service.ts`, `backend/src/modules/processing/processing.repository.ts`, `backend/src/modules/datasets/snapshot-publisher.service.ts`, `frontend/src/app/hooks/useWorkspace.ts`, `frontend/src/app/components/WorkspaceView.tsx`
- assets/diagrams/offline.svg: `frontend/src/features/offline/README.md`, `frontend/public/offline-worker.js`, `frontend/src/features/offline/project-sync.ts`, `frontend/src/features/offline/project-store.ts`
- assets/diagrams/deployment.svg: `Dockerfile`, `compose.yaml`, `docker/nginx/default.conf.template`, `docs/nginx-deployment-report.md`

## Screenshot thật
- assets/screenshots/login.png ← frontend/test-results/acceptance/ui-quality-auth-profile-da-c3cc7-in-usable-on-narrow-screens/login-mobile.png. Chỉ crop, không dựng lại giao diện hoặc thay dữ liệu.
- assets/screenshots/collection.png ← frontend/test-results/acceptance/reference-workspace-refere-f8cb2-tory-keep-current-semantics/reference-collection-desktop.png. Chỉ crop, không dựng lại giao diện hoặc thay dữ liệu.
- assets/screenshots/preview.png ← frontend/test-results/acceptance/processing-workspace-onlin-e5dc8-ore-creates-a-fresh-version/processing-preview-desktop.png. Chỉ crop, không dựng lại giao diện hoặc thay dữ liệu.
- assets/screenshots/webgl.png ← frontend/test-results/acceptance/reference-workspace-refere-f8cb2-tory-keep-current-semantics/reference-webgl.png. Chỉ crop, không dựng lại giao diện hoặc thay dữ liệu.

## Biểu đồ
- Slide 30: load/summary.json, p95 5 nhóm, đơn vị giây.
- Slide 31: data/summary.json, 6 trong 12 nhóm, đơn vị giây. AI ghi riêng bằng chữ theo aimetric.
- Source raw đầy đủ: docs/performance/results/2026-11-18T12-32-43-038Z-load/summary.json, docs/performance/results/2026-11-18T12-43-12-297Z-data/summary.json, docs/performance/results/2026-11-18T12-45-12-447Z-ai/summary.json.
