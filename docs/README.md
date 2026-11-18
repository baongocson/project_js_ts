# Tài liệu Dashboard 3D

## Phân tích bài toán và yêu cầu

Bộ tài liệu được bổ sung ngày **18/11/2026**, mô tả yêu cầu của hệ thống dựa trên hợp đồng API và tài liệu dự án hiện có. Đây không phải báo cáo xác nhận mọi yêu cầu đã được kiểm thử thành công.

| Tài liệu | Nội dung |
| --- | --- |
| [Đặt vấn đề và bài toán](requirements/problem-statement.md) | Bối cảnh, vấn đề, mục tiêu, đối tượng sử dụng và phạm vi |
| [Đặc tả yêu cầu phần mềm](requirements/software-requirements-specification.md) | Tổng quan, mô hình dữ liệu, giao diện, quy tắc và truy vết yêu cầu |
| [Yêu cầu chức năng](requirements/functional-requirements.md) | Danh mục FR và tiêu chí chấp nhận |
| [Yêu cầu phi chức năng](requirements/non-functional-requirements.md) | Bảo mật, toàn vẹn, giới hạn tài nguyên, khả dụng và khả năng bảo trì |
| [Đặc tả use case](useCase/use-cases.md) | Tác nhân, sơ đồ, luồng chính, ngoại lệ và hậu điều kiện |

## Tài liệu kỹ thuật và triển khai

- [Hợp đồng API](api/API.md), [DTO contract](api/dto-contract.md), [bảng API gốc](api/API.xlsx).
- [Kiến trúc](architecture/architecture.md), [chất lượng mã nguồn](architecture/code-quality.md).
- [AI local: thiết kế và thiết lập](architecture/local-ai.md), [sử dụng trong team và kế hoạch Docker/server chung](architecture/local-ai-deployment.md). Script Windows đã có; Docker Compose tách Ollama còn cần triển khai và nghiệm thu.
- [Database](database/database.md), [sơ đồ ERD](useCase/ERD.html).
- [Kế hoạch backend](plans/backend-implementation-plan.md), [kế hoạch frontend](plans/frontend-implementation-plan.md).
- [Báo cáo frontend ngày 18/11/2026](reports/frontend-fix-review-2026-11-18.md), [nghiệm thu backend/offline](reports/backend-plan-remediation-2026-11-16.md).

Các kế hoạch và báo cáo phản ánh thời điểm riêng. Khi đối chiếu chi tiết request/response, dùng API.md và dto-contract.md, bao gồm phần bổ sung ngày 17/11/2026 về TF-IDF, boxplot và 3D. Các liên kết ERD cũ trỏ đến `docs/erd/ERD.html` trong tài liệu trước đây cần đối chiếu với vị trí hiện có là `docs/useCase/ERD.html`.
