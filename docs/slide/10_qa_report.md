# Nghiệm thu bộ slide

## Đã thực hiện
- Đọc 00, 01, 02, 04, 05 theo thứ tự. File 03 thiếu và đã ghi rõ.
- Khảo sát nguồn code/docs/artifact, kiểm các đường dẫn trích dẫn tồn tại. Không đọc/copy nội dung secret hoặc chạy ứng dụng/tải trên dữ liệu thật.
- 33 slide gồm bìa/kết luận; 16:9 (12192000 × 6858000 EMU), font Arial trong OOXML.
- Render 33 PNG và xem từng slide. Chỉnh nhãn sơ đồ, crop screenshot, quan hệ receipt và sequence request/response sau lần đầu.
- Finalizer: package integrity pass, **0 lỗi layout / 0 cảnh báo**, first-party import pass đúng 33 slide.
- 2 native chart ở slide 30–31: workbook nhúng và cache/reference được kiểm; số đo truy được raw JSON.
- Đọc PPTX cuối bằng ZIP/XML, so 33 tiêu đề + toàn bộ lời nói trong notes với kịch bản. SHA-256 c6486a6746903da8d9923c928e0b549c6100c512d0e07dc10c638c74b58426b3.
- Kiểm không có JWT dạng token hoặc MongoDB Atlas URI trong text/notes. Screenshot là fixture thật, không có mật khẩu/token.
- HTML mở bằng Microsoft Edge headless via Playwright: 33 slide, không lỗi JS, không phần tử kiểm tra vượt canvas, ảnh decode đầy đủ. Home/Right/End và N hoạt động.
- Tổng thời gian phân bổ 900s, kịch bản 855s, có nội dung đầy đủ 33/33 slide.

## Chưa thực hiện
- Chưa mở/kiểm bằng Microsoft PowerPoint hoặc Google Slides, chưa xác minh rendering font bằng ứng dụng native.
- Chưa bấm giờ một người đọc thực tế, chưa thử máy chiếu/phòng học.
- Không chạy lại unit/integration/E2E/k6 trong phiên soạn slide. Kết quả trình bày lấy đúng phạm vi artifact/báo cáo đã có.
- Không deploy, sửa code ứng dụng, đổi dữ liệu hoặc cấu hình môi trường.

## Bao phủ 9 nhóm nghiệm thu
| Nhóm | Slide |
|---|---|
|Bài toán, phạm vi, tác nhân|1–4|
|Chức năng, Use Case, luồng lỗi|4–6,8|
|Phi chức năng, bảo mật, phục hồi|7,22,29–32|
|AI, dữ liệu, flow, lưu/chi phí|15–16,31|
|Kiến trúc, DB, API|9–14|
|Giao diện, FE, BE|17–23|
|Workflow end-to-end và offline|24–26|
|Test/k6/hiệu suất|27,30–31|
|Đóng gói, deploy, kết quả/hạn chế/kết luận|28–29,32–33|
