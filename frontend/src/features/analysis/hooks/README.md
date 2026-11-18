# analysis/hooks

useAnalysis điều phối tab/config/khóa sửa ô; useResource quản lý request/hủy/retry. Các hook summary, distribution, correlation, points, boxplot và sửa ô giữ logic riêng.

## File triển khai

- [useAnalysis.ts](useAnalysis.ts)
- [useAnalysisResource.ts](useAnalysisResource.ts)
- [useBoxplot.ts](useBoxplot.ts)
- [useCorrelation.ts](useCorrelation.ts)
- [useDistribution.ts](useDistribution.ts)
- [usePointRowEditor.ts](usePointRowEditor.ts)
- [usePoints.ts](usePoints.ts)
- [useSummary.ts](useSummary.ts)

`index.ts` export code thực tế. Luồng chung: page → hook → API/adapter; component nhận dữ liệu và callback để hiển thị. Component con có thể dùng custom hook của feature; state thuần giao diện như camera/focus vẫn ở renderer. Không gọi HTTP hoặc ghi dữ liệu trực tiếp trong phần JSX.
