# Các feature

Giữ cách chia theo nghiệp vụ: auth, projects, datasets, analysis, processing, history và offline. Mỗi feature có api/components/hooks/pages, types.ts và index.ts. Xem README từng feature để biết phạm vi và trạng thái.

Checkout hiện chỉ có trang kiểm tra hệ thống trong app; các feature chưa có code nghiệp vụ. Không tạo màn hình, kiểu dữ liệu hoặc response giả để lấp cấu trúc. Export của feature được thêm tại index khi có code hoàn chỉnh; bên ngoài dùng đầu mối này thay vì import sâu.

Chiều phụ thuộc: app → features → shared, app → shared. Không import app từ feature. Quy tắc giữa các feature chưa được chốt; nếu phát sinh phụ thuộc nghiệp vụ mới, cần xác định chủ sở hữu thay vì tự nhân bản.

Kiểm tra: `npm run check:architecture -w frontend`, `npm run typecheck -w frontend`; các lệnh chạy từ gốc repo.

## Cấu trúc triển khai ngày 18/11/2026

Cả bảy feature auth/projects/datasets/analysis/processing/history/offline đều có code thật trong api, hooks, components, pages. Pages ghép hook với giao diện; hooks giữ state/effect/nghiệp vụ; api giữ transport/adapter; components giữ trình bày và tương tác. Các hàm miền thuần, types và storage/replay service vẫn có thể ở root feature. Workspace ghép nhiều feature nằm ở app để tránh vòng phụ thuộc.

Xem [báo cáo refactor](../../../docs/reports/frontend-feature-structure-2026-11-18.md).
