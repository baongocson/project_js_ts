# auth/pages

AuthPage và ProfilePage là các màn hình được app router sử dụng.

## File triển khai

- [AuthPage.tsx](AuthPage.tsx)
- [ProfilePage.tsx](ProfilePage.tsx)

`index.ts` export code thực tế. Luồng chung: page → hook → API/adapter; component nhận dữ liệu và callback để hiển thị. Component con có thể dùng custom hook của feature; state thuần giao diện như camera/focus vẫn ở renderer. Không gọi HTTP hoặc ghi dữ liệu trực tiếp trong phần JSX.
