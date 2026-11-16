# Auth HTTP test

auth.e2e-spec.ts giữ các body/query contract khi database=false, override guard tường minh. Không dùng nó để tuyên bố auth thành công.

security.e2e-spec.ts không override guard: health public, protected routes401 trước ID400, forged bearer401, Origin403 và rate limit429/Retry-After. Database tắt, không cần Atlas.

Từ gốc: npm run test:e2e:backend. HTTP+Atlas auth/user/ownership/cascade thật ở integration/modules/auth; chạy npm run test:be1 -w backend.
