# history/pages

HistoryPage ghép useHistory với HistoryPanel và nhận dataset/currentVersion/onRestored từ workspace.

## File triển khai

- [HistoryPage.tsx](HistoryPage.tsx)

`index.ts` export code thực tế. Luồng chung: page → hook → API/adapter; component nhận dữ liệu và callback để hiển thị. Component con có thể dùng custom hook của feature; state thuần giao diện như camera/focus vẫn ở renderer. Không gọi HTTP hoặc ghi dữ liệu trực tiếp trong phần JSX.
