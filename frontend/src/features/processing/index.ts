// Đầu mối công khai của feature; chỉ export thành phần đã được triển khai.
export { ProcessingPanel,onlineProcessing } from './components/ProcessingPanel';
export type { ProcessingAdapter } from './components/ProcessingPanel';
export { makeSpecification,presets,labels } from './methods';
export type { Preview,PreviewPage,PreviewChange } from './types';
export { PreviewRejected } from './types';
