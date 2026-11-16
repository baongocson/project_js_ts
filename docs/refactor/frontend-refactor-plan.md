# Kế hoạch refactor frontend theo video góp ý

> Đã thực hiện phần refactor cấu trúc theo phạm vi xác nhận ngày 16/11/2026. Xem [trạng thái triển khai và kiểm chứng](refactor-status.md); nội dung bên dưới giữ vai trò phân tích video ban đầu.

## Phạm vi và cách đọc

- Nguồn: `Screen Recording 2026-11-15 082638.mp4`, dài khoảng **32:53**. Mốc bên dưới tính từ đầu video, không phải giờ trên màn hình Google Meet.
- Khoảng **00:00–05:30** là góp ý cho các dự án khác. Khoảng **06:00–06:40** bắt đầu chuyển sang `project_js_ts`; phần frontend tập trung ở **19:50–30:31**, bổ sung README ở **31:46–32:11**.
- Phân tích dựa trên bản chép lời tự động toàn video, đối chiếu hình ảnh cây thư mục và thao tác trên màn hình. Âm thanh có đoạn khó nghe; các câu bên dưới là diễn giải, không phải trích dẫn nguyên văn.
- Đây là kế hoạch theo trạng thái xuất hiện trong video, **không phải kết quả kiểm tra code hiện tại**. Chưa sửa hoặc xóa mã nguồn.
- “Yêu cầu” là nội dung có căn cứ trực tiếp; “đề xuất triển khai” là cách thực hiện do người phân tích đưa ra. Cây thư mục minh họa không có nghĩa giảng viên đã đọc chính xác mọi tên file trong cây.

## 1. Những điểm giảng viên yêu cầu sửa

| Mốc | Yêu cầu | Việc cần thực hiện |
| --- | --- | --- |
| 19:50–20:38 | Chuẩn hóa phần khởi tạo và cấu hình ứng dụng; nhắc `main`, tạo/mở `app`, nói tới router và provider. | Dùng `src/app/` để tổ chức cấu hình router, provider và phần lắp ghép ứng dụng. Vai trò chi tiết của `main.tsx` không được giảng lại đầy đủ trong đoạn này. |
| 20:38–23:22 | Tổ chức frontend theo feature; thành phần riêng của feature phải nằm trong feature đó. | Chuẩn hóa mỗi feature với `api/`, `components/`, `hooks/`, `pages/`; màn hình minh họa bằng `features/auth/`. |
| 21:55–22:57 | Làm rõ vai trò hooks. | Đặt phần quản lý trạng thái, xử lý và tái sử dụng logic phù hợp trong hooks của feature; không để cấu trúc chỉ có tên mà người làm không giải thích được. |
| 23:22–24:05 | Type của một feature được khai báo bằng file ngay tại feature. | Thêm `features/<feature>/types.ts`; hình ảnh xác nhận tên **`types.ts`**, không phải thư mục `types/` trong feature. |
| 24:05–26:21 | Có `index.ts` để export các thành phần, giúp bên ngoài import qua đầu mối của thư mục. | Bổ sung đầu mối export ở feature và các cấp thư mục mã nguồn tương ứng; cập nhật nơi sử dụng. Giảng viên nhấn mạnh áp dụng cho các feature/thư mục nói chung. |
| 26:21–29:03 | Tạo `shared` cho các phần dùng chung, với API, UI và style. | Tổ chức `shared/api/`, `shared/ui/`, `shared/style/`. Hình ảnh khoảng 29:00 hiển thị **`style`** số ít. |
| 27:31–28:00 | Chuẩn hóa phần gọi HTTP dùng chung: URL gốc, gửi yêu cầu HTTP, ví dụ HTTP client. | Đặt cấu hình và HTTP client chung trong `shared/api/`; API gắn nghiệp vụ vẫn ở feature tương ứng. Tên `http-client.ts` dưới đây là ví dụ triển khai. |
| 28:00–28:41 | UI dùng chung phải thống nhất. | Gom button, input, dialog dùng chung vào `shared/ui/`; không để mỗi feature tự tạo một kiểu cho cùng thành phần cơ bản. |
| 28:41–29:03 | Có nơi quản lý style/design dùng chung, có nhắc token. | Đặt style và các quy ước giao diện chung trong `shared/style/`; nội dung token cụ thể chưa được chốt. |
| 29:09–30:03 | Tổ chức lại test, thêm phần end-to-end. | Có thư mục E2E trong `frontend/test/`; ví dụ tên test theo auth và dạng `auth.e2e.spec.ts`. Hình ảnh khoảng 30:00 xác nhận thư mục **`E2E`**. |
| 30:09–30:31 | Tuân theo chiều import: app → features; features → shared; app → shared. | Rà soát import theo sơ đồ ở mục 4. |
| 31:46–32:11; liên hệ 08:38–09:25 | Mỗi feature/module có README, giải thích chức năng, cách hoạt động, cách chạy. | Viết README cho frontend tổng và các thư mục mã nguồn được tổ chức; không chỉ tạo file rỗng. |

## 2. Những điểm giảng viên kêu xóa hoặc bỏ cách tổ chức cũ

| Đối tượng | Căn cứ | Kết luận và giới hạn |
| --- | --- | --- |
| `src/lib/` và `src/types/` đang đặt ngoài các feature | 26:21–26:46: mở/nhắc lib, types rồi yêu cầu xóa; các ảnh sau đó không còn hai mục này. | Có căn cứ bỏ hai thư mục trong cấu trúc đang minh họa. **Không đồng nghĩa xóa mọi utility và mọi kiểu dữ liệu**. Nếu thực tế có code, phân loại và chuyển về feature hoặc phần dùng chung thích hợp trước khi bỏ thư mục. |
| Cách để component riêng của feature ở ngoài feature | 21:03–21:22. | Bỏ cách đặt sai phạm vi; chuyển component về `features/<feature>/components/`. Không có căn cứ xóa toàn bộ `src/components/` chỉ vì nó đang tồn tại. |
| Cách xem các script kiểm tra hiện tại là bộ test đã hoàn chỉnh | 29:09–30:03: giảng viên nhận xét test đang thấy giống script chạy, yêu cầu tổ chức test/E2E. | Cần chỉnh cách tổ chức và nội dung test. Không nghe thấy chỉ định rõ phải xóa từng file frontend test hiện có. |

**Không có yêu cầu rõ ràng xóa** `assets/`, `public/`, `App.tsx`, `main.tsx`, `index.css`, toàn bộ `src/components/`, hay loại bỏ một feature nghiệp vụ cụ thể. `dist/` và `node_modules/` xuất hiện trên màn hình nhưng không phải đối tượng được kết luận cần xóa từ video.

## 3. Những phần cấu trúc thư mục cần thay đổi

Cây đích minh họa theo những phần giảng viên hướng dẫn; các file router/provider và HTTP client là cách hiện thực đề xuất:

```text
frontend/
├── README.md
├── src/
│   ├── app/                  # router, providers, lắp ghép ứng dụng
│   │   ├── index.ts
│   │   └── README.md
│   ├── features/
│   │   ├── index.ts
│   │   ├── README.md
│   │   └── auth/             # mẫu áp dụng cho các feature khác
│   │       ├── api/
│   │       ├── components/
│   │       ├── hooks/
│   │       ├── pages/
│   │       ├── types.ts
│   │       ├── index.ts
│   │       └── README.md
│   ├── shared/
│   │   ├── api/              # ví dụ http-client.ts
│   │   ├── ui/               # button, input, dialog dùng chung
│   │   ├── style/
│   │   ├── index.ts
│   │   └── README.md
│   ├── assets/               # video không yêu cầu thay đổi
│   ├── components/           # phân loại nội dung trước khi quyết định
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
└── test/
    └── E2E/
        └── auth.e2e.spec.ts  # tên ví dụ, nội dung cần được triển khai
```

- Những feature thấy trên màn hình gồm `analysis`, `auth`, `datasets`, `history`, `offline`, `processing`, `projects`. Hướng dẫn mẫu bằng auth được yêu cầu áp dụng cho các feature; không có yêu cầu bỏ các feature còn lại.
- Để cây dễ đọc, không lặp README và index ở từng thư mục con. Khi triển khai, áp dụng theo hướng dẫn về tài liệu và đầu mối export cho các thư mục code có liên quan.
- Đề xuất triển khai: chỉ export những gì nơi khác cần sử dụng; dùng `export type` cho type và kiểm tra vòng import. Đây là biện pháp kỹ thuật, không phải câu giảng viên đã nói chi tiết.

## 4. Những nguyên tắc tổ chức code giảng viên hướng dẫn

1. **Theo tính năng:** code thuộc auth nằm trong auth; tương tự với các feature khác. API, component, hooks, pages và type phải có phạm vi rõ ràng.
2. **Dùng chung thì đưa về shared:** HTTP nền tảng, UI cơ bản, style chung được quản lý tập trung. Không nhân bản button/input/dialog theo từng feature.
3. **Chiều import được nêu rõ:**

   ```text
   app ───────> features ───────> shared
    └──────────────────────────> shared
   ```

   Hệ quả khi triển khai: tránh để shared phụ thuộc ngược vào features/app. Video không trình bày đầy đủ quy tắc import giữa hai feature.
4. **Export qua index:** giảm việc bên ngoài phải biết đường dẫn sâu bên trong feature/thư mục. Giảng viên gọi đường dẫn là “tuyệt đối” ở một số chỗ; ý thực hành là tránh import đường dẫn dài. Video chưa yêu cầu cấu hình alias cụ thể.
5. **README là tài liệu để hiểu code:** mô tả cấu trúc, chức năng, luồng hoạt động, cách chạy; người làm phải giải thích được phần đã tổ chức, kể cả khi dùng AI hỗ trợ.
6. **Cấu trúc vừa đủ:** giảng viên có nhắc Atomic Design nhưng chỉ hướng dẫn một bộ cấu trúc cơ bản cho nhóm. Không có căn cứ bắt buộc triển khai đủ atoms/molecules/organisms/templates.
7. **Test có tổ chức:** đặt test đúng khu vực, có E2E gắn với feature/luồng; không chỉ có script mang tên test.

## 5. Những phần được nhận xét là đúng hoặc chấp nhận để tiếp tục giữ

| Phần | Căn cứ và mức kết luận |
| --- | --- |
| Hướng chia `features/` theo tính năng | 20:38–20:48: giảng viên nói “OK” khi đến features rồi dùng cấu trúc này để hướng dẫn tiếp. Giữ cách chia feature, bổ sung phần còn thiếu. |
| Bộ nhóm `api`, `components`, `hooks`, `pages` trong feature | 21:03–23:22: được hướng dẫn và tiếp tục dùng làm mẫu. Giữ các vai trò này sau khi chuẩn hóa. |
| Cấu trúc frontend sau phần hướng dẫn | Khoảng 30:09–30:26: chấp nhận tạm thời rồi nhắc quy tắc import. Đây là chấp nhận hướng cấu trúc, không phải xác nhận code đã chạy đúng. |

Không có đủ căn cứ nói giảng viên đã kiểm tra và khen đúng thuật toán, giao diện, hooks, HTTP client, offline engine hoặc test hiện có. Trong phần lớn đoạn góp ý frontend, vùng soạn thảo vẫn đang mở file backend test hoặc các file `types.ts`, `index.ts` vừa tạo và còn rỗng.

## 6. Những nội dung chưa đủ rõ để kết luận

- **`src/components/`:** chưa rõ còn chứa thành phần dùng chung nào sau khi có shared. Cần kiểm kê trước khi chọn chuyển về shared/ui hoặc feature; chưa có lệnh xóa toàn bộ.
- **Type dùng chung thực sự:** giảng viên yêu cầu type riêng nằm trong feature và bỏ types ngoài trong cấu trúc mẫu, nhưng không chốt nơi đặt một type được nhiều feature dùng. Không tự quy thành lệnh nhân bản type.
- **`lib/` có gì:** màn hình không cung cấp đầy đủ nội dung để quyết định đích đến của mọi file hoặc kết luận code trong đó vô dụng.
- **Phạm vi index:** lời hướng dẫn rất rộng, tập trung vào thư mục code frontend. Không đủ căn cứ bắt thêm index vào assets tĩnh, thư mục test, thư mục output hay cấu hình; cũng không đủ căn cứ áp yêu cầu này máy móc sang toàn bộ backend.
- **Router/provider:** chưa chốt tên file, thư viện hoặc phương án định tuyến, quản lý trạng thái.
- **Công cụ E2E và unit test:** chưa chỉ định Playwright/Cypress/Vitest/Jest, trình duyệt, môi trường hoặc mức coverage. Ví dụ tên file không xác nhận công cụ.
- **Kiểu tên E2E:** trên màn hình dùng `E2E`; lời nói dùng end-to-end. Có thể thống nhất quy ước khi triển khai, không coi khác chữ hoa/thường là vi phạm kiến trúc đã chốt.
- **Atomic Design:** có được nhắc nhưng không đủ căn cứ yêu cầu triển khai đầy đủ phân cấp này.
- **README:** yêu cầu tài liệu rộng và được nhắc lại cho frontend; cách liệt kê README cho từng thư mục kỹ thuật phụ chưa được mô tả hết. Giới hạn thực hiện hợp lý là code/tài liệu do nhóm quản lý, không phải dependency hoặc file build.

## 7. Thứ tự thực hiện đề xuất và tiêu chí hoàn thành

Các bước sau là kế hoạch triển khai đề xuất, không phải nguyên văn lời giảng viên:

1. Kiểm kê cấu trúc frontend hiện tại, đánh dấu các yêu cầu trong video đã được thực hiện sau buổi góp ý để tránh làm lại.
2. Chuẩn hóa app và một feature mẫu auth, rồi áp dụng cho các feature còn lại. Chuyển component/type/logic theo đúng phạm vi.
3. Tổ chức shared/api, shared/ui, shared/style; di chuyển code có ích từ lib/types trước khi bỏ các thư mục cũ.
4. Thêm index, cập nhật import, kiểm tra chiều phụ thuộc; không để index tạo vòng import.
5. Viết README thực chất, gắn tài liệu với cách chạy và luồng hoạt động của từng phần.
6. Tổ chức test/E2E; kiểm tra lại các script hiện có trước khi chuyển đổi hoặc loại bỏ. Chưa có chỉ định xóa trắng test.
7. Chạy build/typecheck và test phù hợp của dự án; xác nhận các luồng nghiệp vụ được giữ sau khi di chuyển.

Hoàn thành khi: các feature có cấu trúc nhất quán; shared có trách nhiệm rõ; import đúng chiều; tài liệu đủ giải thích cách hoạt động; test được tổ chức và chạy được; mọi quyết định xóa có căn cứ riêng. Các điểm ở mục 6 cần được giải quyết bằng kiểm kê code hoặc hỏi lại giảng viên trước khi biến thành yêu cầu cứng.
