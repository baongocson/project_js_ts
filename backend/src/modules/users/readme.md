# Users — BE-1

GET/PATCH/DELETE /users/me đã triển khai khi database bật, dùng Principal của global AuthGuard. UsersGuard là alias ủy nhiệm AuthGuard nếu module khác cần dùng tường minh; không gắn lặp vào route hiện tại.

GET dùng publicUser projection, không lộ hash/session/lifecycle/writeEpoch. PATCH giữ nested merge: chỉ displayName/preferences.theme đã gửi, null xóa tên; UsersRepository dùng transaction + OwnershipService.fence để kiểm lại session/user active và tránh race với logout/delete.

DELETE gọi AccountCleanupService: transaction mark user deleting/revoke sessions/fence projects, sau đó xóa phụ thuộc và file nguồn. Chỉ204 sau khi hoàn tất. Lỗi trả503, giữ marker để startup/worker dọn tiếp, user không còn dùng Bearer API được. Không xóa account khác hoặc bỏ validation/schema để dọn.

users.controller.ts xử lý DTO/status, service điều phối, repository truy cập users. AccountCleanupModule trong infrastructure/database được import để dùng chung với BE-2; không viết bản cascade riêng. Schema vẫn tập trung trong infrastructure.

Test: npm run test:be1 -w backend (Atlas thật) và unit/e2e chung. Checklist/handoff tại docs/plans/be1-handoff.md. Auth UI/offline sync và những API ngoài Users/Auth chưa thuộc gói này.
