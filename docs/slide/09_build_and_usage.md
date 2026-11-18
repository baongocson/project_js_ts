# Cách dùng và tái tạo

- Mở output/Dashboard_3D_Presentation.pptx để chỉnh sửa; sơ đồ là native shapes/connectors, 2 chart có workbook nhúng, notes có nguồn và lời nói.
- Mở output/Dashboard_3D.html trực tiếp không cần server. Dùng ←/→, Home/End, F toàn màn hình, N ghi chú, P in toàn bộ.
- Đọc 11 để tập nói, 12 để ôn nhanh, 13 để chuẩn bị hỏi đáp, 14 để canh giờ.
- 00–02/04–05 là prompt đầu vào, không bị sửa. Không có prompt 03.
- Source tái tạo nằm tại .build/content.mjs, diagrams.mjs, author.mjs. Dùng Node/Python từ bundled runtime đã cấu hình, không cài thêm thư viện. Author giữ finalizer không ghi đè output/receipt, nên lần tái tạo cần tên output/receipt mới.
- Workspace Windows này không cho tạo hard link/junction. Wrapper private .build/materialize.py thay publication bằng exclusive copy, giữ toàn bộ kiểm workbook/OOXML. Finalizer vẫn kiểm hash, layout, font và import. Không sửa file skill/runtime.
