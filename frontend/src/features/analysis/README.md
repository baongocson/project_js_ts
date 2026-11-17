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
