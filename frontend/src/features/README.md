# Các feature

Giữ cách chia theo nghiệp vụ: auth, projects, datasets, analysis, processing, history và offline. Mỗi feature có api/components/hooks/pages, types.ts và index.ts. Xem README từng feature để biết phạm vi và trạng thái.

Checkout hiện chỉ có trang kiểm tra hệ thống trong app; các feature chưa có code nghiệp vụ. Không tạo màn hình, kiểu dữ liệu hoặc response giả để lấp cấu trúc. Export của feature được thêm tại index khi có code hoàn chỉnh; bên ngoài dùng đầu mối này thay vì import sâu.

Chiều phụ thuộc: app → features → shared, app → shared. Không import app từ feature. Quy tắc giữa các feature chưa được chốt; nếu phát sinh phụ thuộc nghiệp vụ mới, cần xác định chủ sở hữu thay vì tự nhân bản.

Kiểm tra: `npm run check:architecture -w frontend`, `npm run typecheck -w frontend`; các lệnh chạy từ gốc repo.
