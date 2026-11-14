# Áp dụng bản vá Frontend offline lên nhánh riêng

Bản vá dựa trên `main` commit `1067712` ngày 14/11/2026. Không thay đổi Backend schema/index/DTO/API, không ghi Atlas. **Không tự ghi đè `main` hoặc thư mục `.git`.**

## Làm trên máy nhóm

1. Kiểm tra `git status` sạch và commit hiện tại: `git log -1 --oneline` → `1067712`. Nếu repo đã có commit mới, phải rà soát diff trước khi dùng patch.
2. Chạy: `git switch main`, `git pull --ff-only origin main`, `git switch -c codex/offline-mvp-handover`.
3. Giải nén ZIP *patch-only* vào **thư mục gốc repo** (nơi có `package.json`), chỉ copy các file/đường dẫn nằm trong patch. Không copy bất kỳ `.env`, `node_modules` hoặc `.git`.
4. Xem trước thay đổi `git status --short` và `git diff --stat`.
5. Chạy `npm ci`, `npm run check:no-any`, `npm run typecheck`, `npm run build`, `npm run test:local-engine -w frontend`, `npm run test:contracts -w backend`, `npm run test:http -w backend`.
6. Chạy `npm run dev`, mở `http://localhost:5173`, thử import → 3D → Preview → Apply → History/Restore. Giữ trang mở rồi dừng Backend; test các thao tác cục bộ.
7. Nếu các kiểm tra tương ứng đạt, `git add ...`, `git commit -m "feat(frontend): add offline browser demo and module documentation"`, rồi `git push -u origin codex/offline-mvp-handover`. Gửi pull request cho trưởng nhóm rà soát; không merge tự động.

**Database**: Chỉ chạy `npm run db:verify -w backend` với URI mới đã thay mật khẩu lộ. `npm run test:database -w backend` dùng transaction/rollback và ghi dữ liệu kiểm thử; chỉ chạy nếu được phép trên database phù hợp, không tự chạy trên DB nhóm chung.

## Demo đã hỗ trợ

- Import CSV trong browser, bảng 10 dòng/trang, 3D bằng Canvas chiếu phối cảnh có quay toán học.
- Preview trim và fill missing, Apply tạo bản cục bộ, History/Restore và lưu IndexedDB.
- Backend ngắt giữa phiên: các thao tác browser-side tiếp tục chạy (chưa kiểm thử E2E trình duyệt tự động).

## Chưa hỗ trợ

- Đồng bộ khi online trở lại, server-authoritative IDs/versions, auto conflict resolution, Auth/ownership API thật, file sync với MongoDB.
- Không được gọi đây là 27 API đã hoàn thành hoặc offline sync đã chạy thật.

## Lý do không viết lại Backend

`database.md` và `collection-contracts.ts` đã có 12 collection, validators/index, logic provision và những bài kiểm thử DB nhóm trưởng báo PASS. Thay chúng bằng một mô hình tùy tiện khác có thể phá vỡ contract D01–D26 và dữ liệu đã chốt.
