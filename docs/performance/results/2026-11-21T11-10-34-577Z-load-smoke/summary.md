# Kết quả k6 — load

Thời điểm UTC: 2026-11-21T11:11:03.748Z

Kết luận threshold: **ĐẠT**. Phạm vi môi trường xem metadata.json và hướng dẫn.

| Tác vụ | Mẫu hợp lệ | p50 ms | p95 ms | min ms | max ms | Mục tiêu p95 ms |
| --- | --- | --- | --- | --- | --- | --- |
| me | 21 | 23.00 | 86.00 | 4.00 | 126.00 | 1000 |
| projects | 20 | 7.00 | 28.55 | 5.00 | 39.00 | 1000 |
| project | 20 | 165.50 | 218.85 | 130.00 | 235.00 | 1000 |
| workspace | 20 | 258.50 | 343.10 | 189.00 | 345.00 | 1000 |
| history | 20 | 27.50 | 118.05 | 6.00 | 119.00 | 1000 |

Lỗi đo: 0.000%. Iterations hoàn tất: 101. Dropped iterations: 0.

Threshold không đạt: không có.

| HTTP status (0 = transport error) | Số request đo |
| --- | --- |
| 403 | 0 |
| 0 | 0 |
| 413 | 0 |
| 410 | 0 |
| 200 | 101 |
| 404 | 0 |
| 400 | 0 |
| 500 | 0 |
| 201 | 0 |
| 409 | 0 |
| 401 | 0 |
| 429 | 0 |
| 503 | 0 |

Import đo end-to-end, gồm upload, không tách chính xác thời điểm backend nhận đủ file. Các p95 bao gồm cả mẫu lỗi; số mẫu hợp lệ hiển thị riêng. Không đo LCP/CLS/FPS, backup/RPO/RTO hoặc chất lượng AI.
