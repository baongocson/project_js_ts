# analysis/components

`AnalysisPanel.tsx` lắp summary/missing bar, distribution/value-counts, Pearson heatmap và row inspector. `Scatter3D.tsx` lazy-load `WebGLScatter.tsx`: Three.js/Fiber instanced points, OrbitControls, hover/pin/projection/zoom/reset. Renderer chỉ nhận Points3dResult, không import engine/storage/API. `ScatterFallback.tsx` giữ hình chiếu SVG và keyboard selection khi WebGL lỗi hoặc người dùng chọn. State camera không mở rộng DTO; range trục chỉ mô tả tập điểm hiển thị. Service worker cache cả lazy chunk trước offline readiness.

Dùng public index của feature khi import từ app hoặc feature khác. Không đặt token trong local storage/snapshot/outbox. Luồng và lệnh kiểm thử ở [README feature](../README.md); acceptance dùng HTTPS/Nest/MongoDB replica tạm cục bộ.
