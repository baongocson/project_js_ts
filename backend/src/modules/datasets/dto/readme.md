# Datasets DTO

Định nghĩa request, query, response và validation của import và truy xuất dataset.

## File hiện có

- dataset-query.dto.ts: khai báo kiểu dữ liệu hoặc parser tương ứng.
- dataset-query.validation.ts: kiểm tra cấu trúc, giá trị và chuẩn hóa request theo hợp đồng.
- import-options.dto.ts: khai báo kiểu dữ liệu hoặc parser tương ứng.

## Luồng

Controller nhận body/query/params → pipe/parser kiểm dữ liệu → DTO hợp lệ chuyển đến service. DTO không thay kiểm quyền hoặc kiểm dữ liệu tồn tại trong database; response type không tự lọc bí mật. Giữ nguyên API/ERD đã có.

Kiểm thử validation và projection tại src/test/unit (common/, modules/, contracts/); HTTP tại src/test/e2e. TypeScript strict, không any.
