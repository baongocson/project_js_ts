# offline/hooks

Các hook quản lý danh sách/project local, workspace autosave, sync state, backup/recovery và auto-sync lifecycle. IndexedDB/domain service giữ logic lưu trữ và replay.

## File triển khai

- [useBackupImporter.ts](useBackupImporter.ts)
- [useLocalWorkspace.ts](useLocalWorkspace.ts)
- [useOfflineWorkspace.ts](useOfflineWorkspace.ts)
- [useProjectRecovery.ts](useProjectRecovery.ts)
- [useSyncCenter.ts](useSyncCenter.ts)
- [useSyncCoordinator.ts](useSyncCoordinator.ts)

`index.ts` export code thực tế. Luồng chung: page → hook → API/adapter; component nhận dữ liệu và callback để hiển thị. Component con có thể dùng custom hook của feature; state thuần giao diện như camera/focus vẫn ở renderer. Không gọi HTTP hoặc ghi dữ liệu trực tiếp trong phần JSX.
