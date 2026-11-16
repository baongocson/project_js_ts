# Trạng thái thực hiện refactor — 16/11/2026

## Phạm vi và các quyết định đã xác nhận

Thực hiện theo [frontend plan](frontend-refactor-plan.md) và [backend plan](backend-refactor-plan.md). Hai file kế hoạch đã được tìm thấy tại docs/refactor khi bắt đầu thực hiện, thay vì đường dẫn video ban đầu. Giữ bản phân tích video làm căn cứ lịch sử; tài liệu này ghi kết quả đối chiếu code và triển khai.

Người dùng đã xác nhận trong chat:

1. Giữ nghiệp vụ backend hiện tại; ghi rõ guard chưa hoàn thiện. Không triển khai auth/phân quyền hoặc CRUD trong đợt refactor.
2. Dùng React Router và Playwright cho frontend.

Checkout đã có nhiều thay đổi trước đợt này: repository backend đặt phẳng, guard/provider khung, README, Jest và test TypeScript; tài liệu được chuyển vào các nhóm docs. Các phần đó được giữ và đối chiếu, không ghi nhận là toàn bộ đều được tạo mới trong đợt này.

## Frontend

| Mục trong plan | Kết quả |
| --- | --- |
| Kiểm kê code trước khi chuyển | App là trang kiểm tra health; lib chỉ có API client; types/components/assets chỉ có placeholder; các feature chưa có nghiệp vụ. Không có component/type nghiệp vụ cần suy đoán đích chuyển. |
| App/router/providers | Thêm app/providers với StrictMode/BrowserRouter, app/router cho trang chủ và fallback; tách trang hệ thống và hook health. main giữ mount/CSS, App gọi router. Dùng app/index tường minh để tránh App.tsx/app xung đột trên Windows. |
| Chuẩn hóa feature | Có auth/projects/datasets/analysis/processing/history/offline, mỗi feature có api/components/hooks/pages, types.ts/index.ts và README. Khung rỗng được ghi rõ, chưa có tính năng nghiệp vụ để export hoặc kiểm thử thành công. |
| Shared API | Chuyển HTTP client từ lib sang shared/api, tách transport requestJson và endpoint health; giữ lỗi HTTP và AbortSignal, chuẩn hóa dấu / khi ghép URL. Không thêm Bearer/refresh/cookie flow giả. |
| Shared UI/style | Section dùng chung được trang hệ thống sử dụng; chuyển nguyên stylesheet sang shared/style/global.css và nạp qua index.css. Button/input/dialog và bộ token chưa được thêm khi chưa có nhu cầu UI/quy ước cụ thể. |
| Bỏ lib/types ngoài feature | Đã di chuyển code hữu ích từ lib, bỏ file placeholder types và thư mục rỗng. Không xóa utility hay dữ liệu nghiệp vụ. HealthResponse nằm trong shared/api do thuộc hợp đồng hạ tầng health. |
| src/components và assets | Giữ placeholder có trước, thêm README giải thích. Không có code bị bỏ; component mới phải vào feature/components hoặc shared/ui. |
| Index và chiều import | Thêm đầu mối export code thực tế, export type riêng. Script TypeScript parser/resolver kiểm app → features/shared, features → shared, shared không đi ngược, import sâu vào feature và vòng phụ thuộc. Kiểm trong typecheck. |
| E2E | Playwright Chromium kiểm trang hệ thống, dùng Nest thật với database=false. Có 4 ca: kết nối qua proxy, HTTP 503, lỗi mạng và điều hướng/reload. Chưa có auth.e2e.spec.ts frontend vì chưa có luồng auth, tránh tạo file test rỗng hoặc kết quả giả. |
| README | Frontend tổng, src, app, feature và các thư mục code con, shared, test, scripts có tài liệu về trách nhiệm, luồng, lệnh chạy và giới hạn triển khai. |

## Backend

| Mục trong plan | Kết quả |
| --- | --- |
| common/config/infrastructure/modules | Đã có, giữ nguyên trách nhiệm và cấu trúc chính; không đổi sang Clean Architecture bốn tầng từ đoạn góp ý nhóm khác. |
| Repository đặt phẳng | Đã có khi bắt đầu; đối chiếu các module, không tạo lại repositories/ hoặc đổi truy cập dữ liệu. |
| Guard/module wiring | Đã có scaffold/provider. Giữ nguyên theo xác nhận: guard chưa gắn route, chưa xác thực/phân quyền; repository chưa có CRUD. Không coi scaffold là đã hoàn thành bảo mật. |
| Schema/security/validation | Giữ code hiện tại, không thêm thao tác xóa. Các placeholder schemas/ đã vắng mặt trong checkout khi bắt đầu; không dùng điều đó làm bằng chứng giảng viên đã yêu cầu xóa schema. Registry schema/index vẫn ở infrastructure/database. |
| Test tập trung theo code nguồn | Giữ src/test và Jest đã có. Tách 18 contract case theo common/domain, modules/<name> và contracts liên module; đặt AuthService/Auth E2E dưới modules/auth, integration dưới infrastructure/database. Chỉ tạo nhánh có test thực tế. |
| Bảo toàn test | Giữ assertion của 18 contract case và 2 AuthService case, tổng 20; giữ 40 E2E. Integration chỉ đổi vị trí/import, không thay logic cleanup/rollback. Sửa script test:contracts cho bố trí mới, vẫn chọn 18 ca. |
| README và liên kết | Cập nhật tài liệu backend/test, tham chiếu spec đã chuyển, sửa README tổng không còn trỏ backend/test đã mất. Sửa các liên kết API/ERD/database/architecture tại README và tài liệu kiến trúc. |
| AI | Chưa triển khai vì hướng dẫn trong video là có điều kiện và chưa thuộc nghiệp vụ được yêu cầu ở đợt này. |

## Kiểm chứng

| Kiểm tra đã chạy | Kết quả |
| --- | --- |
| npm run typecheck | Đạt backend runtime/test, frontend runtime/test/config và kiểm kiến trúc. |
| npm run test:unit | 20/20 ca, 14 suite sau khi chia theo trách nhiệm. |
| npm run test:contracts -w backend | 18/18 ca hợp đồng sau khi cập nhật script. |
| npm run test:e2e | Backend 40/40 và frontend Chromium 4/4. |
| Build frontend/backend trong E2E | Cả hai đạt; Playwright chạy trên bundle frontend đã build. |
| git diff --check | Đạt; Git có thông báo chuyển LF/CRLF theo cấu hình Windows. |

Sandbox chặn tải dependency/DNS và HTTP loopback; các lệnh cần thiết đã được chạy lại với quyền được duyệt. E2E thật vẫn tắt database và dùng cổng thử 4173/4300, không tự dùng Atlas hoặc server phát triển đang chạy. Các ca lỗi frontend sử dụng interception riêng; ca thành công đi qua Nest thật.

**Không chạy lại integration Atlas trong đợt này.** Typecheck đã kiểm các file integration sau khi chuyển đường dẫn. Không tuyên bố kết quả integration trước đó là kết quả xác minh mới.

## Điểm để mở cho các đợt xây dựng nghiệp vụ sau

- Guard/auth/session/ownership, repository CRUD, UI từng feature và offline engine vẫn chưa triển khai; đây là phạm vi được xác nhận giữ nguyên, không phải phần đã hoàn thành qua refactor.
- Chưa có type nghiệp vụ dùng chung trong frontend nên chưa cần chốt một kho type mới; khi phát sinh cần xác định chủ sở hữu.
- Chưa chốt thiết kế token, API button/input/dialog hoặc quy tắc phụ thuộc nghiệp vụ giữa hai feature. Chưa có code phụ thuộc các lựa chọn này nên không tự áp một bộ quy tắc mới.
- Có thể bỏ src/components placeholder nếu nhóm muốn dọn tiếp; hiện không có nội dung gây xung đột cấu trúc.
- E2E frontend hiện dùng Chromium; không có yêu cầu đã xác nhận về coverage, browser khác, auth UI hoặc CI nên chưa tự thêm cấu hình ngoài phạm vi.

Các điểm chưa rõ ảnh hưởng trực tiếp đến triển khai lần này đã được giải quyết qua kiểm kê code hoặc hai xác nhận phía trên. Không còn câu hỏi bắt buộc đang chờ để hoàn tất phạm vi refactor hiện tại.
