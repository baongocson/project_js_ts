# Auth security

- auth-crypto.ts: HS256 JWT fixed lifetime, issuer/audience, refresh random256/SHA256 và absolute expiry. Không còn password scrypt của nhánh tham khảo; password do bcryptjs cost12 trong service.
- token-settings.ts: đọc/kiểm secret >=32 UTF-8 bytes và issuer/audience.
- auth-context.ts: Public, CurrentPrincipal, AuthRequest/Principal và metadata PreviewBodyOwner.
- auth-mutation.guard.ts: Origin và IP rate limit trước parser; không tin proxy header chưa được cấu hình.
- auth-rate-limit.ts: register10/15m/IP, login60/15m/IP + failure5/15m/IP+email, refresh60/m/IP và session, logout60/m/IP. Configurable; map hash identity, bound memory, dọn định kỳ. Success login reset failure counter; concurrent attempts được reserve trước bcrypt.
- ownership.guard.ts: sau JWT, kiểm syntax resource IDs rồi project/dataset/version/preview và quan hệ. Preview trong body Apply có metadata riêng; parser/service vẫn chịu method-specific validation.
- ownership.service.ts: kiểm ownership và transaction fence để chống session revoke/user deleting/project deleting giữa guard và ghi. BE-2/3 phải gọi fence trong transaction mutation/publish; guard đơn lẻ không đủ.

Thứ tự request bảo vệ: JWT/session/user → syntax ID → parent/owner/relation → DTO/service. Missing auth401, invalid ID400, cross-owner403, missing/unpublished version404, deleting project GET404/write409. Row/cell tồn tại trong chunk, kiểm row/column đúng version là trách nhiệm Datasets/Processing khi BE-2/3 triển khai codec.

Test tại unit/modules/auth/auth-security.spec.ts, e2e/modules/auth/security.e2e-spec.ts và integration/modules/auth/auth.integration-spec.ts. Không để các file secret/token thật trong thư mục này.
