# Feature auth

AuthPage cung cấp register/login với field errors, loading và chống submit lặp. ProfilePage đọc hồ sơ và PATCH tên hiển thị; theme được lưu riêng qua ThemeSwitcher trên header để lưu tên không ghi đè lựa chọn giao diện mới. Logout/delete có xác nhận, kiểm dữ liệu local/pending và bản nháp workspace trước khi dọn dữ liệu. Backend nghiệp vụ chạy khi DB bật; chế độ DB-disabled 501 là gate hạ tầng riêng.

Session external store giữ access token trong bộ nhớ, bootstrap refresh/me, single-flight refresh, logout/generation fence và coordination qua BroadcastChannel/Web Locks. Cookie refresh HttpOnly/Secure do server cấp; không ghi token vào localStorage/IndexedDB/service-worker cache. LocalStorage chỉ giữ lựa chọn giao diện, dấu signout và bản nháp workspace không chứa token.

Shared HTTP transport gắn owner vào request/replay và chỉ replay safe/keyed mutation một lần. Project sync pin owner cho toàn chuỗi request. Session lỗi không biến guest local thành user server; route guard không thay quyền backend. Offline local mode vẫn mở được khi không xác thực API.

App ghép SessionBootstrap, RequireSession, ThemeEffect và callbacks inspect/lock local data; feature không import app hoặc offline runtime. Profile cleanup chỉ xóa local khi người dùng chọn rõ; giữ bản local không chuyển queue sang user khác.

`npm run test:unit -w frontend` kiểm refresh single-flight/logout fence/bootstrap, envelope/multipart/abort/replay/owner. `npm run test:acceptance -w frontend` kiểm auth/profile/theme reload, cookie/response loss/account/conflict và online/offline UI. Acceptance account-lifecycle kiểm pending/draft confirmation, logout nhiều tab, stale dialog/account switch, cleanup đúng owner, offline local signout và session hết hạn giữa autosave/sync. Unit kiểm response delete muộn và logout chờ cookie lock không dọn phiên login mới.

`AccountActions` được export để Profile và offline dùng cùng quy trình. Delete cho lựa chọn xóa local hoặc xác nhận giữ bản phục hồi; không ép xóa dữ liệu chưa sync. Chữ ký withAccountLock nhận ownerId cố định, recheck identity sau mỗi bước đọc/cleanup bất đồng bộ trước khi logout/delete.
