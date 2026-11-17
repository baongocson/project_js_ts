# UI dùng chung

WorkspaceLayout nhận slots analysis/processing/table/history, activeTab/onTab và navigationLocked. Không import feature hoặc core. workspaceTabs/ProcessingGroup định nghĩa thứ tự điều hướng; app/local owner chịu trách nhiệm lưu activeTab. Desktop chia biểu đồ/form hai cột, mobile xếp dọc. Mutation đang chạy hoặc Apply chưa rõ kết quả khóa chuyển bước.

Section.tsx là panel ngữ nghĩa `<section>` được hai vùng của trang hệ thống sử dụng. Truyền nguyên thuộc tính HTML, children và thuộc tính accessibility; style do shared/style quản lý. index.ts export Section.

Chưa có button/input/dialog trong UI hiện tại nên chưa tạo các API component tùy ý. Khi feature cần các primitive đó, triển khai thống nhất ở đây thay vì tạo bản riêng cho từng feature. Không import app/features.

Kiểm kiểu bằng `npm run typecheck -w frontend`; trang hệ thống được kiểm qua E2E.
