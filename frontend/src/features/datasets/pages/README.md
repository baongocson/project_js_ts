# datasets/pages

DatasetImportPage ghép useImportWizard với ImportWizard, được nhúng trong workspace online/offline. Không cần route riêng cho màn hình nhập nhúng.

## File triển khai

- [DatasetImportPage.tsx](DatasetImportPage.tsx)

`index.ts` export code thực tế. Luồng chung: page → hook → API/adapter; component nhận dữ liệu và callback để hiển thị. Component con có thể dùng custom hook của feature; state thuần giao diện như camera/focus vẫn ở renderer. Không gọi HTTP hoặc ghi dữ liệu trực tiếp trong phần JSX.
