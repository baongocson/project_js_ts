# Bàn giao frontend — 17/11/2026

Nhánh `dev-frontend`, nền `43a5422` cộng working tree. Chưa commit/push/merge; không thay đổi `main`. Bản này hoàn thiện ứng dụng online/local theo [kế hoạch frontend](../plans/frontend-implementation-plan.md), dùng backend 27 API và Data Core chung. Môi trường nghiệm thu được người dùng chọn là HTTPS + MongoDB replica tạm cục bộ.

## Chạy và kiểm tra

Node theo `package.json` gốc: `^22.13.0 || >=24.0.0`. Từ gốc repository:

```powershell
npm ci --ignore-scripts --no-audit --no-fund
npm run test:e2e:install -w frontend
npm run lint
npm run typecheck
npm run test:unit
npm run test:unit -w frontend
npm run test:offline -w frontend
npm run test:e2e:backend
npm run test:e2e:frontend
npm run test:acceptance -w frontend
```

Acceptance đã bao gồm build backend/core/frontend. Các runner browser chạy tuần tự để không tranh cổng, output hoặc `dist`. Cần OpenSSL trong PATH hoặc `OPENSSL_BIN`, Chromium và MongoDB binary test (runner tự cache). Runner dùng cổng 4310/4174, DB riêng được provision/verify, credentials/chứng chỉ tạm; không dùng URI Atlas cá nhân, không cài chứng chỉ vào trust store hệ điều hành. Artifact ở `frontend/test-results/acceptance`/`health`, đã gitignore.

Dev: dùng biến môi trường theo [frontend README](../../frontend/README.md) và [backend hướng dẫn](../../backend/scripts/README.md); chỉ sao chép file mẫu nếu chưa có, không ghi đè cấu hình hiện tại. `npm run dev` mở frontend/backend; dùng local DB test hoặc môi trường được giao riêng. HTTPS cùng origin/reverse proxy cần thiết cho refresh cookie Secure và offline cache nghiệm thu. Không đặt secret trong `VITE_*`.

Không chạy provision/verify hoặc test DB lên tài khoản dữ liệu thật để thử UI. Lệnh clean install trên đây là hướng dẫn tái hiện; chỉ ghi đã chạy khi có kết quả tương ứng, không suy từ bộ dependency đã cài.

## Bản đồ yêu cầu và bằng chứng

| Gói | Luồng đã triển khai | Bằng chứng tái hiện |
| --- | --- | --- |
| FE-00 | Shell/routes/theme, UI dùng chung, desktop/mobile/keyboard | `ui-quality.spec.ts`, typecheck/architecture; ảnh auth/workspace/profile/dialog/local/sync/3D đã xem trực tiếp |
| FE-01 | Shared HTTP/envelope/204/FormData/abort, memory session, refresh single-flight, owner fence | Unit HTTP/session/project-api; browser account lifecycle, cookie và response loss |
| FE-02 | Register/login/profile/theme, xác nhận logout/delete chung, pending/draft, cache app shell | `online-workspace`, `account-lifecycle`, `offline-server`; offline reload và local signout |
| FE-03 | Project CRUD/page/sort, workspace CAS/autosave/adjustments, draft trước debounce và recover/export | `online-workspace`, `workspace-drafts`, session-expired autosave trong `account-lifecycle` |
| FE-04 | Shared CSV wizard/source/options/override, typed table/filter/sort/page/getRow/editor | `import-workspace`, `cell-editor`, point→row trong `analysis-workspace` |
| FE-05 | IDB v1→v2 giữ source/history/keys, workspace config/CAS, quota recovery, backup/source/delete | `local-storage`, `storage-failure`, `project-recovery` |
| FE-06 | 27 typed forms, Preview riêng Apply, diagnostics/schema/no-op/expiry, history/restore | `processing-workspace`, `offline-server`, [ma trận processing](frontend-processing-matrix-2026-11-16.md); thêm scope cell/multi-column/dataset online/local |
| FE-07 | 5 analysis API, full snapshot local, N/A/pair counts, histogram/valuecounts/Pearson/3D | Unit analysis; `analysis-workspace`; `ui-quality` workload 5.000 dòng/4.000 điểm và keyboard row selection |
| FE-08 | Durable outbox/keys/map/checkpoint, candidate guard trước Apply, conflict/owner, progress/reconnect/backoff | `offline-server`, `sync-center`, `project-recovery`, `storage-failure`, expired-sync trong `account-lifecycle` |

Các ca method success đi qua controls typed thật, không dùng JSON shortcut. Dataset scope và filter bảng là hai khái niệm riêng; processing thống kê toàn cột, analysis toàn snapshot, row inspector độc lập trang/filter. Shared Data Core là nguồn semantics; frontend không import Nest hoặc sao chép bộ thuật toán khác.

## Kịch bản demo

Dùng [CSV giả lập](../fixtures/frontend-demo.csv). Tạo tài khoản test mới qua UI, không dùng tài khoản thật hoặc ghi mật khẩu vào tài liệu.

1. Đăng nhập → Projects → tạo project → import CSV. Xem preview suy kiểu và override; kiểm typed table, missing và filter/sort/page.
2. Chọn cột `label`, phương pháp `normalize_whitespace`/trim → Preview: bảng published chưa đổi → Apply → history/version mới. Chọn một ô, “Sửa ô đã chọn” → nhập typed value → Preview/Apply. Restore về import tạo version mới.
3. Analysis: summary, distribution/value-counts, Pearson gồm N/A và pair counts; chọn X=`x`, Y=`y`, Z=`z`, đổi missing/outlier mode. Click điểm hoặc dùng Tab/mũi tên/Enter, đối chiếu đúng row inspector; dùng filter bảng để chứng minh lookup độc lập.
4. Mở `/offline` online một lần để cache → chặn mạng → reload → import CSV và Apply local/restore. Bảng/analysis/history đọc lại sau reload; trạng thái chưa sync hiển thị rõ.
5. Bật mạng, đăng nhập đúng tài khoản → “Đồng bộ lên server” → chỉ nhận synced sau xác nhận và đối chiếu snapshot. Mở phiên mới đăng nhập, đọc project/dataset từ server. Có thể bật opt-in reconnect sau lần manual bind.
6. Dùng acceptance để diễn tập mất response sau commit/retry cùng key, quota checkpoint/restart, conflict do server head đổi và account mismatch. Các test đi qua backend/DB thật, chỉ fault injection phần lỗi.
7. Xuất backup/source; phục hồi trong thiết bị/context mới, không overwrite ID đã có. Mở dialog logout/delete để thấy pending/draft và lựa chọn giữ/xóa local; hủy nếu chưa backup. Xóa local không xóa server.

## Giới hạn bàn giao

- Cần mở online lần đầu để cache app; lần truy cập đầu hoàn toàn không có mạng không thể tải tài nguyên chưa có.
- Auto-sync là opt-in và cần tab/app còn mở; chưa có background service khi mọi tab đã đóng. Conflict/blocked dừng để người dùng xem xét, không auto-merge hoặc tự chuyển queue sang tài khoản khác.
- Backup project giữ original source, typed snapshots, history/outbox, account/map/cursor và retry keys; chưa giữ store `workspaces` chứa cấu hình bảng/chart. Không chứa token/session hoặc opt-in auto sync. Engine cũ giữ nguyên nhãn và bị chặn sync để review, không tự nâng engine lịch sử.
- Xóa account mà giữ local là lựa chọn phục hồi/export; bản đó không thể sync về tài khoản server đã xóa. Cleanup local chỉ xóa đúng owner được xác nhận; guest và owner khác giữ nguyên.
- Phạm vi test method/scope được ghi trong ma trận; không tuyên bố mọi tổ hợp input/race/trình duyệt hoặc SLA tải lớn. Workload 5.000 dòng/4.000 điểm là ca đã kiểm, không phải trần nghiệp vụ mới.
- Chưa nghiệm thu deployment/Atlas/proxy thực/multi-instance/failover/stress; theo quyết định dùng local trước. Commit/push/review nhóm là bước tiếp theo khi được yêu cầu.

Các gate và phần đang mở được cập nhật ở [checklist hiện trạng](frontend-status-checklist-2026-11-17.md), không dùng số test của báo cáo cũ làm bằng chứng source mới.
