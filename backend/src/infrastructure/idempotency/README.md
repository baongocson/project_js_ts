IdempotencyService dùng unique(userId, actionScope, keyDigest), requestHash, leaseToken/leaseUntil và receipt trên collection đã có. Key được SHA-256; payload canonical JSON giữ nguyên chuỗi/thứ tự array. Import hash bao gồm checksum nguồn/options/tên file.

`claim` kiểm user/session/project fence trước replay; cùng key/payload trả receipt, payload khác409, pending409 với Retry-After. Lease60giây, heartbeat20giây, cấu hình IDEMPOTENCY_LEASE_MS/IDEMPOTENCY_HEARTBEAT_MS. `run` duy trì heartbeat; mọi transaction batch phải gọi `touch`; publish + history + `complete` phải cùng transaction. Lease hết hạn không tự cho phép ghi: takeover CAS trên receipt tranh cùng transaction của worker cũ; publication và receipt nguyên tử nên không có một published operation thiếu receipt.

Deterministic HTTP4xx được lưu failed response sau khi transaction đã abort; lỗi hạ tầng/chưa rõ commit được kiểm durable receipt, giữ pending cho recovery/retry cùng key. Recovery import cleanup chỉ dữ liệu chưa published, không suy thành công từ thời gian. Lease cũ không thể write/publish sau takeover/delete/logout.

BE-3 dùng module export này cho preview/Apply/restore, giữ actionScope ổn định và replay trước stale/applied sau quyền/lifecycle. Không dùng cho Auth, không lưu token vào body receipt. `SnapshotPublisherService` là participant publish đã có; decision invalid/no-op/expired vẫn thuộc BE-3.

Kiểm thực tế: integration BE-2 trên MongoDB thật qua `npm run test:be2:local -w backend`, gồm concurrent claim, heartbeat, expired takeover, transaction rollback và mất kết nối HTTP sau commit.
