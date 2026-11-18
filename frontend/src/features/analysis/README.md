# Feature analysis

`AnalysisPanel` được app lắp vào workspace online và local. `AnalysisAdapter` tách nguồn dữ liệu; `onlineAnalysis` đọc đủ 5 endpoint analysis cùng getRow; `localAnalysis` chạy trên **toàn snapshot**, không dùng trang/filter của bảng.

Logic thuần được tách nguyên từ backend sang `packages/data-core/src/analysis.ts` và types chung. Backend giữ wrapper import cũ, không còn hai bộ thuật toán độc lập. Engine processing không đổi phiên bản bởi extraction không đổi semantics.

- Summary có missing rates/counts, duplicate rows, datatypes/outlier bounds/reasons.
- Distribution histogram và bảng số liệu; value-counts phân trang/sort/include-missing với denominator toàn dataset.
- Pearson giữ mọi feature, số cặp và N/A reason; ma trận lớn có điều hướng từng vùng 20×20 để không render một triệu ô DOM.
- SVG 3D chiếu trực giao, chọn trục number/màu/outlier/threshold; stable sampling và hidden missing/invalid counts từ API/core. Xoay/zoom bằng kéo, controls hoặc bàn phím. Trục co giãn cho hiển thị, giá trị gốc không đổi.
- Điểm đọc rowId độc lập filter/page; inspector hiển thị typed cell, callback nối selection của workspace. Điểm chồng lấn có thể chọn bằng bàn phím hoặc danh sách.
- Fetch có AbortSignal/generation; loading/error/retry/empty/N/A được hiển thị. Panels remount theo version sau Apply/restore; config online lưu qua workspace CAS.

Kiểm tra: frontend unit (full snapshot, sampling, pairs/N/A, serialization, abort); backend calculation/projection regression; `npm run test:acceptance -w frontend` có online 120-row dataset, offline cache/reload, filter độc lập, constant/missing/header-only/error retry, sampling/click row và ảnh desktop/mobile. Đây là nghiệm thu Chromium cục bộ; migration/quota/local workspace persistence và nghiệm thu mọi quy mô/biên được theo dõi riêng trong checklist.

QA 17/11 thêm workload local 5.000 dòng, lấy mẫu 4.000 điểm, ảnh mobile 390px/desktop 1440px. Trục vẽ trên điểm và có legend; chỉ một điểm nhận Tab, phím mũi tên/Home/End chuyển focus, Enter/Space chọn row; danh sách là lựa chọn thay thế. Đây là workload đã kiểm, không phải SLA cho mọi dataset.


## EDA và sửa ô từ điểm 3D — 17/11/2026

Collection hiển thị boxplot chọn cột number cùng histogram và frequency chart có phân trang. BoxplotPanel dùng boxplot toàn cột từ API/core, không dựng quartile từ sample3D. PointRowTable mở khi chọn điểm (WebGL/fallback/danh sách hoặc vùng không đủ tọa độ), cho chọn kind/value và lưu từng ô. Nội bộ preview→apply có khóa cố định và retry receipt; giữ draft/khóa đổi dòng hoặc tab khi chưa lưu. Cột typed vẫn kiểm schema; mixed cho phép đổi kind. Mỗi ô lưu thành version/history riêng.

scatter-model chuẩn hóa points và tick bằng cùng full-version bounds; điểm/số chia trục cùng hệ tọa độ, cột hằng ở giữa. Missing xét toàn dòng; outlier mọi cột number, độc lập trục. Dòng thiếu/sai tọa độ ở vùng riêng có thể chọn sửa; không biểu diễn như tọa độ0. Tối đa10000điểm hợp lệ và10000dấu vùng riêng; khi lấy mẫu ưu tiên flags và hiện số chưa vẽ. Outlier boxplot tối đa100dấu nhưng tổng luôn đầy đủ. [Hợp đồng](../../../../docs/api/API.md#bổ-sung-hợp-đồng-ngày-17112026).

## 1. Giới thiệu lớp trình bày Neon
Module analysis giữ nguyên nghiệp vụ; shared/style/analytics.css nâng giao diện chung.
## 2. Chức năng chính
Phân cấp KPI thật, toolbar, bảng, trạng thái missing, selection, preview và history; không thay công thức, payload hoặc callback.
## 3. Cấu trúc thư mục
components chứa UI hiện hữu; api chứa adapter; README này mô tả module. Skin nằm trong shared/style/analytics.css và tokens.css.
## 4. Luồng hoạt động
Dữ liệu từ adapter/state hiện có đi vào component rồi được render bằng class cũ. CSS không gọi API, tính KPI hay lưu dữ liệu.
## 5. Component và hàm quan trọng
AnalysisPanel hiển thị thống kê toàn phiên bản; DataTableView/TypedTable điều khiển trang/filter; PointRowTable sửa ô; processing preview/apply và history giữ nguyên feature owner.
## 6. Props, state và dữ liệu
Không thêm props/state nghiệp vụ. rowId, version, selection, filters, scope và callbacks giữ nguyên. Số điểm mẫu không được trình bày như tổng dataset.
## 7. Hướng dẫn sử dụng
Import CSV, xem bảng hoặc chuyển tám bước workspace. Filter chỉ lọc hiển thị. Preview để xem trước; Apply mới tạo phiên bản. Ô missing có nhãn chữ và viền nét đứt.
## 8. Hướng dẫn kiểm thử
Chạy frontend unit và browser design-system theo shared/style README. Browser regression local kiểm import/filter độc lập KPI, preview chưa publish, Apply, history và reload IndexedDB. Acceptance server yêu cầu môi trường riêng, chưa được suy ra từ test local.
## 9. Phụ thuộc
React, data-core hiện hữu, shared/ui và các adapter đã có. Không thêm dependency hoặc sửa core.
## 10. Giới hạn và lưu ý
Skin không chứng minh toàn bộ methods hoặc server API. Bảng cuộn trong vùng có focus, header sticky; trên mobile phải kiểm tràn với cột dài. Không thay thuật toán outlier/missing/normalization.

## Visualization Neon — triển khai frontend

`scatter-colors.ts` là bộ ánh xạ màu thuần dùng chung WebGL, SVG và ScatterLegend. Normal/missing/outlier vẫn dùng contract cũ. `Màu hiển thị` thêm gradient X/Y/Z chỉ ở state của Scatter3D, không thêm giá trị persisted colorMode. Đổi tab/remount có thể đặt lại thiết lập này. Miền màu lấy axes toàn phiên bản; thiếu axes dùng bounds của points và không nên coi là thống kê toàn dataset. Cột hằng dùng màu giữa, cực trị hữu hạn chuẩn hóa trước phép trừ tránh overflow. Selection ưu tiên màu riêng và kích thước/viền; tooltip vẫn có rowId, tọa độ và nhãn missing/outlier.

WebGL giữ lazy import, SceneBoundary, InstancedMesh, demand frames và DPR1–1.5. MeshBasicMaterial không bị ánh sáng đổi màu, giúp palette khớp SVG; không dùng postprocessing. Hai grid tĩnh và trục cyan/purple/blue tạo chiều sâu. Tick texture được dispose khi đổi/unmount. ContextLifecycle dọn listener, đánh dấu lost, chờ restored rồi invalidate; người dùng luôn có nút chuyển SVG. Không ép reload trang hoặc dữ liệu.

SVG dùng cùng màu/axes và grid chiếu xuống mặt phẳng; giữ xoay/zoom/keyboard roving focus (một điểm nhận Tab), Enter/Space chọn row, danh sách điểm trong AnalysisPanel và inspector. Normalization/bounds/sampling/rowId không đổi. Numeric legend hiển thị khoảng và gradient thật; khi numeric hoạt động thì flags không quyết định màu, nhưng nhãn trạng thái vẫn có trong tooltip/title/danh sách.

**Giới hạn:** Response points không có category từng dòng nên chưa triển khai category coloring. Không gọi API bổ sung hàng loạt. Glow điểm không dùng bloom; selection dùng kích thước và màu/viền. Browser headless kiểm được render và context lifecycle trên renderer thử nghiệm, không thay thế đo GPU thật.

**Kiểm thử:** `node frontend/scripts/run-unit.mjs` có numeric endpoints, full bounds, constant/extreme/empty, semantic flags/selection. Browser design-system kiểm cùng palette, keyboard SVG, theme, camera, context loss/restored. Fixture visualization ghi rõ dữ liệu kiểm thử, không được đưa thành dashboard thật. Đọc test/design-system README để chạy không có prehook ngoài frontend.
