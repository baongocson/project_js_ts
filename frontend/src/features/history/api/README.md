# history/api

historyApi.list và historyApi.restore gọi API lịch sử/khôi phục; response types nằm ở types.ts.

## File triển khai

- [history-api.ts](history-api.ts)

`index.ts` export code thực tế. Luồng chung: page → hook → API/adapter; component nhận dữ liệu và callback để hiển thị. Component con có thể dùng custom hook của feature; state thuần giao diện như camera/focus vẫn ở renderer. Không gọi HTTP hoặc ghi dữ liệu trực tiếp trong phần JSX.
