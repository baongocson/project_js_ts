# Truy vết Preview–Apply online

Nghiệp vụ: uppercase hai giá trị text a/b thành A/B trong fixture acceptance, không phải dữ liệu người dùng.

| Bước | File và hàm | Input | Output / lỗi |
|---|---|---|---|
| 1. Click Preview | frontend/src/features/processing/components/ProcessingPanel.tsx: ProcessingPanel | lựa chọn method, scope, parameters | work(preview) |
| 2. Tạo specification | frontend/src/features/processing/hooks/useProcessing.ts: useProcessing.preview/createPreview | method=uppercase, columnIds | makeSpecification; pending key cố định theo payload |
| 3. Adapter | frontend/src/features/processing/api/online-processing.ts: onlineProcessing.preview | spec, key, datasetId/versionId bound | processingApi.preview |
| 4. HTTP | frontend/src/features/processing/api/processing-api.ts: processingApi.preview; frontend/src/shared/api/http-client.ts: requestJson | POST datasets/:datasetId/previews; body={baseVersionId,specification}; Idempotency-Key | Bearer trong memory transport; 201 hoặc ApiError/NetworkError |
| 5. Controller | backend/src/modules/processing/processing.controller.ts: createPreview | Principal + DTO + key | ProcessingService.createPreview |
| 6. Nghiệp vụ | backend/src/modules/processing/processing.service.ts: createPreview | quyền sở hữu, version, receipt | processSnapshot; publisher.prepare; record preview + changes; 201 response |
| 7. DB | backend/src/modules/datasets/snapshot-publisher.service.ts: prepare; backend/src/modules/processing/processing.repository.ts: insert/insertChanges/ready | candidate/schema/chunks/diff | datasetVersions, versionColumns, dataChunks, processingPreviews, previewChanges, idempotencyRecords |
| 8. Render | frontend/src/features/processing/hooks/useProcessing.ts: createPreview/page; frontend/src/features/processing/api/processing-api.ts: get | GET previews/:previewId?page=1&limit=50 | PreviewView nhận preview/changes; previewLoaded=true |
| 9. Click Apply | frontend/src/features/processing/hooks/useProcessing.ts: apply; frontend/src/features/processing/api/processing-api.ts: apply | POST datasets/:datasetId/operations; body={previewId}; key riêng | retryApply giữ key cho kết quả chưa xác định |
| 10. Publish | backend/src/modules/processing/processing.service.ts: apply; backend/src/modules/datasets/snapshot-publisher.service.ts: publish | ownership → claim/replay receipt → validate preview/base | transaction: datasets.publishCandidate CAS → repository.markApplied → operations.append → receipts.complete |
| 11. Response | backend/src/modules/processing/processing.service.ts: apply response mapper | candidateVersionId, operationId, revision | 201 {operation:{...},dataset:{currentVersionId,revision}} |
| 12. UI mới | frontend/src/features/processing/hooks/useProcessing.ts: apply; frontend/src/app/components/WorkspaceView.tsx: onApplied={load}; frontend/src/app/hooks/useWorkspace.ts: load/install | await onApplied() | tải project, metadata, rows theo head mới |

## Nhánh lỗi
- 401 xác thực; 403 ownership; 400 DTO; 409 base stale/conflict/no-op; 410 preview expired. Source: controller/service/preview-read-policy.ts/preview-policy.ts và ApiExceptionFilter.
- useProcessing.work đặt error cho Feedback. Preview stale/expired/not ready/canApply=false hoặc chưa tải diff thì khóa Apply mới.
- Mất response Apply: giữ applyAttempt key, hiển thị kiểm tra lại, không tạo key mới tự động. Receipt replay diễn ra sau quyền, trước kiểm stale của yêu cầu mới.
- Offline không chèn backend giả: engine ở browser và commit IndexedDB. Runtime sync thật dùng project-sync.ts, không lấy replay.ts fixture để đại diện UI.

Sequence hai chiều: xem assets/diagrams/sequence.svg và slide 24.
