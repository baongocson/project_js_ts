# Kết quả k6 — data

Thời điểm UTC: 2026-11-21T11:49:30.604Z

Kết luận threshold: **ĐẠT**. Phạm vi môi trường xem metadata.json và hướng dẫn.

| Tác vụ | Mẫu hợp lệ | p50 ms | p95 ms | min ms | max ms | Mục tiêu p95 ms |
| --- | --- | --- | --- | --- | --- | --- |
| import_e2e | 20 | 1336.00 | 1407.70 | 691.00 | 1421.00 | 10000 |
| rows | 20 | 501.00 | 903.70 | 264.00 | 1221.00 | 2000 |
| rows_filter | 20 | 561.50 | 914.65 | 299.00 | 927.00 | 2000 |
| summary | 20 | 773.00 | 1146.30 | 255.00 | 1266.00 | 3000 |
| distribution | 20 | 811.50 | 1238.00 | 304.00 | 1428.00 | 3000 |
| correlation | 20 | 954.50 | 1370.70 | 327.00 | 1574.00 | 3000 |
| points3d | 20 | 900.00 | 1177.85 | 347.00 | 1232.00 | 3000 |
| preview | 20 | 1642.50 | 1994.90 | 1275.00 | 2069.00 | 10000 |
| tfidf | 20 | 3024.50 | 3715.55 | 2044.00 | 3992.00 | 30000 |
| one_hot | 20 | 2223.50 | 2616.45 | 1642.00 | 3157.00 | 30000 |
| apply | 20 | 46.50 | 619.30 | 29.00 | 625.00 | 5000 |
| restore | 20 | 2095.00 | 2362.50 | 1446.00 | 2372.00 | 5000 |

Lỗi đo: 0.000%. Iterations hoàn tất: 20. Dropped iterations: 0.

Threshold không đạt: không có.

| HTTP status (0 = transport error) | Số request đo |
| --- | --- |
| 400 | 0 |
| 410 | 0 |
| 503 | 0 |
| 500 | 0 |
| 200 | 120 |
| 201 | 120 |
| 403 | 0 |
| 404 | 0 |
| 401 | 0 |
| 409 | 0 |
| 413 | 0 |
| 0 | 0 |
| 429 | 0 |

Import đo end-to-end, gồm upload, không tách chính xác thời điểm backend nhận đủ file. Các p95 bao gồm cả mẫu lỗi; số mẫu hợp lệ hiển thị riêng. Không đo LCP/CLS/FPS, backup/RPO/RTO hoặc chất lượng AI.
