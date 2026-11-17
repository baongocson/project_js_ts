# MongoDB Atlas — schema và index

Backend dùng database `dashboard_3d`, gồm đúng 12 collection theo `ERD.html`. Định nghĩa dùng chung tại `backend/src/infrastructure/database/collection-contracts.ts` sinh Mongoose schema và BSON validator phía MongoDB. Collection name giữ camelCase, không để Mongoose tự pluralize. Row/cell vẫn nằm trong binary chunks; chưa triển khai codec hay blob storage.

## Cấu hình

Thứ tự ưu tiên: biến môi trường tiến trình → `backend/.env` → `atlas-credentials.env` tại gốc dự án. File `.env` ở gốc không tự nạp. Các đường dẫn được giải quyết theo vị trí backend, không phụ thuộc thư mục chạy lệnh. Không commit URI, username/password; các file cấu hình thật đã được gitignore. Production truyền biến môi trường qua secret manager.

```dotenv
DATABASE_ENABLED=true
MONGODB_URI=mongodb+srv://USER:URL_ENCODED_PASSWORD@CLUSTER/?retryWrites=true&w=majority
MONGODB_DB_NAME=dashboard_3d
```

Máy hiện tại có DNS hệ thống từ chối truy vấn Atlas SRV. `backend/.env` đã đặt `MONGODB_DNS_SERVERS=1.1.1.1,8.8.8.8`. Tùy chọn này chỉ đổi resolver của tiến trình Node; không đổi DNS Windows. Có thể bỏ khi DNS hệ thống hoạt động hoặc thay bằng resolver nội bộ. TLS certificate verification giữ mặc định; không bỏ TLS. Atlas cần network access và database user có quyền tạo collection/index, `collMod` và read/write trên database đích để provision. Tài khoản runtime chỉ cần quyền phù hợp; không có tính năng tự mở IP allowlist.

## Vận hành

Chạy tại thư mục gốc:

```powershell
npm run db:provision -w backend
npm run db:verify -w backend
npm run test:database -w backend
npm run start:dev -w backend
```

`db:provision` ping, kiểm tra replica set/mongos, tạo collection hoặc cập nhật validator bằng `collMod`, sau đó tạo các index đã khai báo và xác minh lại. Có thể chạy lại. Không dùng `syncIndexes`, không drop index, không xóa/sửa bản ghi nghiệp vụ. Provision nhiều collection không phải một migration transaction; nếu lỗi cần sửa nguyên nhân rồi chạy lại. Unique index build sẽ thất bại nếu đã có dữ liệu trùng. Việc đổi validator không rà ngược và sửa dữ liệu đã tồn tại; cần audit/migrate riêng trước khi siết validator trên database đang có dữ liệu.

`autoIndex=false`, `autoCreate=false`. Backend kiểm tra validators/index khi khởi động và từ chối chạy nếu thiếu hoặc lệch; startup không tự provision. Khi `DATABASE_ENABLED=false`, backend và HTTP contract tests vẫn chạy độc lập Atlas. Health ping database thực tế: 200 `database=connected`, hoặc 503 `DATABASE_UNAVAILABLE` nếu không kết nối được; disabled trả `database=disabled`.

## Index theo ERD

| Collection | Unique | Index khác |
| --- | --- | --- |
| users | emailNormalized | — |
| authSessions | refreshTokenHash | userId/revokedAt; TTL expiresAt, expireAfterSeconds=0 |
| projects | Không unique tên | ownerId/updatedAt DESC/_id DESC |
| workspaces | projectId | — |
| datasets | projectId | currentVersionId |
| datasetVersions | datasetId/versionNumber chỉ khi state=published | datasetId/publishedAt DESC/_id DESC; state/createdAt |
| versionColumns | versionId/columnId; versionId/position | — |
| dataChunks | versionId/chunkIndex | — |
| processingPreviews | candidateVersionId chỉ khi BSON ObjectId | datasetId/createdAt DESC; status/expiresAt |
| previewChanges | previewId/rowId; previewId/ordinal | — |
| processingOperations | resultVersionId; datasetId/kind/idempotencyDigest | datasetId/createdAt DESC/_id DESC |
| idempotencyRecords | userId/actionScope/keyDigest | projectId; status/leaseUntil |

Tổng cộng 14 unique index và 11 index không unique (chưa tính `_id`). Preview và receipt không có TTL tự xóa. Cleanup preview/candidate cần điều phối ở service, tránh xóa dữ liệu đã publish. Session hết hạn vẫn cần kiểm tra ở service vì TTL không xóa ngay lập tức.

## Cấu trúc và giới hạn

MongoDB validator strict/error kiểm tra required field, BSON ObjectId/Date/Binary, enum, UUIDv4 lowercase, số nguyên an toàn không âm, null theo field và các object lồng nhau. Object nhỏ có schema cụ thể; không nhận field tùy ý ngoài parameters theo method và response body của receipt. Các phần đó còn phải qua DTO/service trước khi ghi. Validator không thay thế method-specific validation.

Giữ trần file gốc 16.000.000 byte, chunk 4 MiB, snapshot mã hóa 100 MiB, 1–1000 cột; byteLength phải bằng số byte payload. Published version phải có versionNumber/publishedAt/contentHash. Tổng mẫu diagnostics errors+warnings tối đa 100. Theme mặc định system ở model. EmailNormalized phải bằng email đã trim/lowercase; đăng ký vẫn cần DTO kiểm email hợp lệ. Format/lineage nullable, thông tin private như storageKey/hash không được tự trả trực tiếp qua model.

MongoDB không có foreign key/cascade tự động. Ownership, published immutability, CAS/revision/lease/fence, tham chiếu cùng dataset, checksum thực tế, schema khớp binary codec, phân biệt lỗi transient và điều phối publish/delete vẫn phải thực hiện ở repository/service các bước tiếp theo. 27 route nghiệp vụ vẫn trả 501; cấu hình persistence không đồng nghĩa đã có auth/import/Apply/restore.

## Kiểm chứng

`test:database` dùng Atlas đã cấu hình và schema/index đã provision, không dùng mock. Kiểm tra ghi/đọc qua Mongoose đủ 12 collection, kiểu BSON, từng unique index lỗi 11000, partial indexes, raw-driver validation lỗi 121, nested objects, giới hạn và transaction rollback. Có một ca commit bản ghi thử rồi đọc ngoài transaction, sau đó xóa đúng `_id` do test tạo. Các ca còn lại rollback, không drop collection/database. Kiểm tra NestJS startup và health 200/503 khi chủ động đóng kết nối của riêng app thử.

Tham chiếu: [MongoDB unique index và schema validation](https://www.mongodb.com/docs/manual/tutorial/unique-indexes-schema-validation/), [partial indexes](https://www.mongodb.com/docs/manual/core/index-partial/), [TTL](https://www.mongodb.com/docs/manual/core/index-ttl/), [Mongoose 8 validation](https://mongoosejs.com/docs/8.x/docs/validation.html). Unique là ràng buộc của index thật, không phải Mongoose validator.

Kết quả ngày 14/11/2026: provision/verify Atlas thành công; 46/46 database integration tests, 56/56 DTO + HTTP contract tests và typecheck cả backend/frontend đã qua. Bản ghi thử đã rollback hoặc xóa theo `_id`; không giữ dữ liệu mẫu trong database.


## Nâng cấp TF-IDF 17/11/2026

Trạng thái hiện tại đã có auth/import/codec/storage/processing/analysis; các mô tả scaffold phía trên là lịch sử ban đầu. TF-IDF thêm method=tfidf vào validator của đúng hai collection processingPreviews và processingOperations. Không thêm collection, không đổi snapshot codec, không sửa tài liệu/version cũ; lineage dùng sourceColumnId và category text cho term.

Với database đã provision engine0.6, chạy npm run db:upgrade:tfidf -w backend. Script kiểm cả hai schema hiện tại là bản cũ đã biết hoặc bản mới; nếu có drift khác thì dừng, không tự ghi đè schema lạ. collMod chỉ thêm enum, không xóa/ghi document hoặc đổi index; chạy lại an toàn. Sau đó kiểm toàn bộ12collection/index bằng verifyDatabase. Database mới dùng db:provision như trước. Backend cần tải lại code core/API0.7.
