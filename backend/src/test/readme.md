# Kiểm thử backend

Dùng Jest + ts-jest, Nest Testing và Supertest. Chọn cách test tập trung trong src/test đã có, chia unit/e2e/integration; bên trong tổ chức theo common, modules, infrastructure. Không tạo thêm hệ thống backend/test song song hoặc nhân bản module rỗng chỉ để đủ cây.

```text
src/test/
  setup.ts, utils.ts
  unit/
    common/domain/             # cell policy/comparison, canonical request
    modules/
      auth/                    # auth.service và auth.validation
      datasets/                # import options
      processing/              # preview validation/policy/diagnostics
      projects/                # workspace
      users/                   # response projection
    contracts/                 # quy tắc liên module: query, filter/workspace,
                               # resource ID, profile/project, restore/retry
  e2e/
    modules/auth/auth.e2e-spec.ts
    http.e2e-spec.ts            # toàn bộ HTTP contract liên module
  integration/
    infrastructure/database/
      database.integration-spec.ts
      database-health.integration-spec.ts
```

18 ca kiểm hợp đồng trước ở unit/contracts.spec.ts đã được chuyển theo trách nhiệm, giữ nguyên assertion. Cộng hai ca AuthService, tổng unit vẫn 20. E2E giữ 40 ca; các file integration chỉ đổi vị trí/import, không thay assertion hoặc cơ chế cleanup.

Luồng: Jest chọn project → ts-jest kiểm kiểu/biên dịch → setup nạp metadata → spec chạy. utils tạo Nest app cấu hình tương ứng main, khôi phục môi trường và đóng app sau suite. E2E backend dùng database=false, port tạm; integration dùng Atlas thật và phải chạy riêng. Không skip lỗi kết nối để giả PASS.

Từ gốc repo:

```powershell
npm run test:unit
npm run test:e2e:backend
npm run test:contracts -w backend
npm run test:integration
npm exec -w backend -- jest --config jest.config.cjs --selectProjects e2e --runTestsByPath src/test/e2e/modules/auth/auth.e2e-spec.ts --runInBand
```

Root test:e2e chạy cả E2E backend và Playwright frontend; dùng test:e2e:backend để chỉ chạy phần này. Typecheck kiểm app và test; production build loại src/test.

Đợt refactor hiện tại: unit 20/20, backend E2E 40/40. Integration chưa chạy lại trên Atlas trong đợt này; không dùng kết quả lần trước làm bằng chứng mới. Auth test hiện kiểm contract 400/501, chưa chứng minh đăng nhập hoặc phân quyền đã triển khai.

## BE-1 ngày 16/11/2026

Bộ DTO cũ dùng createTestApp(false, true) để override guard tường minh, giữ test parser/contract khi database tắt. createTestApp mặc định không override. Security HTTP mới kiểm global guards thật; integration/modules/auth kiểm 7 API Auth/Users và ownership/cascade trên Atlas thật. owned-fixture.ts chỉ tạo dữ liệu có ID/file riêng.

Lệnh mới: npm run test:be1 -w backend. Secret test sinh trong process, không sửa .env; restore sau suite. Account sweeper của app tắt trong test, riêng recovery test dùng service instance mới để dọn đúng user thử. Kết quả BE-1 mới nhất và giới hạn browser HTTPS xem docs/plans/be1-handoff.md; số test của đợt refactor phía trên là số lịch sử.
