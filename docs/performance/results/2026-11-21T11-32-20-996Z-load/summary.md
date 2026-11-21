# Kết quả k6 — load

Thời điểm UTC: 2026-11-21T11:42:40.687Z

Kết luận threshold: **ĐẠT**. Phạm vi môi trường xem metadata.json và hướng dẫn.

| Tác vụ | Mẫu hợp lệ | p50 ms | p95 ms | min ms | max ms | Mục tiêu p95 ms |
| --- | --- | --- | --- | --- | --- | --- |
| me | 1200 | 4.00 | 77.05 | 1.00 | 121.00 | 1000 |
| projects | 1200 | 6.00 | 8.00 | 4.00 | 82.00 | 1000 |
| project | 1200 | 142.00 | 211.00 | 123.00 | 343.00 | 1000 |
| workspace | 1200 | 207.00 | 289.05 | 170.00 | 537.00 | 1000 |
| history | 1200 | 81.00 | 120.00 | 5.00 | 158.00 | 1000 |

Lỗi đo: 0.000%. Iterations hoàn tất: 6000. Dropped iterations: 0.

Threshold không đạt: không có.

| HTTP status (0 = transport error) | Số request đo |
| --- | --- |
| 404 | 0 |
| 410 | 0 |
| 200 | 6000 |
| 201 | 0 |
| 413 | 0 |
| 0 | 0 |
| 403 | 0 |
| 429 | 0 |
| 500 | 0 |
| 400 | 0 |
| 401 | 0 |
| 503 | 0 |
| 409 | 0 |

Import đo end-to-end, gồm upload, không tách chính xác thời điểm backend nhận đủ file. Các p95 bao gồm cả mẫu lỗi; số mẫu hợp lệ hiển thị riêng. Không đo LCP/CLS/FPS, backup/RPO/RTO hoặc chất lượng AI.
