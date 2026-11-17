# BE-3 — Handoff và điều kiện tích hợp (16/11/2026)

## Mã nguồn và phạm vi

Nhánh đề xuất: `feat/be3-be2-integration`; gốc BE-2 commit `a4529c9` (`feat/be-2-nguyen`). Nhánh **có chứa code BE-2**, vì vậy phải chọn base Pull Request phù hợp và yêu cầu BE-2/BE-1 review trước khi merge vào `dev-backend`.

| Thành phần BE-3 | Tình trạng từ code được rà soát |
| --- | --- |
| 27 method Data Core | Có implementation, CJS + ESM; audit bổ sung D07/D09/D10/D11/D14/D15 và tests |
| Processing (3 API) | Có Preview/Create, Get Preview, Apply; MongoDB integration suite đã PASS trên máy thành viên trước bản audit |
| History (2 API) | Có History, Restore bất biến với receipt/CAS; MongoDB integration đã PASS trước audit |
| Analysis/3D (5 API) | Có Summary, Distribution, Pearson, Points-3D, Value Counts; MongoDB integration đã PASS trước audit |
| Offline replay core | Có IndexedDB queue store, replay coordinator, HTTP adapter và 10 tests |
| Offline toàn ứng dụng | **Chưa hoàn chỉnh**: UI frontend, lưu CSV offline/typed snapshot, local→server ID mapping và browser offline E2E phải phối hợp FE-1/FE-3/BE-2 |

## Các sửa đổi sau audit

- `convert_number`: cho phép trim ngoài, exponent E/e, phát hiện integer vượt safe precision (D07).
- `convert_datetime`: nhận datetime có offset hoặc thiếu offset với timezone IANA; báo DST ambiguous/nonexistent; hỗ trợ date→datetime theo zone (D09/D10). `convert_date` nhận datetime và lấy ngày UTC (không có field timezone trong DTO convert_date).
- `strip_html`: loại bỏ nội dung script/style trước khi xóa markup.
- `one_hot`: không tạo all-zero trên missing khi `missingCategory=false`, giữ cell output number, kiểm kiểu source và trần 100 category tính cả missing, tạo tên cột không trùng.
- `ordinal`: mapping không được chứa category không thuộc dữ liệu.
- Tăng `ENGINE_VERSION` lên `data-core-unified-0.5.0` để offline queue cũ không âm thầm chạy khác semantics.

## Lệnh nghiệm thu sau khi áp dụng patch audit

```cmd
cd /d E:\Projects\JSTS
npm run test:offline -w frontend
npm run typecheck && npm run lint && npm run test:unit && npm run build
npm run test:e2e:backend
npm run test:integration:local -w backend
```

Không chạy integration test với Atlas production. Ghi log và commit audit patch riêng khi toàn bộ đạt.

## Những điểm chưa thể tự nhận PASS

1. Browser offline E2E: CSV offline→đóng/mở lại→upload→map ID→Preview/Apply→đồng bộ→mở trình duyệt khác; bắt buộc phối hợp FE.
2. Kiểm thử HTTP thực của từng phương pháp (đúng/biên/sai): hiện có kiểm thử engine theo nhiều phương pháp, nhưng BE-3 integration chỉ chạy edit_cell end-to-end.
3. Preview expired/cleanup giữa tiến trình chết; stress/correlation 1000 cột và memory behavior; cross-module concurrency + account delete.
4. Review API/DTO và schema có đổi bởi BE-2/FE sau khi nhánh này tách.
5. Không có kiểm thử tuyệt đối chứng minh mã không còn bug; yêu cầu người review kiểm tra thêm.

## Bàn giao cho nhóm trưởng

- Push nhánh `feat/be3-be2-integration` và mở PR **base `feat/be-2-nguyen`** để review phần BE-3 tương đối với code BE-2. Nếu nhóm trưởng đã merge BE-2 vào `dev-backend`, có thể đổi base PR thành `dev-backend`.
- Không force push, không merge một mình. PR ghi đầy đủ test log, commit cuối, giao diện/BE2 yêu cầu phối hợp và checklist chưa đạt.
- Khi FE hoàn tất luồng offline, chạy gate trình duyệt thật và chốt tài liệu trạng thái; chưa đổi nhãn "full system complete" chỉ nhờ core tests xanh.
