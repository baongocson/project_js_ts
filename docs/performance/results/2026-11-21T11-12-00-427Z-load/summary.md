# Kết quả k6 — load

Thời điểm UTC: 2026-11-21T11:22:19.731Z

Kết luận threshold: **ĐẠT**. Phạm vi môi trường xem metadata.json và hướng dẫn.

| Tác vụ | Mẫu hợp lệ | p50 ms | p95 ms | min ms | max ms | Mục tiêu p95 ms |
| --- | --- | --- | --- | --- | --- | --- |
| me | 1201 | 4.00 | 60.00 | 2.00 | 125.00 | 1000 |
| projects | 1200 | 6.00 | 8.00 | 4.00 | 43.00 | 1000 |
| project | 1200 | 140.00 | 196.00 | 124.00 | 253.00 | 1000 |
| workspace | 1200 | 202.00 | 276.05 | 171.00 | 438.00 | 1000 |
| history | 1200 | 86.00 | 119.00 | 4.00 | 155.00 | 1000 |

Lỗi đo: 0.000%. Iterations hoàn tất: 6001. Dropped iterations: 0.

Threshold không đạt: không có.

| HTTP status (0 = transport error) | Số request đo |
| --- | --- |
| 200 | 6001 |
| 413 | 0 |
| 429 | 0 |
| 201 | 0 |
| 404 | 0 |
| 409 | 0 |
| 500 | 0 |
| 400 | 0 |
| 0 | 0 |
| 410 | 0 |
| 403 | 0 |
| 503 | 0 |
| 401 | 0 |

Import đo end-to-end, gồm upload, không tách chính xác thời điểm backend nhận đủ file. Các p95 bao gồm cả mẫu lỗi; số mẫu hợp lệ hiển thị riêng. Không đo LCP/CLS/FPS, backup/RPO/RTO hoặc chất lượng AI.
