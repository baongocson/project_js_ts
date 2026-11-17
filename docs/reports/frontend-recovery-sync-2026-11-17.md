# Frontend recovery và sync center — 17/11/2026

Working tree `dev-frontend`, nền `43a5422`; không commit/push/merge. Tiếp tục mục tiêu đầy đủ từ [checklist](frontend-readiness-checklist-2026-11-16.md). Báo cáo này ghi đợt kế tiếp; không xem các gate cũ là đã chạy lại trên source mới.

| Checklist | Đầu việc | Implementation và bằng chứng |
| --- | --- | --- |
| [x] | Thiếu/sai CSV nguồn | Sync chặn trước create/import; snapshot/history vẫn đọc được, byte count không rõ hiện N/A. Chọn lại file phải khớp SHA-256 và typed original; không thay original bằng CSV đã xử lý. Browser missing/wrong/correct recovery PASS. |
| [x] | Backup project | JSON schema versioned giữ exact source, original/current snapshot, history, IDs, stable keys, account/map/cursor; không export session token hoặc auto-sync opt-in. Preview metadata trước phục hồi; chỉ thêm khi ID chưa tồn tại, không ghi đè. Browser mới restore rồi sync thật PASS. |
| [x] | Validation backup | Codec kiểm snapshots, hash/import-options kiểm original; kiểm key uniqueness/IDs/cursor, spec và toàn chain khi cùng engine; current phải khớp history cuối. Unknown metadata/schema/corrupt/hash bị từ chối trước write. Legacy engine giữ nguyên nhãn và bị guard sync, không tự nâng. Unit PASS. |
| [x] | Unknown Apply từ backup | File phục hồi được đánh dấu cần revalidate; preview ready phải quay lại kiểm candidate trước publish, preview đã applied retry receipt cũ. Browser backup lost-Apply restore ở context mới rồi receipt replay PASS, không tạo preview mới. |
| [x] | Sync center/progress | Metadata-only events trong tab và BroadcastChannel; không broadcast source/snapshot/credentials. Status/cursor/progressbar/phase hiện từ commit checkpoint, danh sách outbox phân trang. Browser giữ Apply pending kiểm progress trước receipt PASS. |
| [x] | API probe/reconnect | Opt-in rõ theo project, chỉ auto sau lần manual bind account; đúng owner, không chạy conflict/blocked. Kiểm health API thực, không chỉ onLine. Web Lock điều phối nhiều tab, ProjectApi pin owner toàn chuỗi. Reconnect 2 tabs retry cùng Apply key PASS. |
| [x] | Backoff bền vững | Attempts/nextAt lưu trong project, 2/4/8/16/32 giây, tối đa 5 lần rồi yêu cầu manual retry; keys không đổi. Browser fake clock + HTTP 503 probe kiểm không gửi mutation khi API lỗi, cap 5 và manual resume PASS. |
| [x] | Conflict giữ local | Có backup và tải JSON snapshot server để đối chiếu; không replace bản local/không đổi head. Có lựa chọn dừng auto sync; tải bản server + giữ row local qua browser PASS. |
| [x] | Quota import/local Apply | Transaction abort không publish partial snapshot/outbox. Wizard giữ source/options; local Apply retry cùng action/key. Thông báo dung lượng/hướng backup; browser retry chỉ tạo một project/operation PASS. |
| [x] | Quota checkpoint sau commit | IDB còn phase Apply-sent và key cũ. Nếu checkpoint không ghi được, progress chỉ báo retry với cursor durable, không báo synced; reload retry receipt và không nhân đôi. Browser PASS. |

## Gate đã quan sát

- Frontend unit **21/21 PASS**: thêm backup graph/hash/key/schema validation và auto eligibility/backoff.
- Gate backup/sync center riêng **7/7 browser PASS**, gồm backup roundtrip/source recovery, live progress, 2-tab reconnect, probe/backoff, cap 5/manual retry và restored unknown Apply.
- Gate quota/conflict: conflict/server copy, local Apply quota và checkpoint quota PASS; import quota được chạy lại riêng sau sửa locator native select và PASS. Lỗi selector không được tính là test thành công trước khi có terminal PASS.
- Typecheck frontend/architecture 101 file và lint PASS ở mốc source trước sửa nhỏ cuối; đang chạy gate cuối và full regression.
- Full suite trước đợt này là **25/25 PASS**; chưa dùng số đó để tuyên bố full source mới đã qua. Khi full regression terminal xong sẽ cập nhật dòng cuối.

## Phần còn phải đóng trước hoàn thành goal

- Audit toàn checklist/plan: các scope/biên, offline/online parity, stale responses/session/account life cycle và restart/blocked upgrade; kiểm retry không phải giả định.
- Editor/UX/accessibility/responsive polish, error/recovery states toàn màn hình và ảnh UI mới; dọn/hợp nhất API adapter cũ chưa được UI dùng.
- README/protocol/cache/migration/demo và các gate cuối theo thay đổi; nghiệm thu chỉ HTTPS/MongoDB replica tạm theo lựa chọn người dùng, chưa phải production/Atlas/multi-browser.

Không tự đặt goal complete từ các gate hẹp. Các phần đã xong ở bảng là các đầu việc có phạm vi cụ thể, chưa đánh dấu trọn gói frontend.
