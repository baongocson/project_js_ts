# Yêu cầu phi chức năng — Dashboard 3D

Ngày lập: **18/11/2026**. Các mức dưới đây lấy từ hợp đồng hiện hành. Tiêu chí chưa có benchmark/SLA được ghi rõ, không tự đặt thành cam kết hiệu năng.

## 1. Bảo mật và quyền riêng tư

| Mã | Yêu cầu | Cách kiểm chứng |
| --- | --- | --- |
| NFR-01 | Mọi API bảo vệ kiểm chữ ký/hạn JWT, session và user active; truy ngược dataset/version/preview về owner. Không tin userId/ownerId trong body. | Gửi request thiếu/hết hạn/revoked token, khác owner và ID không thuộc parent; bị từ chối theo API, không đọc/ghi tài nguyên khác. |
| NFR-02 | Access token chỉ ở bộ nhớ frontend, hạn 900 giây; refresh opaque trong cookie HttpOnly/Secure/SameSite=Lax/Path=/api/v1/auth, hash phía server, hạn tuyệt đối 7 ngày và rotation. Auth mutations kiểm Origin allowlist/rate limit; frontend single-flight refresh. | Kiểm HTTPS cookie, storage/cache và request đồng thời; token cũ bị từ chối sau rotation; logout thu hồi session; không có token trong IndexedDB/outbox/service worker cache. |
| NFR-03 | Email trim/lowercase duy nhất; password đăng ký 12–72 byte UTF-8, không trim, bcrypt cost 12; response/log không lộ hash, token hoặc dữ liệu ô trong diagnostics. | Ca biên byte Unicode, email trùng và projection công khai; kiểm diagnostics/CSV error/log được tạo trong ca thử, không in bí mật. |

## 2. Toàn vẹn và độ tin cậy

| Mã | Yêu cầu | Cách kiểm chứng |
| --- | --- | --- |
| NFR-04 | Published snapshot bất biến; publish head/version/history/receipt nguyên tử bằng transaction ngắn và CAS. Không đưa parse/upload/tính toán dài vào transaction. | Hai request cạnh tranh và lỗi trong publish: chỉ một head hợp lệ; không có history/version công bố dở dang; bản cũ không bị sửa. |
| NFR-05 | Idempotency cho create/import/preview/Apply/restore, key 1–128 ký tự. Payload khác cùng key trả 409; pending theo Retry-After; kết quả chưa rõ phải recovery trước retry. | Mô phỏng mất response/retry, key khác payload, lease takeover và receipt recovery; không tạo thao tác lặp. |
| NFR-06 | Online/offline dùng cùng typed semantics và engine tương thích. Bảo toàn rowId/columnId, thứ tự, token và lineage theo phép xử lý. | Fixture chung ESM/CJS và replay so schema/typed values/positions; engine hoặc source không tương thích bị chặn, không âm thầm đổi dữ liệu. |
| NFR-07 | Lưu local nhất quán trong IndexedDB; chỉ báo đã lưu sau commit. Sync có checkpoint và giữ dữ liệu khi quota/network/conflict; không chuyển queue sang account khác. | Reload offline, lỗi quota/transaction, đổi tài khoản, mất mạng từng bước sync; mở lại đọc được trạng thái đã commit và tiếp tục hoặc dừng có nguyên nhân. |
| NFR-08 | Xóa tài khoản/project khóa ghi và ngăn worker publish tái tạo dữ liệu bằng lifecycle/fence. Chỉ trả 204 khi cleanup hoàn tất. | Cho delete cạnh tranh với import/Apply; không còn dữ liệu phụ thuộc sau thành công; lỗi cleanup không báo thành công. |

## 3. Giới hạn tài nguyên và khả năng đáp ứng

| Mã | Ràng buộc | Cách kiểm chứng |
| --- | --- | --- |
| NFR-09 | CSV ≤16.000.000 byte; JSON body ≤1 MiB; chunk payload ≤4 MiB; encoded snapshot ≤100 MiB; schema sau xử lý ≤1000 cột. | Ca đúng ngưỡng/vượt ngưỡng; xử lý trước khi công bố; lỗi phù hợp, không publish một phần. Không tự thêm trần dòng hoặc byte/ô. |
| NFR-10 | Một method/preview; one-hot ≤100 category/cột; ordinal mapping ≤5000 category; TF-IDF maxFeatures 1–1000 và vẫn chịu tổng schema ≤1000. | Fixture category/vocabulary đúng/vượt trần và scope không phù hợp; invalid/413 theo hợp đồng. |
| NFR-11 | Query phân trang limit ≤100; mặc định projects/rows=10, preview=5, history=20, value-counts=50. Tối đa 20 filters; sampling 3D maxPoints≤10000. Diagnostics preview lấy ≤100 mẫu ưu tiên errors, counts tổng đầy đủ; boxplot lấy ≤100 outlier mẫu. | Kiểm query biên, total/page/counts/truncated; người dùng thấy sampling hoặc truncation; thống kê không tính riêng trang bảng. |
| NFR-12 | Renderer WebGL tải động; có fallback khi không khả dụng. Không kéo module 3D thành dependency bắt buộc của entry đăng nhập. | Kiểm production build/network với cache sạch; WebGL lỗi vẫn xem được fallback và dữ liệu; precache nền phục vụ offline được đánh giá riêng. |

Chưa cam kết độ trễ p95, throughput hoặc số người dùng đồng thời. Benchmark cần bao gồm kích thước CSV, số cột, category, method và thiết bị; kết quả sẽ là căn cứ chốt SLA. Không diễn giải giới hạn file thành bảo đảm xử lý tức thời.

## 4. Khả dụng, trải nghiệm và bảo trì

| Mã | Yêu cầu | Cách kiểm chứng |
| --- | --- | --- |
| NFR-13 | App đã cache mở lại offline; công khai trạng thái online/local/sync/error và giới hạn storage. Không hứa tải lần đầu khi chưa có mạng/cache hoặc giữ local sau khi xóa browser storage. | Chặn mạng sau lần cache, đóng/mở/reload; kiểm thông báo lỗi cache/storage và số lệnh chưa sync. |
| NFR-14 | Giao diện responsive, hỗ trợ light/dark/system, trạng thái focus và thao tác bàn phím cho control chính; thông báo không chỉ dựa vào màu. Xóa/restore/Apply phải thể hiện rõ tác động. | Browser kiểm desktop/mobile, tab/focus, label/lỗi, contrast theo bộ design-system hiện có; chưa tuyên bố chứng nhận WCAG toàn sản phẩm. |
| NFR-15 | Lỗi API thống nhất error.code/message/details/requestId; phân biệt input/auth/permission/conflict/expiry/limit/network/server. Không báo thành công khi trạng thái chưa xác định. | Kiểm 400/401/403/404/409/410/413/429/500/503 và mất mạng theo từng route; requestId dùng đối chiếu, không lộ secrets. |
| NFR-16 | TypeScript và ranh giới module rõ; frontend kiểm chiều import/vòng phụ thuộc; data-core thuần dùng chung. Lint/typecheck/build và test phù hợp phải đạt trước bàn giao thay đổi code. | Chạy các script của repository và kiểm artifact; test tích hợp/acceptance dùng môi trường cô lập, không thay dữ liệu người dùng. |
| NFR-17 | MongoDB hỗ trợ transaction; schema/index được provision có kiểm soát và xác minh lúc startup; production dùng HTTPS/CORS phù hợp. Có endpoint health phản ánh database khi bật. | Khởi động với config/schema/index lỗi; kiểm health và startup từ chối phục vụ khi điều kiện bắt buộc không đạt; kiểm HTTPS/cookie. |

Chính sách backup/retention server, RPO/RTO, uptime SLA và ma trận browser chính thức cần được xác nhận trong kế hoạch vận hành. Snapshot/history không thay thế backup database.

## 5. Căn cứ và liên hệ

[API](../api/API.md), [DTO](../api/dto-contract.md), [database](../database/database.md), [kiến trúc](../architecture/architecture.md), [data-core](../../packages/data-core/README.md), [báo cáo frontend 18/11](../reports/frontend-fix-review-2026-11-18.md). NFR-01–08 áp dụng xuyên suốt các [FR](functional-requirements.md); NFR-09–12 đặc biệt áp dụng import/processing/analysis; NFR-13–17 áp dụng toàn hệ thống theo môi trường tương ứng.

## Bổ sung NFR-AI — AI local (18/11/2026)

Inference Qwen3 4B qua HTTP loopback trên máy backend, không API key cloud; một inference đồng thời/process, timeout mặc định 120 giây và tối đa 180 giây. Mọi cột được thống kê, ứng viên chia lượt tối đa 12/lượt và tối đa 5 gợi ý/lượt; UI gọi tiếp toàn bộ các lượt, timeout áp dụng từng lượt; không cam kết SLA trên mọi máy/dataset. Không gửi tên cột/nội dung ô, không ghi gợi ý vào MongoDB, không đổi snapshot khi nhận gợi ý. Service AI không khả dụng không chặn processing thủ công. Runtime/model nằm ngoài Git; hướng dẫn tải/khởi động/kiểm tra tại [local-ai](../architecture/local-ai.md).

**Yêu cầu bàn giao Docker/server (chưa nghiệm thu):** môi trường đích phải cấp runtime/model riêng, lưu model bền vững, kiểm readiness và khôi phục sau restart; xác nhận tài nguyên CPU/GPU và giới hạn nhiều người dùng. Backend/Ollama tách container cần cấu hình origin nội bộ được cho phép thay cho loopback hiện có. Người dùng server chung không bắt buộc cài AI trên máy cá nhân; Ollama không được công khai trực tiếp ra Internet. Script PowerShell hiện không thay thế quy trình khởi tạo container Linux. Xem [kế hoạch và tiêu chí kiểm chứng](../architecture/local-ai-deployment.md).
