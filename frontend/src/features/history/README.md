# Feature history

`HistoryPanel` được app ghép vào online workspace. Đọc operations phân trang 10 mục, filter import/process/restore; hiển thị method, thời điểm, result version và summary.

Restore phiên bản cũ có xác nhận, gửi expectedCurrentVersionId và key cố định. Không restore current. Khi response không rõ, giữ target/key để kiểm lại receipt và tránh gửi một action mới. Reply terminal cho phép đóng dialog; lỗi không âm thầm bỏ bản local hoặc overwrite server.

Sau restore thành công, app đọc lại project/workspace/metadata/rows và remount panels theo version. Các controls/loading/empty/error dùng chung shared UI.

Chạy `npm run test:acceptance -w frontend` để kiểm Apply mất response, không tạo history trùng và restore tạo version mới. History local/outbox nằm trong feature offline; chart/analysis và draft recovery còn được xử lý ở gói tương ứng.
