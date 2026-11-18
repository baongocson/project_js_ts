# Kiểm thử hiệu năng bằng k6

Bộ đo kiểm [NFR-18 và NFR-19](../requirements/non-functional-requirements.md) qua HTTPS với backend NestJS production build và MongoDB replica tạm. Mỗi lần chạy tạo tài khoản, phiên, project và dataset tổng hợp riêng; không dùng URI/database hoặc tài khoản của ứng dụng đang chạy. Không thay `.env`. Xem [báo cáo và số đo ngày 18/11/2026](report-2026-11-18.md).

## 1. Chuẩn bị

- Node/npm theo [README dự án](../../README.md), dependency đã cài bằng `npm install`.
- [k6 CLI chính thức](https://grafana.com/docs/k6/latest/set-up/install-k6/) trong PATH, hoặc đặt `K6_BIN` đến đường dẫn tuyệt đối của executable. Bộ này đã kiểm với **k6 v2.4.0**; dùng định dạng summary cũ qua `--new-machine-readable-summary=false` để xuất báo cáo ổn định.
- OpenSSL trong PATH hoặc `OPENSSL_BIN`; cổng loopback **4443** và **4312** phải rảnh. Runner từ chối chạy nếu cổng bị chiếm.
- MongoDB 8.0.16 do `mongodb-memory-server` quản lý; binary cache ở `backend/storage/test-binaries`. Lần đầu cần mạng để tải nếu chưa có.
- Profile AI cần Ollama thật đang hoạt động ở `127.0.0.1:11434`, model `qwen3:4b` đã tải; khởi động bằng `npm run ai:start`. Profile load/data tắt AI trong process thử.

Ví dụ PowerShell khi đặt k6 trong artifact local:

```powershell
$env:K6_BIN = (Resolve-Path '.artifact-work/k6/k6-v2.4.0-windows-amd64/k6.exe').Path
npm run test:perf -- --profile=data --smoke
npm run test:perf:load
npm run test:perf:data
npm run test:perf:ai
```

`--smoke` chỉ kiểm bộ chạy (load 10 giây hoặc data/AI 2 iteration), không phải nghiệm thu 10 phút/20 mẫu. Chạy các profile tuần tự để tránh tranh cổng và tài nguyên. Script npm tự build backend/core trước đo; không tính build vào số liệu k6. Exit code khác 0 nếu threshold thất bại hoặc không khởi tạo được môi trường; không đổi mục tiêu để làm lượt đo thành công.

## 2. Workload

| Profile | Cách chạy | Phạm vi và ngưỡng |
| --- | --- | --- |
| `load` | Constant arrival rate, 10 iteration/giây trong 10 phút; mỗi iteration đúng 1 HTTP request; tối đa 5 VU | 20 phiên đăng nhập tồn tại, 5 phiên có thể hoạt động. Hồ sơ, list project, detail project, PATCH workspace và history mỗi loại 20% số request; p95 ≤1 giây, lỗi <1%, dropped iterations=0, đủ 6000 iteration. |
| `data` | Shared iterations, 20 workflow chia cho 5 VU | Mỗi workflow tạo project/import thật riêng, đọc bảng/filter/sort, summary/distribution/correlation/points 3D, Preview fill_mean/TF-IDF/one-hot, Apply và Restore. Ngưỡng p95 theo NFR; mỗi tác vụ cần đủ 20 mẫu hợp lệ. |
| `ai` | 1 VU, 20 lượt sau warmup ngoài số đo | Gọi API suggestions nhóm Missing batch 0 trên dataset online với auth/ownership/DB thật; p95 ≤60 giây và đủ 20 mẫu hợp lệ, timeout backend 120 giây/lượt. Không gọi model giả và không lấy response rỗng không có ứng viên để chứng minh inference. |

`load` dùng revision riêng theo VU và thực sự đổi tab collection/missing khi PATCH. `data` dùng key riêng cho từng thao tác, không replay receipt để thay thời gian xử lý thật. Apply công bố candidate fill_mean, Restore tạo version mới từ bản import. Các project thử tồn tại trong replica tạm đến khi runner dọn toàn bộ môi trường; không có cleanup chen vào latency tác vụ.

Fixture tái tạo bằng code: **10.000 dòng, 20 cột** (18 number, 2 text), có 1000 ô missing, 5 category, dòng lặp và outlier. Từ vựng TF-IDF hữu hạn, maxFeatures=16, giữ cột nguồn; one-hot giữ nguồn với 5 category. CSV bytes/checksum cụ thể ghi trong metadata. Đây là một fixture hiệu năng xác định, không bao phủ mọi method/scope/category hoặc CSV ở trần 16.000.000 byte.

## 3. Số liệu và kết quả

Mỗi lần chạy lưu trong `docs/performance/results/<UTC>-<profile>[-smoke]/`:

- `metadata.json`: cấu hình máy, Node/k6/MongoDB, commit, fixture, workload, thời điểm, exit code và giới hạn môi trường.
- `summary.json`: metric/threshold tổng hợp từ k6, không chứa body response hay token.
- `summary.md`: bảng p50/p95/min/max, số mẫu hợp lệ, mục tiêu, lỗi, dropped iterations và số request theo HTTP status.

Không trộn setup với metric `perf_*`: tạo tài khoản/seed/warmup nằm ngoài k6; request hỗ trợ tạo project trong workflow được gắn `phase=support`, không nằm trong `perf_errors/perf_duration`, nhưng thất bại vẫn làm iteration không hoàn tất và threshold fail. Metric `http_*` tổng thể của k6 có thể bao gồm bước hỗ trợ; khi đối chiếu NFR dùng `perf_*`. Không tự bỏ lỗi khỏi latency. Số mẫu hợp lệ được kiểm bằng threshold riêng; timeout/HTTP sai/body sai tăng lỗi. HTTP 4xx, 5xx và transport status 0 được báo cáo, không được miễn lỗi trong workload thành công này.

Setup nâng **AUTH_REGISTER_LIMIT=100** chỉ trong process cô lập để tạo 20 tài khoản, vì mặc định ứng dụng giới hạn 10 đăng ký/15 phút. Các giới hạn login giữ nguyên; không dùng bài này để kết luận hiệu suất hoặc bảo mật Auth. Token/fixture chứa thông tin phiên chỉ ghi trong thư mục tạm và xóa sau chạy; báo cáo không xuất chúng.

## 4. Phạm vi kết luận

- Máy phát tải, HTTPS proxy, backend và MongoDB chạy cùng máy để tái lập thuận tiện. Kết quả là benchmark local tích hợp, **chưa xác nhận điều kiện máy phát tải riêng** trong NFR. Phải chạy môi trường triển khai với máy phát tải riêng trước khi coi là SLA.
- HTTPS dùng chứng chỉ localhost tạm và bỏ kiểm chứng certificate chỉ trong process test; không tắt TLS ứng dụng/toàn hệ thống. Proxy chỉ phục vụ API, không chạy frontend.
- `import_e2e` gồm upload; không đo riêng đúng khoảng sau khi backend nhận đủ file. Nếu đạt ngưỡng này thì là bằng chứng bảo thủ; nếu vượt phải đo thêm server timing trước kết luận mục import theo NFR không đạt.
- AI profile chỉ đo warm inference từng batch Missing, chưa kiểm 3 cold starts, tất cả nhóm, hoàn tất multi-batch, chất lượng gợi ý hay busy dưới tải. Không thay đổi hoặc unload model trên Ollama đang dùng chung.
- k6 HTTP không đo LCP/CLS/FPS, khả năng mở offline, RAM/CPU peak của từng dịch vụ hoặc RPO/RTO. Metadata RAM là RAM lắp đặt, không phải mức dùng quan sát. Các mục này cần phép đo browser/telemetry/diễn tập riêng.
- Mỗi token có hạn 15 phút. Bộ runner không refresh token; chạy tách profile để cấp phiên mới. Nếu tác vụ chậm tới mức token hết hạn, lỗi 401 phải được giữ trong báo cáo và bổ sung kiểm phiên trước lần đo dài hơn.
- Runner fail trước k6 chỉ có metadata lỗi; không có summary không được hiểu là pass. Khi dừng cưỡng bức, kiểm lại các process thử và cổng; đường cleanup tự động áp dụng khi runner kết thúc bình thường hoặc bắt được lỗi.

## 5. Nguồn kỹ thuật

[Constant arrival rate](https://grafana.com/docs/k6/latest/using-k6/scenarios/executors/constant-arrival-rate/), [thresholds](https://grafana.com/docs/k6/latest/using-k6/thresholds/), [custom summary](https://grafana.com/docs/k6/latest/results-output/end-of-test/custom-summary/), [test lifecycle](https://grafana.com/docs/k6/latest/using-k6/test-lifecycle/). Script nằm ở [dashboard.k6.js](../../scripts/performance/dashboard.k6.js) và [runner](../../scripts/performance/run-local.cjs).
