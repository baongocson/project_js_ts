# offline/pages

OfflineWorkspace ghép useOfflineWorkspace với OfflineWorkspaceView. LocalWorkspacePane nhận các page con Analysis/Processing và adapter local.

## File triển khai

- [OfflineWorkspace.tsx](OfflineWorkspace.tsx)

`index.ts` export code thực tế. Luồng chung: page → hook → API/adapter; component nhận dữ liệu và callback để hiển thị. Component con có thể dùng custom hook của feature; state thuần giao diện như camera/focus vẫn ở renderer. Không gọi HTTP hoặc ghi dữ liệu trực tiếp trong phần JSX.
