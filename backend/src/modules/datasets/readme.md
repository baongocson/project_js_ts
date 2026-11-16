# DatasetsModule

BE-2 triển khai 4 API import/metadata/rows/row lookup, dùng global auth/ownership BE-1. Không gắn DatasetsGuard scaffold.

Xem [báo cáo hiện tại](../../../../docs/teamwork/nguyen-be2.md).

`datasets.service` điều phối CSV nguồn, receipt và publish V1; `datasets.repository` ghi datasets/versions/columns/chunks, kiểm checksum và chỉ đọc published snapshots. `csv-upload.interceptor` giới hạn nguồn và map lỗi413. `dataset-mappers` chỉ trả allowlist public; không lộ storageKey/rawToken. Parser/inference/codec/query chạy từ package `@dashboard/data-core`.

`SnapshotPublisherService` export cho BE-3: prepare staged candidate ngoài publish transaction; publish nhận expected current/revision, history/receipt và hook transaction cho CAS preview. Không thực thi engine hoặc nghiệp vụ preview/restore thay BE-3. `ImportRecoveryService` dọn import thất bại/hết lease và orphan source sau khi kiểm durable references; startup và mỗi60giây. Mỗi batch ghi/publish có lease/user/project/session fence.

Chạy `npm run test:be2:local -w backend` hoặc `npm run test:integration:local -w backend` để kiểm MongoDB replica set riêng; xem contracts codec/sync tại packages/data-core/README.md.
