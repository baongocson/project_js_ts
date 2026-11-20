# offline/api

ProjectApi thực hiện HTTP sync có owner binding, khai báo endpoint và đọc dữ liệu response. Local Preview–Apply nằm ở `../services/local-processing.ts`; IndexedDB nằm ở `../repositories/`. Sync service gọi ProjectApi và lưu checkpoint qua repository.

## File triển khai

- [project-api.ts](project-api.ts)

`index.ts` export code thực tế. Luồng chung: page → hook → API/adapter; component nhận dữ liệu và callback để hiển thị. Component con có thể dùng custom hook của feature; state thuần giao diện như camera/focus vẫn ở renderer. Không gọi HTTP hoặc ghi dữ liệu trực tiếp trong phần JSX.
