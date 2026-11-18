# Kết quả k6 — load

Thời điểm UTC: 2026-11-18T11:11:39.417Z

Kết luận threshold: **KHÔNG ĐẠT**. Phạm vi môi trường xem metadata.json và hướng dẫn.

| Tác vụ | Mẫu hợp lệ | p50 ms | p95 ms | min ms | max ms | Mục tiêu p95 ms |
| --- | --- | --- | --- | --- | --- | --- |
| me | 1012 | 49.00 | 552.90 | 2.00 | 1071.00 | 1000 |
| projects | 1012 | 14.00 | 687.35 | 3.00 | 1190.00 | 1000 |
| project | 1012 | 208.00 | 1380.90 | 124.00 | 2165.00 | 1000 |
| workspace | 1011 | 288.00 | 1426.50 | 171.00 | 2223.00 | 1000 |
| history | 1011 | 91.00 | 513.00 | 3.00 | 1228.00 | 1000 |

Lỗi đo: 0.000%. Iterations hoàn tất: 5058. Dropped iterations: 943.

Threshold không đạt: perf_duration{op:project}: p(95)<=1000; perf_completed: count>=6000; dropped_iterations: count==0; perf_duration{op:workspace}: p(95)<=1000.

| HTTP status (0 = transport error) | Số request đo |
| --- | --- |
| 409 | 0 |
| 410 | 0 |
| 500 | 0 |
| 403 | 0 |
| 413 | 0 |
| 0 | 0 |
| 401 | 0 |
| 200 | 5058 |
| 503 | 0 |
| 201 | 0 |
| 404 | 0 |
| 429 | 0 |
| 400 | 0 |

Import đo end-to-end, gồm upload, không tách chính xác thời điểm backend nhận đủ file. Các p95 bao gồm cả mẫu lỗi; số mẫu hợp lệ hiển thị riêng. Không đo LCP/CLS/FPS, backup/RPO/RTO hoặc chất lượng AI.
