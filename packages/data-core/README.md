# data-core — BE-2 contract

Package TypeScript thuần, không NestJS/Node filesystem/MongoDB/HTTP/IndexedDB. Backend dùng dependency `@dashboard/data-core`; package có CommonJS entry cho backend và ESM entry cho browser/offline. Tests chạy cùng fixture qua cả hai entry. Engine BE-3 được hợp nhất trong cùng package, hỗ trợ 27 tên phương pháp qua `processSnapshot` và `ENGINE_VERSION`. Đây chưa phải Processing API/Preview/Apply hoặc bộ thống kê Analysis hoàn chỉnh.

## Types và CSV

`Cell`, `StoredCell`, `Column`, `Row`, `Snapshot` là cấu trúc dùng chung. `StoredCell.rawToken` giữ lexeme nguồn khi suy thành kiểu khác text; serializer HTTP chỉ trả kind/value và missingKind theo hợp đồng.

`importCsv(bytes, {delimiter,columnTypes?}, newId)` nhận UTF-8, giữ header rỗng/trùng và nội dung field; host cấp UUIDv4 bằng callback. Suy toàn cột; all-missing là text; unsafe integer/leading-zero được giữ text khi không override. Không có giới hạn dòng/ô mới. Lỗi `DataError` không chứa nội dung ô. `CSV_INVALID.details.issues` có logical record và physical lines 1-based; vị trí cột 0-based.

## typed-ndjson-v1

Luồng UTF-8 bắt đầu bằng `{"codecVersion":"typed-ndjson-v1"}\n`, tiếp theo mỗi record là JSON của một `Row`, kết thúc LF. JSON escaping bảo toàn newline trong cell. Schema ở `versionColumns`; snapshot rỗng dòng vẫn có header codec. Chunk là đoạn byte liên tiếp tối đa 4 MiB, không có yêu cầu record/ký tự kết thúc tại biên chunk. Decoder dùng UTF-8 streaming fatal, kiểm header, schema, row IDs, positions và cell kinds.

SHA-256 do host thực hiện: từng chunk băm bytes chính xác; `contentHash = SHA256(canonicalSchemaJson + ':' + chunkSha256s.join(':'))`. Columns theo position và shape từ `publicColumn`; canonical schema JSON sắp khóa object đệ quy, giữ thứ tự array và mọi chuỗi. Codec không tự gọi crypto của Node hoặc browser.

## Query và sync

`queryRows`, `compareCells`, `matchesCellFilter`, `sameCell`, `missingKind` dùng chung online/offline. Sort giữ missing cuối cả hai chiều và tie rowId ASC theo API.

`mapOriginalIds` yêu cầu cùng source SHA-256 và import options đã được host xác minh, đối chiếu V1 theo position/schema/typed values; không map tên cột. Snapshot server có thể ghép từ metadata và toàn bộ các trang rows, không cần codec-only rawToken. `mapEncodedColumns` map theo source-column mapping và typed category/lineage. `assertReplayCompatible` chặn sai account, mất tài nguyên/quyền, engine mismatch và version conflict. `resumeAction` ưu tiên xác minh Apply chưa rõ kết quả trước khi tạo preview attempt khác.

Các helper này chưa phải frontend outbox hoặc engine; phải nối chúng vào flow thực tế phía FE/BE-3 để nghiệm thu đồng bộ hoàn chỉnh.

Chạy từ gốc: `npm run test -w @dashboard/data-core`, `npm run build -w @dashboard/data-core`.

## BE-2 + BE-3 integration (core-only)

- **Một contract duy nhất:** package `@dashboard/data-core` (không tạo alias `@dashboard3d/data-core`). `Column` giữ `format`, `lineage`; `Row` giữ `StoredCell.rawToken`; schema và row positions phải liên tục bắt đầu từ 0.
- `processSnapshot(snapshot, specification)` nhận `Snapshot` BE-2 và spec BE-3, trả `EngineResult` bất biến gồm `snapshot`, `changes`, `schemaChanges`, `errors`, `warnings`, `canApply`.
- Candidate được xử lý hoàn toàn trong bộ nhớ. `canApply: true` **không phải** là publish. BE-3 Processing API cần dùng `SnapshotPublisherService.prepare/publish` và receipt/idempotency của BE-2; owner/lease/base-version validation ở Backend.
- `one_hot`/`ordinal` cung cấp `format: null`, lineage typed và UUID dạng v4 ổn định cho replay. `drop_missing_rows`/`remove_duplicates` đánh lại `position` mà vẫn giữ `rowId`; `drop_missing_columns`/encoding đánh lại `position` cho cột. BE-2 codec sẽ từ chối candidate không hợp lệ.
- Bộ test gộp gồm test BE-2 Parser/Codec/Sync, các test A1–A5 của BE-3 và `be2-be3-compat.test.cjs` kiểm round-trip typed-ndjson-v1 sau xử lý.
- **Giới hạn chưa hoàn tất:** Convert datetime hiện chặn timezone IANA khác UTC (trả `UNSUPPORTED_TIMEZONE`); strip HTML chỉ là bộ lọc cơ bản; sinh ID dùng phép băm ổn định không có khả năng chống va chạm mật mã, có kiểm tra trùng trong snapshot; chưa tích hợp REST Preview/Apply, History/Restore, Analysis/3D, offline outbox, MongoDB transaction hay kiểm thử E2E. Các tình huống này phải giải quyết trước khi tuyên bố BE-3 hoàn tất.

Chạy từ thư mục gốc: `npm run typecheck`, `npm run lint`, `npm run test:unit`, `npm run build`. Test core riêng: `npm test -w @dashboard/data-core`.
