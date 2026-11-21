# Kết quả k6 — ai

Thời điểm UTC: 2026-11-21T12:15:58.635Z

Kết luận threshold: **ĐẠT**. Phạm vi môi trường xem metadata.json và hướng dẫn.

| Tác vụ | Mẫu hợp lệ | p50 ms | p95 ms | min ms | max ms | Mục tiêu p95 ms |
| --- | --- | --- | --- | --- | --- | --- |
| ai_warm | 20 | 3114.50 | 3144.55 | 3045.00 | 3174.00 | 60000 |

Lỗi đo: 0.000%. Iterations hoàn tất: 20. Dropped iterations: 0.

Threshold không đạt: không có.

| HTTP status (0 = transport error) | Số request đo |
| --- | --- |
| 403 | 0 |
| 0 | 0 |
| 400 | 0 |
| 201 | 20 |
| 503 | 0 |
| 413 | 0 |
| 401 | 0 |
| 404 | 0 |
| 429 | 0 |
| 410 | 0 |
| 200 | 0 |
| 500 | 0 |
| 409 | 0 |

Import đo end-to-end, gồm upload, không tách chính xác thời điểm backend nhận đủ file. Các p95 bao gồm cả mẫu lỗi; số mẫu hợp lệ hiển thị riêng. Không đo LCP/CLS/FPS, backup/RPO/RTO hoặc chất lượng AI.
