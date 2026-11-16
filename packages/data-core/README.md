# data-core — BE-2 contract

Package TypeScript thuần, không NestJS/Node filesystem/MongoDB/HTTP/IndexedDB. Backend dùng dependency `@dashboard/data-core`; package có CommonJS entry cho backend và ESM entry cho browser/offline. Tests chạy cùng fixture qua cả hai entry. Engine 27 method và thống kê do BE-3 bổ sung, chưa được triển khai trong gói BE-2.

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
