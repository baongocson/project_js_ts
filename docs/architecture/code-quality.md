# ESLint và kiểm tra chất lượng code

## Cài đặt và phạm vi

ESLint 10, @eslint/js, typescript-eslint, globals và eslint-plugin-react-hooks là devDependencies ở package.json gốc, dùng chung qua npm workspaces. Cấu hình flat config tại eslint.config.mjs; không cần sao chép cấu hình riêng trong frontend/backend.

ESLint 10 được chọn vì đang được hỗ trợ; Node trong dự án là `^22.13.0 || >=24.0.0`. Máy dùng để kiểm tra hiện chạy Node 24. ESLint là công cụ phát triển, không được import vào bundle frontend hoặc runtime Nest.

## Nhóm quy tắc

- JavaScript và script/config Node: bộ recommended của ESLint, globals Node phù hợp với .mjs/.cjs.
- TypeScript frontend/backend/test: recommended của typescript-eslint, gồm tránh any tường minh, phát hiện biến/import dư và những mẫu code dễ sai.
- Promise: bật no-floating-promises và no-misused-promises với thông tin kiểu. `void` được dùng khi cố ý bỏ qua một Promise theo mặc định của rule; không thay thế xử lý lỗi nghiệp vụ.
- Frontend React: preset recommended của react-hooks, gồm quy tắc gọi hook và dependency effect; globals trình duyệt chỉ áp cho src.
- Type import frontend: ưu tiên import type. Backend giữ value import cần cho decorator metadata/dependency injection của Nest; không tự đổi constructor dependency sang type-only import.
- Biến/tham số chưa sử dụng có tiền tố `_` được chấp nhận cho các điểm mở rộng/scaffold có chủ ý; code dư thật được xóa thay vì đổi tên để né lint.
- Directive tắt rule không còn cần thiết bị báo lỗi. Riêng regex ASCII trong auth.validation.ts có ngoại lệ một dòng kèm lý do: giữ nguyên dải ASCII và bước isEmail hiện hành.

Typed linting backend dùng tsconfig.spec.json vì file này bao gồm cả source và test. Frontend dùng tsconfig.json cùng tsconfig.test.json để bao phủ app, Vite, Playwright và test. Không cần thay tsconfig production chỉ để đưa test vào lint.

Bỏ qua node_modules, dist, coverage, test-results, playwright-report, cache Playwright, .artifact-work, .npm-cache và video. Không dùng việc bỏ qua thư mục source/test để làm lint PASS.

## Lệnh chạy

Từ gốc repository:

```powershell
npm run lint
npm run lint:fix
npm run lint -w frontend
npm run lint -w backend
npm run lint:fix -w frontend
npm run lint:fix -w backend
```

lint chỉ báo lỗi, không sửa file. lint:fix ghi thay đổi với các lỗi hỗ trợ autofix; vẫn cần đọc diff, và không phải mọi lỗi đều được sửa tự động. Các lệnh dùng --max-warnings=0 để không bỏ qua cảnh báo trong bước kiểm tra.

Quy trình kiểm tra khi sửa code: lint → typecheck → test phù hợp → build. Chạy E2E khi thay hành vi HTTP/UI; integration Atlas là kiểm tra riêng khi thay persistence/database. Script check:architecture frontend tiếp tục kiểm chiều import và vòng phụ thuộc; ESLint chưa thay trách nhiệm đó. Chưa cài Prettier hoặc áp thêm bộ quy tắc định dạng toàn dự án.

ESLint không tự gắn vào npm run dev, không tự chạy autofix khi lưu và chưa thêm CI/hook Git. Nếu dùng extension ESLint trong trình soạn thảo, mở cả thư mục repository để nhận cấu hình gốc.

## Tham chiếu

- [Cấu hình ESLint](https://eslint.org/docs/latest/use/configure/configuration-files)
- [Vòng đời phiên bản ESLint](https://eslint.org/version-support/)
- [Typed linting](https://typescript-eslint.io/getting-started/typed-linting/)
- [React Hooks lint](https://react.dev/reference/eslint-plugin-react-hooks)
