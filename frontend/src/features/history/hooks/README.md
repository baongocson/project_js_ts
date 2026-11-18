# history/hooks

useHistory tải/lọc/phân trang lịch sử, quản lý dialog Restore, stable key và trạng thái chưa rõ kết quả.

## File triển khai

- [useHistory.ts](useHistory.ts)

`index.ts` export code thực tế. Luồng chung: page → hook → API/adapter; component nhận dữ liệu và callback để hiển thị. Component con có thể dùng custom hook của feature; state thuần giao diện như camera/focus vẫn ở renderer. Không gọi HTTP hoặc ghi dữ liệu trực tiếp trong phần JSX.
