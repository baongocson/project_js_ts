# Kết quả k6 — data

Thời điểm UTC: 2026-11-18T11:00:41.782Z

Kết luận threshold: **KHÔNG ĐẠT**. Phạm vi môi trường xem metadata.json và hướng dẫn.

| Tác vụ | Mẫu hợp lệ | p50 ms | p95 ms | min ms | max ms | Mục tiêu p95 ms |
| --- | --- | --- | --- | --- | --- | --- |
| import_e2e | 20 | 4175.00 | 7536.15 | 2629.00 | 7938.00 | 10000 |
| rows | 20 | 1107.00 | 2192.60 | 524.00 | 2394.00 | 2000 |
| rows_filter | 20 | 1113.50 | 2520.05 | 428.00 | 2844.00 | 2000 |
| summary | 20 | 1967.00 | 3306.90 | 523.00 | 3685.00 | 3000 |
| distribution | 20 | 2059.50 | 3054.20 | 527.00 | 3590.00 | 3000 |
| correlation | 20 | 2042.50 | 3415.30 | 813.00 | 5226.00 | 3000 |
| points3d | 20 | 2475.00 | 3603.55 | 926.00 | 3975.00 | 3000 |
| preview | 20 | 3776.50 | 5196.45 | 1651.00 | 5604.00 | 10000 |
| tfidf | 20 | 7900.50 | 15530.10 | 6414.00 | 17888.00 | 30000 |
| one_hot | 20 | 6223.00 | 7981.30 | 5121.00 | 7987.00 | 30000 |
| apply | 20 | 571.00 | 1120.35 | 74.00 | 1697.00 | 5000 |
| restore | 20 | 5465.50 | 6513.35 | 2309.00 | 6843.00 | 5000 |

Lỗi đo: 0.000%. Iterations hoàn tất: 20. Dropped iterations: 0.

Threshold không đạt: perf_duration{op:rows}: p(95)<=2000; perf_duration{op:rows_filter}: p(95)<=2000; perf_duration{op:distribution}: p(95)<=3000; perf_duration{op:restore}: p(95)<=5000; perf_duration{op:summary}: p(95)<=3000; perf_duration{op:points3d}: p(95)<=3000; perf_duration{op:correlation}: p(95)<=3000.

| HTTP status (0 = transport error) | Số request đo |
| --- | --- |
| 404 | 0 |
| 413 | 0 |
| 429 | 0 |
| 400 | 0 |
| 500 | 0 |
| 409 | 0 |
| 201 | 120 |
| 200 | 120 |
| 410 | 0 |
| 403 | 0 |
| 401 | 0 |
| 503 | 0 |
| 0 | 0 |

Import đo end-to-end, gồm upload, không tách chính xác thời điểm backend nhận đủ file. Các p95 bao gồm cả mẫu lỗi; số mẫu hợp lệ hiển thị riêng. Không đo LCP/CLS/FPS, backup/RPO/RTO hoặc chất lượng AI.
