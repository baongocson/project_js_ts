# Offline workspace và đồng bộ

Ứng dụng ở `/offline` hoặc `/local/projects`. Source gốc, typed snapshot/history/outbox/mapping được lưu qua `repositories/project-store.ts`; sync thật qua `services/project-sync.ts`. `services/` chứa backup/local processing/workspace và sync policy; `api/` chứa endpoint HTTP; `domain/` chứa preview reconstruction và progress events. `OfflineWorkspace` lắp shared ImportWizard, DataTableView, ProcessingPanel, AnalysisPanel và LocalWorkspacePane. Auth dùng session/transport chung, access/refresh token không lưu trong IndexedDB.

## Storage và nâng cấp

Tên database giữ nguyên `dashboard3d-projects-v1` để đọc dữ liệu đã có. **Schema version 2** chỉ thêm object store `workspaces` bên cạnh `projects`; không clear DB, không rewrite source/snapshot/history/keys, không nâng nhãn engine cho queue cũ. Fresh install tạo cả hai store. Version-change đóng connection; nếu tab cũ chặn upgrade, UI yêu cầu đóng tab rồi thử lại, giữ dữ liệu.

`projects` giữ nguyên Blob bytes dưới dạng Uint8Array, SHA-256, ImportOptions (legacy thiếu options dùng mặc định dấu phẩy), original/current snapshot, operations và stable keys, account binding, ID/version mapping, cursor/checkpoint. Import local có logical creation ID để không tạo project trùng khi retry cùng action. Wizard chung tính lại typed preview từ nguồn khi override, giữ BOM/quotes/newline/missing và báo vị trí lỗi.

`workspaces` giữ table filters/sort/page, selection và chart config theo projectId, revision và bound local version. Web Lock chung với Apply/restore/sync giúp kiểm CAS/base. `normalizeWorkspace` dùng chung backend/core để bỏ refs mất hiệu lực và clamp page. Read điều chỉnh view, không sửa snapshot/outbox. Save ghi config riêng; không làm project snapshot bị stale do ghi đè cả document. Xóa local project dọn cả hai store trong một transaction.

Quota/lỗi lưu workspace có thông báo giữ dữ liệu published, retry và export config. Bản nháp online được lưu riêng theo account/project/tab ở feature projects, có explicit recovery/export; không phải outbox local dataset. Backup/restore nguồn và sync center/coordinator hiện đã có; lifecycle/UX và audit cuối vẫn trong checklist.

## Processing, analysis và sync

Local preview giữ candidate tạm, không thay snapshot. Apply kiểm version dưới Web Lock và atomically ghi snapshot/history/outbox; reload cần tạo lại preview. Form typed đủ 27 method dùng shared core; analysis dùng toàn snapshot với cùng calculation backend, không dùng trang bảng.

Sync: xác minh account, pin cả chuỗi request vào owner đã xác thực, create/import nguồn với options, map IDs bằng source hash/position/typed cells/lineage, replay Preview/Apply/restore. Đọc đủ preview changes và dựng candidate để kiểm nội dung/ID **trước publish**; mapping/cursor chỉ ghi sau receipt/head/snapshot xác nhận. Unknown Apply/restore retry key cũ; preview hết hạn trước Apply có thể thay attempt sau terminal reply và kiểm base. Sai account/head/engine/resource giữ local, không tự overwrite hoặc chuyển tài khoản.

`replay.ts` và `IndexedDbQueueStore` là coordinator fixture cho **dataset server đã map trước**; UI không dùng chúng thay nguồn CSV/project-sync. Chúng không phải bằng chứng toàn sản phẩm hoàn tất. Pure queue/replay được giữ để kiểm protocol độc lập; HTTP client OfflineApiAdapter cũ đã bỏ. Runtime dùng ProjectApi/shared transport.

## Kiểm tra và khôi phục

- `npm run test:offline -w frontend`: coordinator fixtures độc lập (in-memory).
- `npm run test:unit -w frontend`: transport/session/draft/analysis/specification boundary.
- `npm run test:acceptance -w frontend`: HTTPS/Nest/MongoDB replica tạm thật, offline cache/reload, nguồn/options/parity 27 forms, response loss, account/conflict, migration v1→v2, workspace persistence/CAS/quota, analysis/3D.

Không xóa storage để chữa engine mismatch hoặc upgrade lỗi. Xuất/giữ bản local trước khi dọn dữ liệu; profile cho lựa chọn xóa rõ theo tài khoản. App cần mở online một lần để cache, không đảm bảo tải lần đầu khi chưa có mạng. Không dùng Atlas cá nhân cho fixture.


## Backup và sync center

`ProjectRecovery` xuất original CSV hoặc backup versioned; BackupImporter preview/validate rồi chỉ thêm project ID chưa tồn tại. `project-backup.ts` kiểm codec/hash/options/key/spec/history chain, không overwrite; source missing vẫn archive được snapshot/history. Recovery nguồn phải đúng SHA-256. Imported unknown Apply revalidate preview ready trước publish hoặc replay receipt đã committed. Auto-sync không được bật từ file backup.

`SyncCenter` hiển thị cursor/phase/progress/outbox từ metadata events, giải thích blocked/conflict, có tải snapshot server để đối chiếu và giữ local. `SyncCoordinator` ở provider theo dõi login/online/project events, chỉ chạy project đã manual bind account + opt-in. Health API probe trước replay, Web Lock toàn coordinator + project locks, owner pin, backoff attempts/nextAt bền vững (tối đa 5) và manual resume. Conflict/blocked không tự replay. Browser tab phải đang mở; đây không phải background sync khi mọi tab đã đóng.

Quota project transaction không ghi dở snapshot/outbox. Nếu server đã commit mà checkpoint quota, UI báo chưa lưu checkpoint và giữ cursor/key durable để retry receipt sau reload; không tạo action/key mới. Xem [báo cáo recovery/sync](../../../../docs/reports/frontend-recovery-sync-2026-11-17.md) và acceptance `project-recovery`, `sync-center`, `storage-failure`.

## Tài khoản và dữ liệu chưa đồng bộ

Profile và màn hình offline dùng chung `AccountActions` từ feature auth. Trước logout/delete, kiểm lại project pending và bản nháp dưới khóa project của tài khoản đã mở dialog. Đổi tài khoản giữa chừng chặn xác nhận; không dùng danh tính mới để hoàn tất dialog cũ. Logout mặc định giữ local; xóa local là lựa chọn tường minh và chỉ áp dụng cho tài khoản đã chọn, không xóa guest/tài khoản khác.

Delete cần nhập XÓA và chọn xóa local hoặc xác nhận giữ bản phục hồi không thể sync về tài khoản đã xóa. Có thể hủy để backup/đồng bộ trước. Khi reload offline không còn identity đã xác minh, vẫn có “Đăng xuất trên thiết bị” để ngăn tự khôi phục cookie khi online; không tuyên bố phiên server đã bị thu hồi. Backup project hiện giữ source/data/history/outbox/map/keys, chưa chứa cấu hình bảng/chart trong store workspaces.


## Engine0.7 và TF-IDF

TF-IDF chạy cùng shared core offline/API. Apply giữ source/options/snapshot/history/outbox và nâng engine label lên0.7 chỉ khi đã tạo TF-IDF. Project0.6 với27method cũ được mở/sync qua compatibleEngine, vẫn kiểm đủ candidate và published snapshot; không sửa lịch sử hoặc clear IndexedDB. TF-IDF receipt phải khớp engine, engine lạ vẫn blocked. Bảng sửa ô3D dùng cùng localProcessing và lock/CAS/idempotency như panel.
