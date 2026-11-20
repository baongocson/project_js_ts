# auth/hooks

Hook giữ state/effect cho phiên, form, hồ sơ và xác nhận đăng xuất/xóa tài khoản. `session.ts` chỉ subscribe và bootstrap React; token, refresh, khóa và session store được quản lý bởi `../services/session-service.ts`. Kiểm quyền và xóa dữ liệu vẫn theo API cùng callback an toàn được app truyền vào.

## File triển khai

- [session.ts](session.ts)
- [useAccountActions.ts](useAccountActions.ts)
- [useAuthForm.ts](useAuthForm.ts)
- [useProfile.ts](useProfile.ts)

`index.ts` export code thực tế. Luồng chung: page → hook → API/adapter; component nhận dữ liệu và callback để hiển thị. Component con có thể dùng custom hook của feature; state thuần giao diện như camera/focus vẫn ở renderer. Không gọi HTTP hoặc ghi dữ liệu trực tiếp trong phần JSX.
