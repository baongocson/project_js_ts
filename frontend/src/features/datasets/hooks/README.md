# datasets/hooks

useImportWizard quản lý đọc CSV, suy/override kiểu, preview toàn file, submit và khóa retry. useDataTable quản lý filter typed và trạng thái form lọc.

## File triển khai

- [useDataTable.ts](useDataTable.ts)
- [useImportWizard.ts](useImportWizard.ts)

`index.ts` export code thực tế. Luồng chung: page → hook → API/adapter; component nhận dữ liệu và callback để hiển thị. Component con có thể dùng custom hook của feature; state thuần giao diện như camera/focus vẫn ở renderer. Không gọi HTTP hoặc ghi dữ liệu trực tiếp trong phần JSX.
