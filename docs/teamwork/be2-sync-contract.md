# Contract offline replay — BE-2

Không endpoint mới, không collection sync/job. Đây là contract để FE-1/FE-3 và BE-3 tích hợp; chưa phải outbox frontend hoàn chỉnh.

1. Offline giữ source CSV bytes, SHA-256, canonical importOptions, V1 typed snapshot, lịch sử và ID local. Engine/parser/query phải đến cùng package data-core.
2. Xác minh tài khoản đích. Tạo project qua POST projects với key ổn định; mất response retry nguyên key/payload. Không gửi ownerId/local ID như ObjectId.
3. Upload đúng CSV nguồn qua POST projects/:projectId/datasets với key riêng ổn định. Persist receipt response vào checkpoint. Server V1/column UUID/row UUID do server sinh.
4. Ghép metadata + **toàn bộ** các trang rows V1; checksum nguồn và importOptions phải khớp. Dùng mapOriginalIds so position/schema/typed cells/missing token; header trùng không phải key. Không coi một trang cache là snapshot offline đầy đủ.
5. Map scope/cell/filter refs qua ID mapping; replay từng preview→Apply hoặc restore tuần tự, mỗi logical request có key riêng. Preview engineVersion phải bằng engine đã tạo lịch sử local; server tính lại candidate, không nhận candidate client.
6. Trước Apply, so currentVersion/revision với base mong đợi. Dùng assertReplayCompatible; mismatch account/engine/version hoặc resource thiếu/mất quyền phải dừng, giữ local và giải thích. Không auto-merge, tạo project thay thế hoặc ghi đè server.
7. Cột encoding map theo sourceColumnId đã map và typed category/lineage (mapEncodedColumns), không theo tên. Giữ row ID qua process; mapping local-version→server-version/checkpoint chỉ cập nhật sau response server xác nhận.
8. Preview hết hạn: nếu Apply chưa được xác minh, replay **Apply cùng key/payload** trước. Chỉ tạo preview attempt mới khi đã xác định Apply không commit. resumeAction biểu diễn thứ tự này; không tự sinh key mới để thoát lỗi mạng.
9. 401: phục hồi auth theo FE-1, giữ key/checkpoint. 403/404/deleting: dừng. 409 pending: chờ Retry-After rồi retry nguyên request. 409 base/workspace conflict: dừng. 413: giữ local, giải thích giới hạn. 503/unknown commit: recovery/replay cùng key, không suy rollback từ lease hết hạn.

Action scopes server hiện dùng `v1.projects.create` và `v1.projects.<projectId>.datasets.import`; key độc lập theo user/scope. BE-3 phải chọn actionScope ổn định cho preview/Apply/restore và dùng IdempotencyService; không thay shape API.

Nghiệm thu chung còn cần FE/BE-3: đóng/mở app với outbox bền vững, sync thật, ngắt mạng sau commit, resume, conflict, sai account/engine, mở phiên khác đọc dữ liệu từ server. Core tests hiện chỉ chứng minh mapping/conflict/resume contract và backend tests chứng minh receipt/publish/retry thật; không thay thế gate frontend.
