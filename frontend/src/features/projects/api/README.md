# projects/api

projectsApi thực hiện request project/workspace; hook giữ state và xử lý kết quả.

## File triển khai

- [projects-api.ts](projects-api.ts)

`index.ts` export code thực tế. Luồng chung: page → hook → API/adapter; component nhận dữ liệu và callback để hiển thị. Component con có thể dùng custom hook của feature; state thuần giao diện như camera/focus vẫn ở renderer. Không gọi HTTP hoặc ghi dữ liệu trực tiếp trong phần JSX.
