# analysis/api

onlineAnalysis trong analysis-api.ts triển khai endpoint HTTP. localAnalysis trong `../services/analysis-service.ts` phân tích toàn snapshot bằng shared core. Hai nguồn cùng thực hiện hợp đồng `../analysis-contract.ts`, độc lập trang bảng.

## File triển khai

- [analysis-api.ts](analysis-api.ts)

`index.ts` export code thực tế. Luồng chung: page → hook → API/adapter; component nhận dữ liệu và callback để hiển thị. Component con có thể dùng custom hook của feature; state thuần giao diện như camera/focus vẫn ở renderer. Không gọi HTTP hoặc ghi dữ liệu trực tiếp trong phần JSX.
