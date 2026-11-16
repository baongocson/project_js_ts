# Kế hoạch refactor backend theo video góp ý

> Đã thực hiện/đối chiếu phần refactor cấu trúc theo phạm vi xác nhận ngày 16/11/2026; giữ nghiệp vụ backend hiện tại. Xem [trạng thái triển khai và kiểm chứng](refactor-status.md); nội dung bên dưới giữ vai trò phân tích video ban đầu.

## Phạm vi và cách đọc

- Nguồn: `Screen Recording 2026-11-15 082638.mp4`, dài khoảng **32:53**. Mốc bên dưới tính từ đầu video.
- **00:00–05:30** là phần góp ý các nhóm khác; **06:00–06:40** chuyển sang `project_js_ts`. Góp ý backend chủ yếu **07:06–19:11**, bổ sung tích hợp AI **30:50–31:46**.
- Dựa trên bản chép lời tự động toàn video và đối chiếu hình ảnh mã nguồn/cây thư mục. Có đoạn âm thanh khó nghe; nội dung là diễn giải, không phải trích dẫn nguyên văn.
- Kế hoạch phản ánh trạng thái trong video, **không xác nhận trạng thái code hiện tại**. Chưa thay đổi hoặc xóa mã nguồn.
- Tách yêu cầu có căn cứ trực tiếp với đề xuất thực hiện và điểm chưa rõ; không dùng tên file đang hiện trên màn hình làm bằng chứng rằng giảng viên đã duyệt nội dung file đó.

## 1. Những điểm giảng viên yêu cầu sửa

| Mốc | Yêu cầu | Việc cần thực hiện |
| --- | --- | --- |
| 08:38–09:25 | Mỗi thư mục cần README mô tả các file và luồng xử lý. | Bổ sung README có nội dung thật cho các phần code do nhóm tổ chức. |
| 11:14–12:00 | Đã chia module thì không cần thêm thư mục riêng chỉ để bọc một repository. | Đưa file repository ra trực tiếp trong thư mục module; giảm một tầng `repositories/` khi nó chỉ chứa một file. |
| 12:42–14:02 | Xây dựng lại cây module theo cách gọn, nhất quán; auth phải có guard. | Module mẫu có module, controller, service, guard, DTO; repository được nhắc rõ thêm ở 17:43–18:08. Áp dụng cách tổ chức cho các module tương tự. |
| 14:02–14:35 | Mỗi module phải có README hoàn chỉnh, ngoài cùng cũng có README tổng quan backend. | Mô tả cấu trúc, chức năng/nghiệp vụ, luồng xử lý và vai trò các phần; tránh cấu trúc mà thành viên không giải thích được. |
| 14:35–16:15 | Có kiểm thử, nhắc unit test và end-to-end; tổ chức test theo một trong hai cách. | Chọn test tập trung với cây tương ứng mã nguồn, hoặc đặt test ngay trong từng module. Cách gọi unit test trong âm thanh hơi khó nghe; end-to-end được nhắc rõ. |
| 16:17–17:37 | Phân định common, config, infrastructure. | common chứa phần dùng chung như exception; config quản lý cấu hình; infrastructure lo kết nối bên ngoài, ví dụ cơ sở dữ liệu/bên thứ ba. |
| 17:43–18:55 | Giữ bộ thành phần module cơ bản, có README giải thích nghiệp vụ và cấu trúc. | Chuẩn hóa controller, DTO, service, repository, module; có guard phù hợp với bảo vệ truy cập. |
| 30:50–31:46 | Nếu tích hợp AI, đặt phần đó trong một module backend. | Tích hợp AI qua module, không tự làm thêm một ứng dụng/backend bên ngoài chỉ vì có AI. Đây là hướng dẫn có điều kiện, không phải yêu cầu phải tích hợp AI ngay. |

## 2. Những điểm giảng viên kêu xóa hoặc bỏ cách tổ chức cũ

| Đối tượng | Căn cứ | Kết luận và giới hạn |
| --- | --- | --- |
| Thư mục `repositories/` bọc một repository trong một module | 11:14–12:00, giải thích rằng tách thêm thư mục làm rối khi chỉ có một file. | Bỏ tầng bọc này, giữ code repository bằng cách chuyển file lên thư mục module. **Không phải bỏ repository pattern hoặc xóa truy cập dữ liệu.** |
| Cách đặt test lộn xộn hiện tại | 15:22–15:59: có lời yêu cầu xóa cách bố trí hiện tại và lập lại cây test; sau đó đưa ra hai cách tổ chức. | Cần tổ chức lại. Không đủ căn cứ lập danh sách mọi test cần xóa hoặc kết luận giảng viên yêu cầu bỏ toàn bộ kiểm thử đang có. |
| Việc chia thêm nhiều lớp query/handler một cách không cần thiết | 18:08–18:38: giảng viên chấp nhận bộ module cơ bản và nói không cần bắt nhóm chia nhỏ thêm; một số từ khó nghe. | Có căn cứ giữ kiến trúc vừa đủ; không có căn cứ yêu cầu triển khai CQRS hoặc xóa một file query/handler cụ thể. |
| Backend/ứng dụng AI tách ngoài chỉ để tích hợp AI | 30:50–31:46. | Không cần dựng thêm bên ngoài trong phương án đang hướng dẫn; chưa có thao tác xóa một hệ thống AI cụ thể. |

**Chưa đủ căn cứ đưa vào danh sách phải xóa:** `schemas/`, `security/`, DTO validation, `common/domain/`, `infrastructure/database/`, `infrastructure/idempotency/`, các file controller/service hiện có. Có thể nhìn thấy chúng trong video nhưng không nghe rõ yêu cầu xóa cụ thể đối với từng mục.

## 3. Những phần cấu trúc thư mục cần thay đổi

Cây mẫu đề xuất để hiện thực hướng dẫn; không phải bản chép chính xác mọi tên file giảng viên đã yêu cầu:

```text
backend/
├── README.md
├── src/
│   ├── README.md
│   ├── common/
│   │   ├── README.md
│   │   └── ...                    # phần thực sự dùng chung, ví dụ exception/filter
│   ├── config/
│   │   ├── README.md
│   │   └── ...                    # cấu hình ứng dụng/môi trường
│   ├── infrastructure/
│   │   ├── README.md
│   │   └── database/
│   │       └── ...                # kết nối cơ sở dữ liệu
│   └── modules/
│       ├── README.md
│       └── auth/
│           ├── README.md
│           ├── dto/
│           │   ├── README.md
│           │   └── ...
│           ├── auth.controller.ts
│           ├── auth.service.ts
│           ├── auth.repository.ts # chuyển lên từ repositories/ nếu chỉ có một file
│           ├── auth.guard.ts
│           └── auth.module.ts
└── test/                          # nếu chọn phương án test tập trung
    └── ...                        # tổ chức tương ứng cấu trúc mã nguồn
```

- Giữ các module tính năng đang có trong hình: `analysis`, `auth`, `datasets`, `history`, `processing`, `projects`, `users`. Auth là ví dụ để chuẩn hóa, không có yêu cầu gộp hết nghiệp vụ vào auth.
- Với guard, yêu cầu **auth phải có guard** được nói rõ ở 13:25–13:44; giảng viên cũng yêu cầu các module tổ chức tương tự. Cách dùng guard chung hay riêng, bảo vệ endpoint nào cần xét theo nghiệp vụ, không suy ra rằng mọi module đều phải có một file guard rỗng.
- Cây chỉ thể hiện phần được bàn tới; không có nghĩa phải bỏ `main.ts`, các file `app.*` hoặc thư mục hiện hữu khác không được vẽ.
- Vị trí schema/security chưa được chốt rõ trong lời giảng: giữ nội dung, chỉ thay đổi khi có lý do riêng và đã kiểm tra phụ thuộc.
- Test có hai phương án được chấp nhận, **không bắt buộc thực hiện đồng thời cả hai**:
  1. Tập trung vào thư mục test, sắp cây theo cấu trúc code nguồn để biết test thuộc module nào.
  2. Đặt file test cùng từng module.
- Video không chốt chính xác test tập trung phải nằm ở `backend/test/` hay `backend/src/test/`. Cây trên chọn `backend/test/` để minh họa, không phải yêu cầu cứng.

## 4. Những nguyên tắc tổ chức code giảng viên hướng dẫn

1. **Tổ chức theo module/tính năng:** giữ các thành phần phục vụ module trong module đó; nhìn cây phải hiểu các phần chính.
2. **Tránh thư mục bọc không cần thiết:** một repository thì để file ngay trong module, không thêm một cấp thư mục chỉ để chứa nó.
3. **Phân biệt trách nhiệm dùng chung và nghiệp vụ:** common cho phần dùng chung; config cho cấu hình; infrastructure cho kết nối hệ thống ngoài; modules cho các nhóm tính năng.
4. **Có bảo vệ truy cập:** auth cần guard, không chỉ controller/service/DTO. Video chưa trình bày đầy đủ chiến lược xác thực/phân quyền.
5. **Đặc tả ngay trong repository:** README phải giúp hiểu chức năng, luồng xử lý, các file và cấu trúc; README ngoài cùng bao quát backend. Việc có AI hỗ trợ không thay cho việc người làm hiểu code.
6. **Test rõ vị trí và mục đích:** tổ chức tập trung theo cây nguồn hoặc đặt cùng module; có kiểm thử unit và E2E phù hợp.
7. **Giữ kiến trúc vừa đủ:** không cần chia thêm query/handler và nhiều tầng chỉ để làm cấu trúc phức tạp hơn khi bộ module cơ bản đáp ứng yêu cầu.
8. **Tích hợp thêm qua module:** ví dụ AI có thể là module của backend hiện tại.

Lưu ý về phần **00:00–03:03**: giảng viên đang góp ý Clean Architecture cho **nhóm khác**, nhắc phân tầng ngoài và tên `API` thay cho `presentation` ở backend. Không lấy đoạn này làm yêu cầu đổi backend `project_js_ts` sang kiến trúc bốn tầng. Đến khoảng 16:17–18:08, giảng viên trực tiếp chấp nhận hướng common/config/infrastructure/modules của dự án đang xét.

## 5. Những phần được nhận xét là đúng hoặc chấp nhận để giữ

| Phần | Căn cứ và mức kết luận |
| --- | --- |
| Hướng tổ chức common và config | Khoảng 07:06–07:32 có nhận xét OK khi xem cấu trúc; 16:17–16:59 giải thích và chấp nhận vai trò hai phần này. |
| Khung `common / config / infrastructure / modules` | 16:17–18:08: giảng viên nói chấp nhận cấu trúc này, tiếp tục giải thích trách nhiệm và các thành phần module. Giữ khung chính. |
| Kết nối cơ sở dữ liệu/bên thứ ba ở infrastructure | 17:00–17:37: phù hợp với trách nhiệm được giảng viên giải thích; không cần đưa phần kết nối chung vào từng module tùy tiện. |
| Chia module nghiệp vụ và bộ controller/DTO/service/repository/module | 17:43–18:08: được nhận xét tạm được; không yêu cầu phân tầng thêm cho nhóm. |

“Chấp nhận/tạm được” ở đây là về **hướng kiến trúc và cấu trúc**, không phải đã kiểm chứng mọi hàm hoặc tính đúng đắn của auth. Việc giảng viên mở `auth.service.ts`, DTO validation hay `auth-atlas.test.cjs` không đủ để kết luận các phần này đã được duyệt đúng về bảo mật hoặc kiểm thử.

## 6. Những nội dung chưa đủ rõ để kết luận

- **`schemas/` có phải xóa không:** không có câu đủ rõ tương đương yêu cầu bỏ tầng `repositories/`. Không tự thêm vào danh sách bắt buộc xóa.
- **Guard từng module:** auth được yêu cầu rõ; cơ chế guard dùng chung, tái sử dụng, tên file và mức áp dụng cho tất cả module chưa được giải thích đầy đủ.
- **Repository nhiều file:** lời góp ý nhắm trường hợp một file. Chưa có quy tắc cấm `repositories/` khi sau này một module có nhiều repository thực sự.
- **Các file test phải xóa:** có yêu cầu dọn cách tổ chức, nhưng không chỉ định từng file `contracts`, `database`, `HTTP` hay `auth-atlas`. Phải kiểm tra giá trị từng test trước khi chuyển đổi/loại bỏ.
- **Framework và vị trí test:** chưa yêu cầu Jest hay công cụ cụ thể; chưa chốt vị trí `src/test` so với `test`, naming toàn bộ test, coverage hoặc CI.
- **Query/handler:** vài từ ở 18:21–18:38 khó nghe; đủ để thấy không ép nhóm chia thêm, chưa đủ để áp một bộ quy tắc CQRS chi tiết.
- **DTO và validation:** không có căn cứ yêu cầu đổi interface sang class, bỏ validation riêng, thay thư viện validation hoặc đổi API contract. Việc xem DTO không tự tạo thành yêu cầu sửa các nội dung đó.
- **Cấu hình môi trường:** giảng viên nhắc cấu hình trong config hoặc qua `.env`, chưa chốt tên biến, cơ chế ưu tiên, môi trường triển khai. Không suy ra phải bỏ config hiện có hay hard-code giá trị.
- **Các đoạn hỏi common/domain hoặc collection contracts:** giảng viên hỏi vai trò và yêu cầu giải thích qua README; chưa đủ căn cứ kết luận helper/contract đang sai hoặc phải xóa.
- **AI:** chỉ là phương án nếu tích hợp, chưa chốt nhà cung cấp, mô hình, API hoặc tên module; không có yêu cầu tạo dịch vụ AI ngay.
- **README và index:** README được yêu cầu rất rộng, nhưng không có căn cứ áp vào dependency/output sinh tự động. Hướng dẫn `index.ts` ở phần sau chủ yếu đang nói frontend; không tự ép toàn bộ backend có barrel export tại mọi cấp.

## 7. Thứ tự thực hiện đề xuất và tiêu chí hoàn thành

Các bước sau là đề xuất triển khai, không phải nguyên văn lời giảng viên:

1. Kiểm kê backend hiện tại so với ảnh trong video; ghi nhận các yêu cầu đã làm sau buổi góp ý.
2. Giữ khung common/config/infrastructure/modules, mô tả ranh giới trách nhiệm trong README tổng.
3. Chuẩn hóa auth làm mẫu: controller/service/repository/module/DTO và guard phù hợp; đưa repository đơn ra khỏi thư mục bọc, cập nhật import và module wiring.
4. Áp dụng quy tắc tương ứng cho các module khác; giữ schema/security và nghiệp vụ nếu chưa có căn cứ thay đổi riêng.
5. Chọn cách tổ chức test; chuyển các test còn giá trị, bổ sung unit/E2E cần thiết và cập nhật lệnh chạy. Không xóa trắng test chỉ để làm cây thư mục gọn.
6. Viết README cho các thư mục code được nhóm quản lý: chức năng, các file, luồng xử lý, phụ thuộc, cách chạy/kiểm thử. Những trường thông tin chi tiết này là mẫu triển khai đề xuất cho yêu cầu tài liệu của giảng viên.
7. Chạy build/typecheck/test phù hợp; kiểm tra các endpoint và cơ chế guard vẫn đúng sau khi đổi vị trí file. Không cần triển khai AI nếu chưa thuộc phạm vi tính năng.

Hoàn thành khi: cấu trúc module rõ và nhất quán; repository đơn không còn bị bọc dư; auth có cơ chế guard đúng nghiệp vụ; common/config/infrastructure có trách nhiệm rõ; test có tổ chức; README giải thích được hệ thống; không biến điểm chưa rõ thành lệnh xóa code.
