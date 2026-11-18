# projects/hooks

useProjects quản lý phân trang, tải danh sách, tạo/đổi tên/xóa project và khóa idempotency khi tạo.

## File triển khai

- [useProjects.ts](useProjects.ts)

`index.ts` export code thực tế. Luồng chung: page → hook → API/adapter; component nhận dữ liệu và callback để hiển thị. Component con có thể dùng custom hook của feature; state thuần giao diện như camera/focus vẫn ở renderer. Không gọi HTTP hoặc ghi dữ liệu trực tiếp trong phần JSX.
