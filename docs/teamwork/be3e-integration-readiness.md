# BE-3E — Integration Readiness (Backend + offline contracts)

## Phạm vi bản E1

- Kiểm thử **MongoDB replica set tạm, riêng biệt** qua HTTP thực: Auth, Dataset/CSV, Processing Preview/Get/Apply, History/Restore và 5 Analysis API.
- Kiểm tra snapshot đã publish bất biến, receipt/idempotency retry, stale-version conflict, quyền sở hữu và hai Apply cạnh tranh.
- Sau E1 đã có **E2A offline outbox/replay core** và 10 test thuần đạt; browser UI, lưu CSV offline, ID mapping và offline→server E2E vẫn chưa hoàn tất, cần FE-1/FE-3 phối hợp.
- Không phải bản triển khai trên Atlas production, không thay thế security/load test.

## Thực hiện sau khi đã commit BE-3D

Sao chép thư mục `backend` + `docs` trong patch vào gốc project.

```cmd
cd /d E:\Projects\JSTS
npm run typecheck && npm run lint && npm run test:unit && npm run build
npm run test:e2e:backend
npm run test:integration:local -w backend
```

`test:integration:local` dùng `MongoMemoryReplSet`, cấp phát MongoDB database riêng và tự dừng. Lần đầu có thể phải tải MongoDB 8.0.16. **Không chạy `npm run test:integration -w backend` trực tiếp trên URI Atlas cá nhân**; test này tạo/xóa dữ liệu thử.

Nếu chạy không được (không tải được binary, thiếu quyền khởi chạy `mongod`, antivirus chặn), gửi toàn bộ log, không tự đổi `MONGODB_URI` thành Atlas production.

## Coverage kiểm được

1. CSV import và thông tin typed V1, đọc lại row ID/cột.
2. Preview mới có thể đọc trước/sau; chưa thay đổi current version; thay đổi đúng cell.
3. Preview cùng key/payload replay nguyên response; khác payload = 409.
4. Apply xuất bản version mới, trả response ổn định sau retry; version cũ bất biến; operation ghi đúng một lần.
5. History và 5 Analysis endpoints có dữ liệu thực; chặn cross-owner.
6. Restore tạo version mới, giữ version nguồn; same-key retry không tạo bản sao.
7. Stale base dừng, giữ lịch sử và current version.
8. Concurrent Apply: tối đa một commit; kiểm revision và ledger.

## Coverage còn thiếu — không đánh dấu BE-3 hoàn thành

- FE outbox core đã có IndexedDB queue store và checkpoints; **chưa có** original CSV bytes, complete typed snapshot, local-to-server ID maps hoặc UI wiring.
- End-to-end mạng mất giữa request/response, reload giữa Apply và retry nguyên key, mới chỉ có retry qua HTTP (BE-2 có test disconnect ở project create).
- Các luồng `one_hot`, `ordinal`, `remove_duplicates`, `drop_missing_rows` qua HTTP thực và đồng bộ sau encoding.
- Hết hạn preview + background cleanup; pending leases/recovery khi worker chết, concurrent restore và account delete.
- Stress test dữ liệu lớn và phân trang hàng vạn change records; upload/limits và lỗi corruption BE-2 đã có coverage riêng.
- Backend integration với môi trường MongoDB triển khai thật và frontend thật; review BE-2 trước merge.

## Tiêu chí hoàn thành

- Test integration local pass (cả BE-1/BE-2/BE-3) và test unit/E2E/typecheck/lint/build pass.
- Review các giới hạn trên; fix nếu có failure.
- Có test FE offline replay/resume/conflict với server thực tế trước khi đánh dấu done.
