# UI dùng chung

Section.tsx là panel ngữ nghĩa `<section>` được hai vùng của trang hệ thống sử dụng. Truyền nguyên thuộc tính HTML, children và thuộc tính accessibility; style do shared/style quản lý. index.ts export Section.

Chưa có button/input/dialog trong UI hiện tại nên chưa tạo các API component tùy ý. Khi feature cần các primitive đó, triển khai thống nhất ở đây thay vì tạo bản riêng cho từng feature. Không import app/features.

Kiểm kiểu bằng `npm run typecheck -w frontend`; trang hệ thống được kiểm qua E2E.
