# Users security

Global AuthGuard kiểm JWT/session/user active trước controller; users.guard.ts chỉ ủy nhiệm AuthGuard, không còn ném 501 placeholder. Identity lấy từ CurrentPrincipal, không nhận userId/ownerId trong request body.

GET projection, PATCH transaction fence và DELETE mark/revoke/cleanup được kiểm ở integration/modules/auth/auth.integration-spec.ts. AccountCleanupService xử lý lifecycle/delete; mọi writer BE-2/3 phải dùng cùng parent fence để không tái tạo dữ liệu sau xóa.
