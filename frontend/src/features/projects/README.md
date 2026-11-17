# Feature projects và workspace

ProjectsPage quản lý project server: list/sort/page, create với stable key, open/rename/delete có xác nhận và states. WorkspacePage ở app composition ghép dataset table/import, processing, history và analysis qua public index, giữ feature graph không vòng.

Workspace online autosave debounce/serialize theo revision/boundVersionId; response cũ bị generation fence. Lỗi 409 dừng lưu, tải lại server để review; normalized adjustments được hiển thị. Apply/restore đọc lại project/metadata/rows và remount panels theo version.

`workspace-drafts.ts` lưu patch đồng bộ vào localStorage trước debounce, key riêng account/project/tab, không có token/dataset cell. Không ghi đè draft của tab khác khi đọc. Nếu response mất sau commit, đọc lại so đầy đủ patch/bound version để bỏ prompt replay; nếu khác, chỉ recovery khi người dùng chọn. Draft version cũ chỉ giữ/export, không tự apply refs cũ. Quota/corrupt/future schema không clear storage; lỗi có thông báo, export và cảnh báo rời trang khi chưa có bản bền vững.

Restore draft lên revision server mới là lựa chọn tường minh; server CAS/normalization vẫn quyết định hợp lệ. Bản nháp còn lại được tính trong dialog logout/delete ở profile; chỉ dọn theo lựa chọn của user. Local dataset workspace nằm trong IndexedDB workspaces của feature offline, không dùng draft này thay outbox.

Test acceptance: project CRUD/profile/table reload, CAS hai tab, rời trước debounce, response loss không replay, fail/reload/recovery và conflict/export. Unit kiểm isolation, quota/corrupt và canonical match. Session-expiry/storage-failure/restart nâng cao tiếp tục được audit theo checklist.
