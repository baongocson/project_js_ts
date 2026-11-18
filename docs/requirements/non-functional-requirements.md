# Yêu cầu phi chức năng — Dashboard 3D

Ngày lập và cập nhật: **18/11/2026**. Các giới hạn tài nguyên tuân theo hợp đồng hiện hành; mục tiêu hiệu suất và phục hồi dưới đây là tiêu chí nghiệm thu của thiết kế. Chỉ ghi nhận đạt sau khi có kết quả đo hoặc diễn tập tương ứng, không dùng các mục tiêu này làm kết quả kiểm thử thực tế.

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

### 3.1. Môi trường và điều kiện đánh giá

- Frontend production build, backend NestJS, MongoDB replica set và truy cập qua HTTPS. Ghi phiên bản Node, browser, database, Ollama/model, cấu hình mạng và vị trí các dịch vụ trong mỗi báo cáo đo.
- Máy backend/AI dùng Intel Core i5-12450H hoặc tương đương, RAM 16 GB, NVIDIA RTX 3050 4 GB VRAM; Ollama chạy Qwen3 4B. Phép đo 3D dùng máy client cùng mức cấu hình, bật tăng tốc phần cứng. Máy phát tải chạy riêng để không chiếm tài nguyên backend/AI.
- Dataset chuẩn là CSV UTF-8 đồng thời thỏa **≤5.000.000 byte, ≤10.000 dòng dữ liệu và ≤20 cột**. Bộ fixture phải có number/text, missing, duplicate, outlier và category để đo đúng nghiệp vụ. Báo cáo ghi kích thước thực, phân bố dữ liệu, phương pháp/tham số và số cột đầu ra.
- Kiểm biên riêng với CSV **16.000.000 byte**, cùng các giới hạn schema/snapshot trong NFR-09–10. Bộ chuẩn chỉ xác định điều kiện đo, không tạo giới hạn nhập mới. Dataset lớn hơn bộ chuẩn nhưng còn hợp lệ phải được đo riêng thời gian, RAM và tỷ lệ thành công.
- Đo API sau khi ứng dụng khởi động ổn định. AI đo riêng hai trạng thái model đã nạp và nạp lần đầu; không gộp thời gian tải model từ Internet vào inference.
- **p95 ≤T** nghĩa là ít nhất 95% mẫu có thời gian hoàn tất không vượt T. Phép đo API thông thường tính từ client gửi request đến nhận đủ response; import tính từ khi backend nhận đủ file đến khi hoàn tất response, đồng thời báo cáo riêng thời gian upload/end-to-end. Lỗi và timeout phải được thống kê cùng số mẫu, không loại bỏ để làm đẹp độ trễ.

### 3.2. Tải đồng thời và thời gian đáp ứng API — NFR-18

| Hạng mục | Mục tiêu nghiệm thu | Điều kiện kiểm chứng |
| --- | --- | --- |
| Người dùng đồng thời | 20 phiên đăng nhập, trong đó 5 người dùng thao tác tích cực đồng thời | Dùng tài khoản/phiên hợp lệ với dữ liệu riêng; ghi rõ khoảng nghỉ và chuỗi thao tác. Phiên đang đăng nhập không đồng nghĩa request đang thực thi. |
| Throughput API thông thường | Duy trì 10 request/giây trong 10 phút | Dùng k6 cho workload hồ sơ/project/workspace/history; công bố tỷ trọng endpoint, không tính upload, xử lý dataset hoặc inference AI vào mức này. |
| Tỷ lệ lỗi dưới tải chuẩn | Lỗi ngoài dự kiến <1% | Tính trên toàn bộ request của workload chuẩn; timeout, lỗi mạng, 5xx và response ngoài kỳ vọng đều được tính. Báo cáo riêng 4xx validation/conflict/rate limit và số request bị từ chối; không dùng một workload toàn lỗi dự kiến để chứng minh throughput thành công. |
| Hồ sơ, project, workspace, history | p95 ≤1 giây | Đo API đọc/ghi tương ứng trong workload thông thường; không gộp xóa tài khoản/project và cleanup vào nhóm này. |
| Bảng dữ liệu | p95 ≤2 giây | Phân trang, lọc và sắp xếp trên dataset chuẩn, theo giới hạn query hiện hành. |
| Thống kê và points 3D | p95 ≤3 giây | Dataset chuẩn; tối đa 10.000 điểm, giữ đúng sampling/counts; không tính thời gian render vào thời gian API. |
| Import CSV | p95 ≤10 giây | Dataset chuẩn, tính sau khi backend nhận đủ file; mỗi lần import dùng project/key mới phù hợp, không lấy replay receipt làm thời gian import. |
| Preview thông thường | p95 ≤10 giây | Dataset chuẩn, method/scope/tham số được công bố, thực sự chạy xử lý thay vì replay receipt. |
| Preview TF-IDF/encoding | p95 ≤30 giây | Dataset chuẩn, cấu hình hợp lệ trong trần đầu ra; ghi maxFeatures/category và số cột sinh. |
| Apply/Restore | p95 ≤5 giây | Dataset chuẩn, preview/target hợp lệ, thao tác thực tạo version mới. |

Bài đo độ trễ bảng/phân tích/import/processing được chạy riêng với tối đa 5 người dùng tích cực, không mặc định cộng tất cả tác vụ nặng vào workload 10 request/giây. Báo cáo phải ghi số mẫu, p50/p95, throughput, tỷ lệ lỗi và tài nguyên. Mỗi nhóm tác vụ nặng cần ít nhất 20 lần thực thi hợp lệ; ghi thêm min/max vì p95 trên mẫu nhỏ có độ tin cậy hạn chế.

### 3.3. Đáp ứng AI — NFR-19

| Hạng mục | Mục tiêu nghiệm thu |
| --- | --- |
| Model đã nạp | p95 ≤60 giây mỗi lượt gợi ý trên dataset chuẩn; timeout cấu hình 120 giây/lượt |
| Nạp model lần đầu | Hoàn tất một lượt trong 120 giây sau khi nhận request; runtime/model đã có trên máy, đo riêng với lượt model đã nạp |
| Đồng thời | Tối đa 1 inference/process backend; request vượt khả năng phục vụ nhận AI_BUSY rõ ràng, không chặn processing thủ công |
| Nhiều lượt | Hiển thị tiến độ và trạng thái chưa hoàn tất; mỗi lượt tối đa 12 ứng viên, tối đa 5 gợi ý; tổng thời gian được báo riêng theo số lượt |

Đo ít nhất 20 lượt khi model đã nạp và 3 lần nạp lại model để quan sát thời gian khởi đầu. Ghi số ứng viên, số lượt, thời gian, timeout/busy, model/context và RAM/VRAM. Giới hạn 1 inference/process không phải giới hạn dùng chung khi chạy nhiều backend replica; phải đo khả năng điều phối trước khi tăng replica. Mục tiêu theo môi trường/bộ chuẩn ở mục 3.1, không suy rộng thành SLA trên mọi máy/dataset.

### 3.4. Hiệu suất giao diện — NFR-20

| Hạng mục | Mục tiêu nghiệm thu | Điều kiện kiểm chứng |
| --- | --- | --- |
| Tải trang ban đầu | LCP ≤2,5 giây | Production build, cache sạch, mạng 20 Mbps và độ trễ 50 ms; báo cáo browser, viewport và kết quả từng lần chạy. |
| Ổn định bố cục | CLS ≤0,1 | Đo cùng kịch bản tải trang và các trạng thái UI chính. |
| Phản hồi thao tác | Hiện loading hoặc xác nhận đã nhận thao tác trong 200 ms | Đo từ sự kiện người dùng tới lần render trạng thái; tác vụ server có thể tiếp tục chạy theo mục tiêu riêng. |
| Tương tác 3D | Trung vị ≥30 FPS | Quay/zoom 10.000 điểm trên máy client quy định ở mục 3.1; ghi renderer, GPU, viewport và thời lượng mẫu. |
| Mở lại offline | Vào local workspace trong 3 giây | App đã cache và dữ liệu chuẩn đã lưu/commit; đo từ điều hướng/reload đến workspace sẵn sàng tương tác. |

Đo tải trang/offline ít nhất 5 lần và công bố từng lần; đo FPS ít nhất 3 lượt, mỗi lượt 30 giây sau khi scene sẵn sàng. Đo UI trong browser bằng công cụ hiệu suất phù hợp; kết quả k6 HTTP không thay thế LCP/CLS hoặc FPS.

## 4. Khả dụng, trải nghiệm và bảo trì

| Mã | Yêu cầu | Cách kiểm chứng |
| --- | --- | --- |
| NFR-13 | App đã cache mở lại offline; công khai trạng thái online/local/sync/error và giới hạn storage. Không hứa tải lần đầu khi chưa có mạng/cache hoặc giữ local sau khi xóa browser storage. | Chặn mạng sau lần cache, đóng/mở/reload; kiểm thông báo lỗi cache/storage và số lệnh chưa sync. |
| NFR-14 | Giao diện responsive, hỗ trợ light/dark/system, trạng thái focus và thao tác bàn phím cho control chính; thông báo không chỉ dựa vào màu. Xóa/restore/Apply phải thể hiện rõ tác động. | Browser kiểm desktop/mobile, tab/focus, label/lỗi, contrast theo bộ design-system hiện có; chưa tuyên bố chứng nhận WCAG toàn sản phẩm. |
| NFR-15 | Lỗi API thống nhất error.code/message/details/requestId; phân biệt input/auth/permission/conflict/expiry/limit/network/server. Không báo thành công khi trạng thái chưa xác định. | Kiểm 400/401/403/404/409/410/413/429/500/503 và mất mạng theo từng route; requestId dùng đối chiếu, không lộ secrets. |
| NFR-16 | TypeScript và ranh giới module rõ; frontend kiểm chiều import/vòng phụ thuộc; data-core thuần dùng chung. Lint/typecheck/build và test phù hợp phải đạt trước bàn giao thay đổi code. | Chạy các script của repository và kiểm artifact; test tích hợp/acceptance dùng môi trường cô lập, không thay dữ liệu người dùng. |
| NFR-17 | MongoDB hỗ trợ transaction; schema/index được provision có kiểm soát và xác minh lúc startup; production dùng HTTPS/CORS phù hợp. Có endpoint health phản ánh database khi bật. | Khởi động với config/schema/index lỗi; kiểm health và startup từ chối phục vụ khi điều kiện bắt buộc không đạt; kiểm HTTPS/cookie. |

### 4.1. Phục hồi và mất dữ liệu cho phép — NFR-21

| Tình huống | Mục tiêu nghiệm thu | Cách kiểm chứng |
| --- | --- | --- |
| Backend dừng/khởi động lại | Phục vụ trở lại trong 5 phút sau khi hạ tầng và database hoạt động bình thường | Dừng process có kiểm soát, khởi động lại; đo đến health và nghiệp vụ bảo vệ hoạt động. |
| Ollama dừng/lỗi | Processing thủ công tiếp tục dùng được; chức năng AI phục hồi trong 5 phút sau khi dịch vụ/model sẵn sàng | Tắt/khởi động lại Ollama; kiểm lỗi UI, thao tác thủ công và lượt inference thành công sau phục hồi. |
| Đóng/reload browser | Không mất thao tác local đã được xác nhận lưu | Đóng sau commit IndexedDB rồi mở lại offline; đối chiếu snapshot/history/outbox. |
| Mất mạng hoặc mất response | Không tạo thao tác lặp; giữ key/checkpoint, xác minh trước khi tiếp tục | Ngắt kết nối trước/sau commit; recovery receipt/operation rồi retry cùng thao tác. |
| Process backend gặp sự cố | Không mất thao tác server đã commit khi storage MongoDB còn nguyên | Gây lỗi/dừng process ở các giai đoạn publish; đối chiếu version/head/history/receipt sau phục hồi. Thao tác chưa xác nhận phải kiểm tra lại. |
| Mất database/storage | RPO ≤24 giờ và RTO ≤2 giờ | Khôi phục từ backup sang môi trường cô lập, kiểm tính đầy đủ và chạy luồng đọc/xử lý sau restore. |
| Xung đột sync | Không tự ghi đè server; giữ bản local và tiến độ đã xác nhận | Thay đổi head từ phiên khác rồi sync; kiểm thông báo, dữ liệu local và checkpoint. |
| Xóa browser storage | Không bảo đảm phục hồi dữ liệu chỉ tồn tại local; UI nêu rõ giới hạn | Kiểm cảnh báo trước thao tác xóa local do app cung cấp và tài liệu sử dụng; không tuyên bố backup server chứa dữ liệu chưa sync. |

**RPO** là độ cũ tối đa của dữ liệu có thể mất khi khôi phục; **RTO** là thời gian tối đa khôi phục dịch vụ. RPO/RTO cho mất storage tính từ thời điểm sự cố, bao gồm phát hiện, chuẩn bị và restore; khác với mục tiêu khởi động lại process khi hạ tầng còn nguyên. Ghi rõ mốc thời gian trong diễn tập.

### 4.2. Backup và xác minh phục hồi — NFR-22

Backup dữ liệu server ít nhất mỗi 24 giờ để đáp ứng RPO ≤24 giờ. Bản backup phải nhất quán, lưu tách khỏi storage đang phục vụ, bảo vệ quyền truy cập và bao gồm MongoDB cùng tệp CSV nguồn được lưu riêng cùng các tham chiếu cần thiết. Kiểm tra kết quả mỗi lần backup, phát hiện lỗi và xử lý để duy trì khoảng cách tối đa 24 giờ giữa các mốc backup có thể phục hồi. Thực hiện diễn tập restore trước bàn giao và sau thay đổi cơ chế backup; đối chiếu quyền sở hữu, snapshot/chunk, version/head/history và tệp nguồn.

Snapshot/history không thay thế backup database. Tiêu chí NFR-21–22 cần bằng chứng diễn tập, không suy ra đã đạt từ test unit hoặc hướng dẫn chạy local. Thời hạn giữ bản backup, uptime SLA và ma trận browser chính thức được xác định trong kế hoạch vận hành.

## 5. Căn cứ và liên hệ

[API](../api/API.md), [DTO](../api/dto-contract.md), [database](../database/database.md), [kiến trúc](../architecture/architecture.md), [data-core](../../packages/data-core/README.md), [báo cáo frontend 18/11](../reports/frontend-fix-review-2026-11-18.md). NFR-01–08 áp dụng xuyên suốt các [FR](functional-requirements.md); NFR-09–12 đặc biệt áp dụng import/processing/analysis; NFR-13–17 áp dụng toàn hệ thống theo môi trường tương ứng. NFR-18–20 quy định tải/độ trễ/AI/giao diện; NFR-21–22 quy định phục hồi và backup. Báo cáo đo/diễn tập phải đối chiếu từng mục tiêu, công bố trường hợp không đạt và môi trường thực tế.

## Bổ sung NFR-AI — AI local (18/11/2026)

Inference Qwen3 4B qua HTTP loopback trên máy backend, không API key cloud; một inference đồng thời/process, timeout mặc định 120 giây và giới hạn cấu hình tối đa 180 giây. Môi trường nghiệm thu dùng timeout 120 giây/lượt và các mục tiêu NFR-19. Mọi cột được thống kê, ứng viên chia lượt tối đa 12/lượt và tối đa 5 gợi ý/lượt; UI gọi tiếp toàn bộ các lượt, timeout áp dụng từng lượt. Không gửi tên cột/nội dung ô, không ghi gợi ý vào MongoDB, không đổi snapshot khi nhận gợi ý. Service AI không khả dụng không chặn processing thủ công. Runtime/model nằm ngoài Git; hướng dẫn tải/khởi động/kiểm tra tại [local-ai](../architecture/local-ai.md).

**Yêu cầu bàn giao Docker/server (chưa nghiệm thu):** môi trường đích phải cấp runtime/model riêng, lưu model bền vững, kiểm readiness và khôi phục sau restart; xác nhận tài nguyên CPU/GPU và giới hạn nhiều người dùng. Backend/Ollama tách container cần cấu hình origin nội bộ được cho phép thay cho loopback hiện có. Người dùng server chung không bắt buộc cài AI trên máy cá nhân; Ollama không được công khai trực tiếp ra Internet. Script PowerShell hiện không thay thế quy trình khởi tạo container Linux. Xem [kế hoạch và tiêu chí kiểm chứng](../architecture/local-ai-deployment.md).
