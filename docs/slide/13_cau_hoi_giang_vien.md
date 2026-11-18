# Câu hỏi dự đoán và trả lời

Trả lời trong 15–30 giây, mở đúng file nếu cần chứng minh. Không coi thiết kế là kết quả nghiệm thu.

## 1. Tại sao cần Preview rồi mới Apply?

Em dùng Preview để chuẩn bị candidate và cho người dùng kiểm tra diff/diagnostics. Apply mới publish và đổi head. Invalid, no-op hoặc stale không được tạo version xử lý mới.

Căn cứ: `backend/src/modules/processing/processing.service.ts`, `frontend/src/features/processing/components/ProcessingPanel.tsx`

## 2. CAS là gì và chống xung đột thế nào?

CAS là compare-and-swap. Backend chỉ đổi currentVersion/revision khi base vẫn khớp. Khi hai thao tác cùng xuất phát một bản nền, thao tác sau phải nhận lỗi stale thay vì ghi đè.

Căn cứ: `backend/src/modules/datasets/datasets.repository.ts`, `backend/src/modules/datasets/snapshot-publisher.service.ts`

## 3. Mất response sau commit có xử lý lặp không?

Frontend giữ Idempotency-Key của lần Apply. Backend kiểm quyền rồi claim/replay receipt đã commit trước các kiểm tra stale cho yêu cầu mới. Cùng key khác payload trả conflict. Em không đổi key để bỏ qua trạng thái chưa xác định.

Căn cứ: `frontend/src/features/processing/hooks/useProcessing.ts`, `backend/src/modules/processing/processing.service.ts`, `backend/src/infrastructure/idempotency/idempotency.service.ts`

## 4. Transaction chứa gì?

publishCandidate, markApplied, append operation và complete receipt cùng transaction. Candidate/schema/chunks chuẩn bị trước, trong các batch được kiểm lease/fence. Không đưa inference AI vào transaction publish.

Căn cứ: `backend/src/modules/datasets/snapshot-publisher.service.ts`, `backend/src/modules/processing/processing.service.ts`

## 5. Restore có sửa phiên bản cũ không?

Restore tạo một candidate rồi công bố version mới, lưu restoredFromVersionId. Published snapshot giữ nguyên để truy vết.

Căn cứ: `backend/src/infrastructure/database/collection-contracts.ts`, `backend/src/modules/history/history.service.ts`

## 6. Tại sao MongoDB cần replica set?

Luồng publish dùng transaction nhiều collection. Code startup và cấu hình database yêu cầu môi trường hỗ trợ transaction. Docker local khởi tạo rs0, còn test dùng replica tạm.

Căn cứ: `compose.yaml`, `backend/src/infrastructure/database/database.connection.ts`, `backend/src/modules/datasets/snapshot-publisher.service.ts`

## 7. Có phải mỗi dòng dữ liệu là một document?

Không. Metadata nằm trong collection, còn typed cells được encode thành dataChunks theo version, tối đa 4 MiB/chunk. Vì thế index metadata không tự thành index giá trị từng ô.

Căn cứ: `backend/src/infrastructure/database/collection-contracts.ts`, `packages/data-core/src/codec.ts`

## 8. Frontend gọi API ở đâu?

processingApi trong features/processing/api tạo URL/body. requestJson ở shared/api/http-client.ts gắn xác thực, đọc envelope lỗi và kiểm tài khoản khi replay. Hook useProcessing giữ state, key và điều khiển UI.

Căn cứ: `frontend/src/features/processing/api/processing-api.ts`, `frontend/src/shared/api/http-client.ts`, `frontend/src/features/processing/hooks/useProcessing.ts`

## 9. Khi offline, backend có xử lý không?

Phép biến đổi local chạy bằng data-core trong browser và commit IndexedDB. Khi có mạng, project-sync mới đối chiếu tài khoản, ID mapping, engine và head trước khi replay API. Conflict giữ nguyên bản local.

Căn cứ: `frontend/src/features/offline/README.md`, `frontend/src/features/offline/project-sync.ts`

## 10. Filter bảng có giới hạn dữ liệu xử lý không?

Filter là trạng thái truy vấn/hiển thị. Processing sử dụng scope theo specification, statisticsScope là whole-columns. Người dùng không được hiểu trang bảng hiện tại là tập thống kê hoặc scope xử lý.

Căn cứ: `docs/api/API.md`, `frontend/src/features/processing/components/ProcessingPanel.tsx`

## 11. AI dùng để làm gì, có huấn luyện không?

Qwen3 4B qua Ollama xếp hạng ứng viên do code tạo theo nhóm xử lý. Backend validate output rồi dry-run bằng data-core. Em chưa triển khai huấn luyện mô hình hoặc tự Apply.

Căn cứ: `backend/src/modules/ai/ai.service.ts`, `backend/src/modules/ai/ollama.service.ts`, `docs/architecture/local-ai.md`

## 12. Dữ liệu nào gửi model và lưu ở đâu?

Chỉ thống kê/evidence, caution, method và ID ứng viên, không tên cột hoặc nội dung ô. Gợi ý/lý do nằm ở response/UI state, không có collection mới. Khi Apply, history giữ specification xử lý theo luồng cũ.

Căn cứ: `docs/architecture/local-ai.md`, `backend/src/modules/ai/ai.service.ts`

## 13. AI miễn phí hay có chi phí bao nhiêu?

Em chưa có bằng chứng trong repository để định lượng chi phí điện, phần cứng hay vận hành. Runtime/model local không có nghĩa tổng chi phí bằng không, nên em không đưa con số.

Căn cứ: `docs/architecture/local-ai.md`

## 14. AI đã được test full luồng chưa?

Có smoke model thật và k6 HTTPS → Nest/auth/ownership → MongoDB → Qwen thật, Missing batch 0 sau warmup. Chưa có bằng chứng full browser → DB thật → Qwen, cold start theo NFR, full multi-batch và chất lượng gợi ý.

Căn cứ: `docs/performance/rerun-2026-11-18.md`, `docs/reports/local-ai-implementation-2026-11-18.md`

## 15. Số test trên slide có phải tổng hiện tại không?

Không. Các số thuộc các lượt báo cáo AI và FE khác nhau. Em không cộng chúng hoặc nói đã chạy lại. .last-run passed là bằng chứng trạng thái, chưa thay được full log gắn commit và số đếm.

Căn cứ: `docs/reports/frontend-fix-review-2026-11-18.md`, `docs/reports/local-ai-implementation-2026-11-18.md`

## 16. Lỗi 0% thì tại sao k6 không đạt?

0% là trên request đã gửi. Có 357 lượt không phát được do thiếu VU rảnh, throughput chỉ 9,393 request/giây, và project/workspace vượt p95 1 giây. Kết quả chưa đạt NFR-18 đầy đủ.

Căn cứ: `docs/performance/rerun-2026-11-18.md`, `docs/performance/results/2026-11-18T12-32-43-038Z-load/summary.json`

## 17. Có thể kết luận lỗi do Nginx không?

Chưa. k6 chạy HTTPS proxy tạm trực tiếp tới Nest trên cùng máy với generator/database, không qua Nginx hay Docker. Cần telemetry và phép đo có kiểm soát trước khi quy nguyên nhân.

Căn cứ: `docs/performance/rerun-2026-11-18.md`, `docs/performance/README.md`

## 18. Dữ liệu và AI đạt thì toàn bộ NFR đã đạt chưa?

Chưa. Data đạt 12 nhóm p95 trên fixture 10.000 dòng, 20 cột và khoảng 0,78 MB. AI warm đạt 20 lượt Missing batch 0. Chưa đo browser, peak RAM/VRAM, cold start, RPO/RTO hoặc deploy public.

Căn cứ: `docs/performance/rerun-2026-11-18.md`, `docs/requirements/non-functional-requirements.md`

## 19. Đã deploy thật hay mới chạy local?

Có báo cáo Nginx trong Docker Desktop với HTTPS local, health và SPA. Production mới có cấu hình/hướng dẫn. Chưa có domain, chứng chỉ CA công khai hoặc probe Internet để khẳng định đã deploy production.

Căn cứ: `docs/nginx-deployment-report.md`, `compose.production.yaml`

## 20. Bảo mật đã hoàn tất chưa?

Có JWT gắn session, ownership, cookie, Origin, rate limit và validation. Chưa tuyên bố hoàn tất hardening. Báo cáo nêu MongoDB chưa bật auth, trusted proxy/rate-limit sau Nginx và backup cần đánh giá trước vận hành thực.

Căn cứ: `backend/src/modules/auth/security/auth-crypto.ts`, `backend/src/modules/auth/security/ownership.service.ts`, `docs/nginx-deployment-report.md`

## 21. Phục hồi mất database được kiểm chứng chưa?

NFR có RPO 24 giờ và RTO 2 giờ, nhưng em chưa có bằng chứng diễn tập đạt ngưỡng. Cần restore sang môi trường cô lập, đối chiếu dữ liệu và đo thời gian.

Căn cứ: `docs/requirements/non-functional-requirements.md`

## 22. Tài liệu cũ và code khác nhau thì dùng gì?

Em dùng code để xác nhận triển khai và dùng artifact/báo cáo để xác nhận chạy. Ví dụ mô tả cũ chưa có codec đã khác SnapshotPublisher.prepare hiện gọi encodeSnapshot/writeChunk. Các chênh lệch được ghi trong inventory.

Căn cứ: `backend/src/modules/datasets/snapshot-publisher.service.ts`, `packages/data-core/src/codec.ts`, `docs/database/database.md`
