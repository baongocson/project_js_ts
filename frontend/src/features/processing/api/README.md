# processing/api

processingApi gửi Preview/Get/Apply. onlineProcessing tạo adapter online gồm suggestions và value-counts; không đặt adapter HTTP trong component.

## File triển khai

- [online-processing.ts](online-processing.ts)
- [processing-api.ts](processing-api.ts)

`index.ts` export code thực tế. Luồng chung: page → hook → API/adapter; component nhận dữ liệu và callback để hiển thị. Component con có thể dùng custom hook của feature; state thuần giao diện như camera/focus vẫn ở renderer. Không gọi HTTP hoặc ghi dữ liệu trực tiếp trong phần JSX.
