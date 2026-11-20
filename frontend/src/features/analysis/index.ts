// Đầu mối công khai của feature; chỉ export thành phần đã được triển khai.
export {AnalysisPage,AnalysisPage as AnalysisPanel} from './pages/AnalysisPage';
export type {AnalysisSettings} from './hooks/useAnalysisResource';
export { onlineAnalysis,localAnalysis } from './services/analysis-service';
export type { AnalysisAdapter } from './services/analysis-service';
