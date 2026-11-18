# offline/api

ProjectApi thực hiện HTTP sync có owner binding; localProcessing tạo adapter Preview–Apply local. Các đường dẫn root cũ chỉ re-export để giữ tương thích.

## File triển khai

- [local-processing.ts](local-processing.ts)
- [project-api.ts](project-api.ts)

`index.ts` export code thực tế. Luồng chung: page → hook → API/adapter; component nhận dữ liệu và callback để hiển thị. Component con có thể dùng custom hook của feature; state thuần giao diện như camera/focus vẫn ở renderer. Không gọi HTTP hoặc ghi dữ liệu trực tiếp trong phần JSX.
