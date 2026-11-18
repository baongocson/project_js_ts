# auth/hooks

Quản lý phiên, xác thực form, hồ sơ và xác nhận đăng xuất/xóa tài khoản. Kiểm quyền và xóa dữ liệu vẫn theo API cùng callback an toàn được app truyền vào.

## File triển khai

- [session.ts](session.ts)
- [useAccountActions.ts](useAccountActions.ts)
- [useAuthForm.ts](useAuthForm.ts)
- [useProfile.ts](useProfile.ts)

`index.ts` export code thực tế. Luồng chung: page → hook → API/adapter; component nhận dữ liệu và callback để hiển thị. Component con có thể dùng custom hook của feature; state thuần giao diện như camera/focus vẫn ở renderer. Không gọi HTTP hoặc ghi dữ liệu trực tiếp trong phần JSX.
