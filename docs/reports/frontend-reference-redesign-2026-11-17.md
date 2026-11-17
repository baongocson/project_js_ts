# Giao diện theo frontend_mau — 17/11/2026

> Cập nhật tiếp theo: [EDA, sửa ô3D và TF-IDF ngày17/11](frontend-eda-tfidf-2026-11-17.md). Các giới hạn/mốc27method bên dưới phản ánh thời điểm trước bổ sung này.

Nhánh làm việc dev-frontend. Tận dụng working tree hiện có, không reset hoặc ghi đè thay đổi backend/core trước lượt này; chưa commit/push. frontend_mau chỉ được đọc làm chuẩn bố cục và tương tác, không import runtime/source từ đó.

## Phạm vi thực hiện

- Shell xanh lá, nền sáng, card và thanh trạng thái theo mẫu; giữ theme dark/system, navigation/auth hiện tại.
- WorkspaceLayout trong shared/ui chỉ nhận slots: Collection, Cleaning, Missing, Outliers, Scaling, Transformation, Encoding, History. App/local owner lắp ghép feature qua public exports. ActiveTab lưu đúng workspace DTO hiện có, không tạo field server mới.
- Collection: import và overview ở cạnh nhau khi project rỗng; khi có dữ liệu, summary/missing-by-column, histogram/value-counts, Pearson và3D theo tabs phân tích. Bảng vẫn typed/filter/sort/page theo adapter hiện tại.
- Processing: khung biểu đồ cạnh form, bảng phía dưới. Form chỉ có method của nhóm hiện tại, đủ27method đúng một lần; không mang rename/drop-column/sqrt/batch hoặc xóa outlier từ mẫu. Mặc định mở3D cho nhóm xử lý, Missing/Outliers chọn màu theo ngữ cảnh. Bộ lọc bảng không đổi scope/thống kê.
- Preview/Apply giữ transport/idempotency/base/version semantics hiện có. Preview hiển thị toàn chiều rộng dưới bảng qua presentation slot/context trong shared, logic vẫn thuộc processing. Hủy preview chưa Apply giữ published version và lần preview mới tạo key mới; không cho hủy khi chưa rõ kết quả Apply. Đổi nhóm bỏ preview chưa Apply; đang request hoặc chưa rõ kết quả Apply khóa chuyển tab cho đến khi kiểm tra kết quả. Không dùng nút Undo kiểu cũ, History dùng restore tạo version.
- History có tab riêng, online giữ phân trang/restore; local hiện chuỗi thao tác và bộ chọn restore hiện có.
- Missing bar đọc missingByColumn/rate từ summary. Pearson heatmap có legend, chọn cặp bằng chuột/bàn phím, giữ mọi feature, N/A/reason/pair counts.
- Scatter3D lazy-load WebGLScatter với Three.js/React Three Fiber: instanced points, OrbitControls, zoom/reset, hover/pin, projection lên mặt phẳng, nhãn/range trục, chọn rowId. Không tính phân tích hoặc fetch/storage trong renderer. Chỉ normalize vị trí để vẽ, giữ typed raw values và hidden/sampling counts từ adapter. Range ghi rõ là tập điểm hiển thị, không gọi min/max toàn dataset khi sampled.
- ScatterFallback giữ SVG projection và roving keyboard selection; người dùng có thể chuyển rõ ràng, ErrorBoundary xử lý lỗi WebGL. Danh sách điểm/row inspector vẫn dùng adapter theo ID, độc lập filter/page.
- Cache manifest build chứa mọi static chunk (kể cả WebGL lazy) để mở3D lần đầu khi offline. Cache namespace có hash theo build để không ghi đè shell đang hoạt động. Loại trùng assets trước cache.addAll, không cache API/Bearer, không skipWaiting trong lúc phiên cũ còn mở. Service worker không thay IndexedDB hoặc outbox/schema.

## Giữ nguyên contract

Không đổi API/DTO/ERD, data-core algorithms, CSV16.000.000byte, first-row header, missing tokens, scope whole-columns, một method/preview,27method, auth, original source, mapping/outbox/retry/conflict. Các test thao tác đã được cập nhật để người dùng đi qua tab thực thay vì tìm form/history cùng lúc trên trang dài.

Không mang engine/storage/auth/sync client hay cấu trúc thư mục cũ. Không suy số liệu từ trang bảng hoặc sample points rồi gắn nhãn toàn dataset.

## Các khác biệt có chủ đích so với mẫu

- Chưa vẽ boxplot vì contract distribution hiện không trả Q1/median/Q3/whiskers; histogram không đủ để suy ra chính xác. Không thêm API hoặc tự tải toàn bộ online dataset để thay thuật toán server.
- Preview vẫn hiển thị diff/schema/diagnostics chính xác; chưa dựng3D Before/After của candidate vì không có contract đọc points candidate.
- Camera/pin/projection là state hiển thị của component, không ghi field ngoài workspace DTO. Trục/màu/ngưỡng và activeTab lưu theo contract hiện tại.
- Chỉ cột number làm trục; không tự tạo trục row index/text length như mẫu. Correlation giữ cả feature nonnumeric với N/A.
- Giữ service/account/project recovery và opt-in sync hiện có, không thay bằng sync chunk của mẫu.

## Kiểm chứng

Frontend lint/typecheck/architecture và unit kiểm đủ27method một lần. Acceptance dùng HTTPS + MongoDB replica tạm riêng, không dùng Atlas cá nhân. reference-workspace.spec.ts kiểm bố cục/tab, WebGL lần đầu offline, pin/projection/drag/reset, preview trước Apply, group methods, persistence tab, mobile overflow và pagination. Các suite hiện có kiểm27method online/local, Apply response loss, sync parity, storage migration/quota, auth/owner, history và restore. Kết quả cuối được ghi sau khi hoàn tất kiểm tra; không xem test fixture là dữ liệu sản phẩm hoặc mock thành công backend.

### Kết quả cuối

- Frontend lint, typecheck/architecture105file, build backend/core/frontend và diff whitespace check: đạt.
- Frontend unit25/25; offline replay10/10; smoke browser health/router4/4: đạt.
- Vòng acceptance bản cuối:50/51pass; ca còn lại reload ngay khi autosave tab còn đang ghi IndexedDB. Bài test được sửa để chờ nhãn xác nhận lưu trước reload, đúng quy trình autosave; chạy lại cả2ca reference-workspace:2/2pass. Như vậy51ca hiện tại đã có bằng chứng pass, không ghi thành một lượt full51/51. Trước thay đổi preview slot cuối có một lượt full50/50.
- Sau khi đưa tổng quan Collection lên trước phần cấu hình, đã chạy lại analysis-workspace + reference-workspace:5/5pass, cùng lint/typecheck/architecture đạt; đây là source build cuối. Ảnh xem trước nằm ở frontend/.artifact-work/reference-redesign (Git ignore).
- 27method qua typed forms online,27method offline→server parity, response-loss/receipt/conflict, migration/quota, owner/session, draft recovery và mobile4000điểm/5000dòng đã được kiểm. WebGL render/ảnh được xem trực tiếp, gồm Collection, Cleaning desktop, mobile và preview toàn chiều rộng.
- Acceptance dùng database replica tạm và dọn sau lượt; không thay environment/credentials hoặc dữ liệu Atlas cá nhân. Chưa commit/push.

WebGL được tách chunk thực thi riêng (~256KiB gzip trong bản build này) và precache nền để hỗ trợ offline; Vite vẫn có cảnh báo chunk minified lớn hơn500KiB, không phải lỗi build. Đây không phải nghiệm thu tải lớn hay mọi GPU/trình duyệt. Các khác biệt boxplot/candidate3D/camera server persistence phía trên vẫn được giữ đúng giới hạn API.
