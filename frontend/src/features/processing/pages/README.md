# processing/pages

ProcessingPage ghép useProcessing với ProcessingPanel, được nhúng theo tab xử lý trong workspace online/local. Không tạo URL mới.

## File triển khai

- [ProcessingPage.tsx](ProcessingPage.tsx)

`index.ts` export code thực tế. Luồng chung: page → hook → API/adapter; component nhận dữ liệu và callback để hiển thị. Component con có thể dùng custom hook của feature; state thuần giao diện như camera/focus vẫn ở renderer. Không gọi HTTP hoặc ghi dữ liệu trực tiếp trong phần JSX.
