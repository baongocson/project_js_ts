// Đầu mối công khai của feature; chỉ export thành phần đã được triển khai.
export {AnalysisPage,AnalysisPage as AnalysisPanel} from './pages/AnalysisPage';
export type {AnalysisSettings} from './hooks/useAnalysisResource';
export { onlineAnalysis,localAnalysis } from './api/analysis-adapters';
export type { AnalysisAdapter } from './api/analysis-adapters';
