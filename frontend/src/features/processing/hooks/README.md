# processing/hooks

useProcessing giữ method/scope/form, Preview–Apply, expiry, stable key và recovery. useAiSuggestions giữ batch/progress/cancel/context của AI.

## File triển khai

- [useAiSuggestions.ts](useAiSuggestions.ts)
- [useProcessing.ts](useProcessing.ts)

`index.ts` export code thực tế. Luồng chung: page → hook → API/adapter; component nhận dữ liệu và callback để hiển thị. Component con có thể dùng custom hook của feature; state thuần giao diện như camera/focus vẫn ở renderer. Không gọi HTTP hoặc ghi dữ liệu trực tiếp trong phần JSX.
