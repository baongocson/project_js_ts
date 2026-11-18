# datasets/api

datasetsApi gửi multipart import, đọc metadata/rows/row theo ID; giữ hợp đồng hiện hành.

## File triển khai

- [datasets-api.ts](datasets-api.ts)

`index.ts` export code thực tế. Luồng chung: page → hook → API/adapter; component nhận dữ liệu và callback để hiển thị. Component con có thể dùng custom hook của feature; state thuần giao diện như camera/focus vẫn ở renderer. Không gọi HTTP hoặc ghi dữ liệu trực tiếp trong phần JSX.
