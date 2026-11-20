# processing/api

processingApi gửi Preview/Get/Apply, AI suggestions và từng trang value-counts. `../services/online-processing.ts` tạo adapter online, kiểm version và gom các trang category với giới hạn nghiệp vụ. `../services/processing-session.ts` giữ khóa retry của một quy trình Preview/Apply.

## File triển khai

- [processing-api.ts](processing-api.ts)

`index.ts` export code thực tế. Luồng chung: page → hook → API/adapter; component nhận dữ liệu và callback để hiển thị. Component con có thể dùng custom hook của feature; state thuần giao diện như camera/focus vẫn ở renderer. Không gọi HTTP hoặc ghi dữ liệu trực tiếp trong phần JSX.
