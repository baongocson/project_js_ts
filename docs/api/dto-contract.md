# Hợp đồng DTO đã thống nhất

Ngày cập nhật: 14/11/2026. Chủ dự án đã chọn 8 nguyên tắc ban đầu và phê duyệt toàn bộ phương án khuyên chọn D01–D26. Việc này không phê duyệt các giới hạn hoặc phương án khác trong bản AI Q01–Q75. Các mục mới dưới đây thay thế mô tả cũ chưa rõ đúng trong phạm vi được duyệt.

## Các thay đổi hợp đồng

| Phần | Giữ nguyên / bổ sung |
| --- | --- |
| Import | Endpoint POST projects/:projectId/datasets giữ nguyên; importOptions.columnTypes?=[{position,logicalType}] cho chọn lại kiểu sau preview cục bộ. Position 0-based, tối đa theo1000cột hiện có, phải khớp header và không trùng. Không nhận userId/ownerId/engineVersion. |
| Suy kiểu | Suy toàn cột, bỏ missing khi suy; leading-zero và integer không safe giữ text; allmissing mặc định text. Chỉ chuyển type nếu toàn bộ nonmissing hợp lệ; khác loại giữ text/mixed theo kiểu người dùng chọn, không ép bằng parseFloat. Server xác minh lại thay vì tin sample frontend. |
| Bảo toàn | Blob CSV byte-for-byte ở storage riêng, storageKey private trong originalFile; checksum byte nguồn. Codec có rawToken khi cần giữ lexeme của typed value. Preview sửa kiểu không ghi đè file gốc. Storage local/typed codec đã triển khai ở BE-2; bản nguồn bất biến. |
| Missing | CellInputDto 6kind, mixed chỉ là kiểu cột; kind null có value=null. Không nhận missingKind từ client. CellOutputDto thêm missingKind khi missing, giữ nguyên token. Nonmissing đúng schema, missing được giữ text nguồn kể cả cột number. |
| Duplicate | Exact typed equality, không trim/casefold/NFC; không so rowId/position. Canonical request chỉ ổn định thứ tự key và defaults, không sửa chuỗi dữ liệu/array UI. |
| No-op | ready, canApply=false, warning NO_CHANGES_DETECTED; Apply409 NO_CHANGES_TO_APPLY. Không version/history. So cả dữ liệu, token, schema/metadata và order. |
| Autosave | Field được gửi nhưng state không đổi:200 giữ revision/updatedAt. Revision/base cũ409 trước khi so no-op. Chỉ payload không có field cập nhật mới400 EMPTY_PATCH. Merge field con; arrays replace, cell/sort atomic. Không reset method/threshold ngoài patch. |
| CSV | UTF8 BOM,quoted delimiter/newline,LF/CRLF,header-only được nhận. 0byte/0cột/blank record bất thường/lệch field báo CSV_INVALID có vị trí; terminal newline không là record rỗng. Không âm thầm skip. |
| Giới hạn | Chỉ các trần trong API/ERD; không thêm100.000dòng/32KBô/1MiBrecord/correlation200cột/options16KiB. |
| Lỗi thống kê | ZERO_SPREAD cho IQR hoặc range bằng0; ZERO_VARIANCE cho std0; ALL_MISSING_COLUMN khi không có số hợp lệ. |
| Hợp đồng khác | Giữ response envelope, newVersion, tên query outlierThreshold và27endpoint. Không mặc nhiên dùng các field/limits từ bản AI chưa duyệt. |

## Nullable theo hướng truyền

- Request UI: displayName, axes, cell, sort có null khi đã cho phép xóa; boundVersionId=null chỉ projectempty. Root config/selection/tableState và danh sách không null.
- Request cell: {kind:"null",value:null} hợp lệ; thiếu value không hợp lệ. Không nhầm null cell với thiếu body.
- Response: dataset/candidate/base ở import, parent/restoredFrom, before/after dòng, format/lineage, rate/bounds/matrix có null theo đúng tình huống. Không áp whitelist nullable UI cho mọi response.

## Quyết định D01–D26 đã duyệt

| Mã | Quy tắc áp dụng |
| --- | --- |
| D01 | Email ASCII, tối đa 254 ký tự sau trim/lowercase; không bỏ dấu cộng/dấu chấm. |
| D02 | displayName sau trim dài 1–100 Unicode code point; null xóa, blank báo lỗi; không NFC. |
| D03 | Theme mặc định system, enum light/dark/system. |
| D04 | Tên project sau trim dài 1–100 code point, cho phép trùng. |
| D05 | Sort name/createdAt/updatedAt cả hai chiều, default -updatedAt; tie _id DESC. |
| D06 | Decimal separator chọn dấu chấm hoặc phẩy; grouping mặc định false, bật thì dùng ký hiệu còn lại với nhóm chữ số hợp lệ. |
| D07 | Chuyển số nhận trim ngoài, dấu +/-, E/e; parse đầy đủ; integer không safe không âm thầm làm tròn. |
| D08 | V1 date YYYY-MM-DD, datetime ISO8601; không tự đoán DD/MM/YYYY. |
| D09 | Thiếu offset dùng timezone chọn, mặc định UTC; offset nguồn ưu tiên. DST ambiguous/nonexistent báo lỗi. |
| D10 | Date→datetime lấy 00:00 theo zone chọn; datetime→date ở V1 lấy ngày UTC, vì convert_date không nhận timezone theo API hiện hành. Boolean dùng mapping tường minh, default true/1 và false/0. |
| D11 | One-hot nhận text/boolean; number chỉ khi asCategory=true. Chưa mixed/date/datetime ở V1. |
| D12 | Encoding mặc định bỏ nguồn, có tùy chọn giữ nguồn. |
| D13 | source_category hoặc source_ordinal, suffix nếu trùng; bỏ nguồn thay tại vị trí nguồn, giữ nguồn chèn sau. |
| D14 | Missing one-hot mặc định all-null. Nếu bật missingCategory, gộp một category và tính vào trần hiện có; không sửa dữ liệu nguồn. |
| D15 | Ordinal đủ mọi category nonmissing, không thừa; label hữu hạn, duy nhất, được âm/thập phân; giữ token missing. |
| D16 | Missing cuối cả tăng và giảm. |
| D17 | Text so code point, không trim/casefold/NFC; mixed theo number/date/datetime/boolean/text rồi giá trị. |
| D18 | Contains không phân biệt hoa/thường, không trim/NFC. Ordered filters chỉ number/date/datetime cùng kind; eq/ne exact typed. |
| D19 | Value-counts gộp missing trong kết quả, mặc định include; không thay snapshot hoặc duplicate equality. |
| D20 | Histogram cột hằng một bin; allmissing/nonnumeric trả[] kèm lý do, không lỗi toàn màn hình. |
| D21 | Tách counts dòng/cột; updatedCell chỉ ô có ở cả hai bản và đổi value/kind/token; không cộng ô của cột thêm/xóa. |
| D22 | Tối đa100 mẫu diagnostics tổng, errors trước; tổng thực tế giữ trong counts, có truncated. |
| D23 | V1 Pearson cho number, các loại khác null kèm lý do; chưa thêm association category/text. |
| D24 | Restore current:409 NO_CHANGES_TO_RESTORE, không version/history. Target missing/unpublished/wrong dataset:404 VERSION_NOT_FOUND. |
| D25 | Preview applied còn trong vòng đời:200; expired còn record:410; đã purge:404; không thêm tombstone. |
| D26 | Failed transient xác nhận rollback được retry cùng key/hash qua leaseCAS; deterministic replay lỗi. Chưa rõ commit thì recovery, không blind retry. Auth trước ID/quyền, receipt trước stale/consumed nhưng không vượt quyền hoặc xóa. |

## Quy tắc response đã cụ thể hóa

- Giữ envelope hiện hành: register có user, login có accessToken/expiresIn/user, PATCH user trả projection như tài liệu; không ép mọi route thành cùng public-user response. User mapper dùng allowlist, theme default system, không leak hash/token hoặc preferences nội bộ.
- CellInputDto không có missingKind; CellOutputDto chỉ thêm missingKind khi missing. Các nullable khác theo hướng truyền và nghiệp vụ, không dùng một whitelist UI chung cho toàn API.
- ColumnDto: columnId/name/position/logicalType/format/lineage; format và lineage nullable. Ordinal giữ nguồn có lineage.sourceColumnId; one-hot thêm category typed hoặc marker missing. storageKey của file gốc không công khai.
- ProcessingSummaryDto: before/after counts; inserted/deleted/updatedRowCount, updatedCellCount; added/removed/typeChanged/metadataChangedColumnCount; usedStatistics theo cột. Schema-only diff vẫn thể hiện ở schemaChanges/updatedRowCount; 0 dòng có thể đổi schema nhưng updatedRowCount=0.
- DiagnosticsDto: errorCount/warningCount là tổng, errors+warnings samples<=100 và truncated. Khác error.details.issues của validation request; error.message và từng diagnostic.message luôn là string.
- Histogram bin gồm lowerBound/upperBound/count; các khoảng [lower,upper), bin cuối gồm upper. Cột hằng lower=upper=giá trị hằng, count=số nonmissing, histogramStatus=constant_column. Allmissing/nonnumeric histogram=[] và reason riêng; outlierBounds=null khi không áp dụng.
- Value-counts nonmissing có value typed; nhóm missing có value=null,isMissing=true. includeMissing=false loại khỏi items/totalCategories nhưng rate vẫn mẫu totalRows; totalRows0 thì rate=null.

## Ma trận endpoint và DTO

Prefix chung `/api/v1`. Request dưới đây là DTO đã validate/điền default; file import là binary multipart riêng. DELETE/logout204 không có response body. Các response hiện là hợp đồng TypeScript; chỉ user đã có mapper allowlist mẫu, các mapper/serializer còn lại sẽ được nối khi service có dữ liệu thật.

| Method/path | Request / query | Response |
| --- | --- | --- |
| POST auth/register | RegisterDto | RegisterResponseDto |
| POST auth/login | LoginDto | LoginResponseDto |
| POST auth/refresh | EmptyBodyDto + cookie | RefreshResponseDto |
| POST auth/logout | EmptyBodyDto + cookie | void |
| GET users/me | Không body/query | PublicUserDto |
| PATCH users/me | PatchUserDto | PatchUserResponseDto |
| DELETE users/me | Không body | void |
| POST projects | ProjectNameDto + Idempotency-Key | CreateProjectResponseDto |
| GET projects | ListProjectsQueryDto | ListProjectsResponseDto |
| GET projects/:projectId | ResourceParamsDto | ProjectDetailResponseDto |
| PATCH projects/:projectId | ProjectNameDto | RenameProjectResponseDto |
| PATCH projects/:projectId/workspace | PatchWorkspaceDto | PatchWorkspaceResponseDto |
| DELETE projects/:projectId | ResourceParamsDto, không body | void |
| POST projects/:projectId/datasets | ImportDatasetRequestDto gồm file + ImportOptionsDto + key | ImportDatasetResponseDto |
| GET datasets/:datasetId/versions/:versionId | ResourceParamsDto | VersionResponseDto |
| GET .../versions/:versionId/rows | RowsQueryDto | RowsResponseDto |
| GET .../versions/:versionId/rows/:rowId | ResourceParamsDto | RowResponseDto |
| GET .../analysis/summary | SummaryQueryDto giữ outlierThreshold | AnalysisSummaryResponseDto |
| GET .../analysis/columns/:columnId/distribution | DistributionQueryDto | DistributionResponseDto |
| GET .../analysis/correlation | CorrelationQueryDto | CorrelationResponseDto |
| GET .../analysis/points-3d | Points3dQueryDto | Points3dResponseDto |
| GET .../analysis/columns/:columnId/value-counts | ValueCountsQueryDto | ValueCountsResponseDto |
| POST datasets/:datasetId/previews | CreatePreviewDto + key | CreatePreviewResponseDto |
| GET datasets/:datasetId/previews/:previewId | PreviewQueryDto | PreviewResponseDto |
| POST datasets/:datasetId/operations | ApplyPreviewDto + key | ApplyPreviewResponseDto |
| GET datasets/:datasetId/operations | HistoryQueryDto | HistoryResponseDto |
| POST datasets/:datasetId/versions/:versionId/restore | RestoreVersionDto + key | RestoreVersionResponseDto giữ newVersion |

## Validation và chuẩn hóa kỹ thuật

- Bỏ qua field optional dùng default/giữ giá trị cũ theo từng DTO; null chỉ đúng field nullable. Không dùng implicit string→number/boolean cho JSON body.
- Query integer dương chuẩn không leading-zero, finite/safe; số thực nhận dạng JSON decimal/exponent và finite>0. Bool query chỉtrue/false. Query lặp/khóa không hỗ trợ400, kể cả route không có query.
- ID tài nguyên hex24, row/column UUIDv4; sau validate canonical lowercase ID. Không lowercase chuỗi dữ liệu, mapping category hay selection order. Object-key canonicalization ổn định hash; upload hash phải có checksum file gốc.
- Filter query là JSON sau URL decoding một lần; dùng cùng validator với workspace. Không tự thêm byte-limit filter hoặc cap bins100.
- Kiểm owner, tồn tại row/column trong snapshot, scope compatibility, coverage ordinal và category count vẫn thuộc service vì cần dữ liệu thật; không thể bảo đảm bằng DTO thuần.
- Guard và parser hạ tầng phải được nối đúng thứ tự D26 khi triển khai auth. AuthGuard/OwnershipGuard toàn cục và write fences đã triển khai; DTO trả400 riêng lẻ không thay thế security integration tests.

## Phạm vi thực thi và bước tiếp theo

Đã có request/body/query/path/header validators cho27route, union method-specific cho27phương pháp, response types, user projection mapper và pure policies cho missing/equality/sort/filter/no-op/autosave/diagnostics/restore/expiry/retry.

Đã triển khai 27 API với auth/ownership, CSV/storage/typed snapshot, 27 phương pháp Data Core, Preview/Apply, History/Restore và Analysis. Publish dùng transaction/receipt/CAS/lifecycle fence; schema provision/verify tại [database.md](../database/database.md). Bộ integration replica tạm kiểm HTTP/DB thật. DB-disabled vẫn có nhánh scaffold riêng; không dùng nó thay bằng chứng nghiệp vụ. Trạng thái nghiệm thu và giới hạn xem [báo cáo xử lý checklist](../reports/backend-plan-remediation-2026-11-16.md).

Không cần duyệt lại D01–D26 để viết service theo hợp đồng này. Chỉ hỏi lại nếu phát sinh thay đổi chức năng, giới hạn mới hoặc nguy cơ làm mất dữ liệu.

## Kiểm tra

- `npm run test:contracts -w backend`: các ca biên về Unicode/typed-null/precision, auth/profile/query/filter, no-op/autosave, diagnostics và lifecycle/retry.
- `npm run test:http -w backend`: khởi động backend tạm, kiểm27route và input sai; suite DB-disabled kiểm 501/503 và validation với override tường minh; integration DB-enabled nằm trong test:integration:local.
- Không thay thế integration tests MongoDB/CSV/storage/engine sau này.
