# Unit test

Tổ chức theo code được kiểm: common/domain, modules/<name>. Các quy tắc đối chiếu nhiều module ở contracts/. Giữ nguyên 18 ca hợp đồng cũ, cộng 2 ca AuthService; tổng 20 ca.

Import source → chuẩn bị input → gọi policy/parser/service → kiểm kết quả/exception. Không kết nối database. auth.service.spec.ts dùng Nest Testing kiểm module wiring và 501 hiện tại, không giả là nghiệp vụ đăng nhập.

Từ gốc: npm run test:unit. Chỉ contract: npm run test:contracts -w backend (bỏ hai ca auth.service). Xem README từng nhánh và test/readme.md.
