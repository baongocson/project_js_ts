# AI Prompting Log — bắt đầu từ lượt tiếp nhận bàn giao 14/11/2026

> Tài liệu này chỉ ghi những tác vụ AI thực hiện trong lượt hiện tại. Không tự suy ra hoặc bịa lại lịch sử prompt của nhóm trưởng trước đó.

| Mốc | Yêu cầu/đầu vào | AI đã thực hiện | Bằng chứng | Còn thiếu |
|---|---|---|---|---|
| 2026-11-14, tiếp nhận | Tiếp tục từ repo `baongocson/project_js_ts`, `main` commit `1067712`; offline cơ bản trước Auth; code JS/TS không `any` | Đọc ZIP của đúng commit, `docs/architecture.md`, `database.md`, `API.md`, `dto-contract.md` | API 27 route, 12 collection, 46 DB tests PASS theo tài liệu bàn giao | Chưa chạy lại DB trên Atlas |
| 2026-11-14, Frontend offline | Khi web đang mở mà Backend/ngắt mạng thì xem bảng, 3D, preview và xử lý cục bộ | Ghép mô-đun browser demo vào frontend gốc: CSV/Canvas 3D/Preview/Apply/History/Restore/IndexedDB; thêm bảo vệ lỗi dữ liệu và ghi tuần tự | `npm run test:local-engine -w frontend`: 8/8 PASS | Chưa đồng bộ Atlas; React build/E2E chưa xác minh |
| 2026-11-14, tài liệu & kiểm tra mã | Giải thích từng API, DTO, ERD và README mỗi module; tuyệt đối không dùng TypeScript any | Viết `docs/HUONG_DAN_API_DTO_ERD_TU_SO_0.md`, README 7 module, script TypeScript AST kiểm `any` | `npm run check:no-any`: PASS 76 source files, không vi phạm; `'any'` là một business string hợp lệ | Full lint/typecheck/build/test HTTP cần cài dependencies |
| 2026-11-14, cài dependencies | Kiểm tra khả năng build đủ frontend + backend | Thử `npm ci --offline` rồi `npm ci` | `npm ci --offline` lỗi ENOTCACHED; `npm ci` lỗi npm `Exit handler never called!` | Không được ghi PASS build; phải chạy lại trên máy người phát triển |

**Quy tắc chứng nhận:** mỗi lần AI thay đổi module phải bổ sung entry có lệnh test, kết quả thực tế và hạng mục chưa kiểm thử. Nếu dùng Codex/GitHub agent, dán prompt phiên làm việc vào phần log tiếp theo (không đính kèm secrets).
