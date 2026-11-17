// Đầu mối công khai của feature; chỉ export thành phần đã được triển khai.
export { AnalysisPanel } from './components/AnalysisPanel';
export type { AnalysisSettings } from './components/AnalysisPanel';
export { onlineAnalysis,localAnalysis } from './api/analysis-adapters';
export type { AnalysisAdapter } from './api/analysis-adapters';
