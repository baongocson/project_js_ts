# Kịch bản thuyết trình

Đã đọc nội dung và notes từ **PPTX xuất thực tế** trong output và đối chiếu đúng 33 tiêu đề/thứ tự. SHA-256: c6486a6746903da8d9923c928e0b549c6100c512d0e07dc10c638c74b58426b3.

Mục tiêu luyện nói **14:15**, dự phòng 45 giây trong khung 15:00. Đây là thời lượng phân bổ, chưa phải kết quả bấm giờ một người nói. Có khoảng 2621 đơn vị tách bằng khoảng trắng, tương đương 3.07 đơn vị/giây, không quy đổi máy móc thành từ ngôn ngữ học. Ưu tiên tập slide 24–25.

## Slide 1. Dashboard 3D

**Thời lượng: 18 giây** (khung 20 giây).

Em kính chào thầy cô. Nhóm em xin trình bày đồ án Dashboard 3D, một ứng dụng web hỗ trợ phân tích và tiền xử lý dữ liệu CSV. Trong phần báo cáo này, em tập trung vào cách hệ thống kiểm soát thay đổi dữ liệu và bằng chứng kiểm thử hiện có. Trước hết là bài toán nhóm em giải quyết.

## Slide 2. Bài toán dữ liệu trước phân tích

**Thời lượng: 23 giây** (khung 25 giây).

Dữ liệu đầu vào có thể thiếu giá trị, lặp dòng hoặc chứa ngoại lai. Nếu sửa thẳng trên tệp, người dùng khó biết bước nào đã làm dữ liệu thay đổi. Đây là phân tích bài toán trong tài liệu, chưa phải kết quả khảo sát người dùng. Vì vậy, nhóm em chọn cách cho xem trước tác động và giữ lại các phiên bản. Phần tiếp theo xác định phạm vi.

## Slide 3. Mục tiêu và phạm vi

**Thời lượng: 23 giây** (khung 25 giây).

Mục tiêu là hoàn thành một chuỗi làm việc trong cùng workspace, từ nhập CSV đến xem kết quả và khôi phục. Mỗi project hiện có một dataset. Giới hạn tệp là mười sáu triệu byte, khác với dung lượng snapshot sau xử lý. Nhóm em chưa triển khai chia sẻ project hoặc huấn luyện mô hình. Các tác nhân của hệ thống được thể hiện ở sơ đồ sau.

## Slide 4. Tác nhân và Use Case

**Thời lượng: 23 giây** (khung 25 giây).

Ở sơ đồ này, người dùng online đăng nhập và thao tác trên project thuộc quyền sở hữu của mình. Nhánh local phục vụ lưu và xử lý trên trình duyệt. Ollama là dịch vụ hỗ trợ gợi ý, còn quyết định áp dụng vẫn thuộc người dùng. Vai trò vận hành chỉ cấu hình hạ tầng, không suy ra một quyền quản trị nghiệp vụ trong ứng dụng. Em minh họa trước bằng ca nhập CSV.

## Slide 5. Use Case nhập CSV

**Thời lượng: 23 giây** (khung 25 giây).

Ca sử dụng này bắt đầu khi người dùng chọn project và tệp CSV. Backend kiểm tra đầu vào, phân tích dữ liệu có kiểu rồi tạo snapshot đầu tiên. Response trả metadata và mã thao tác để giao diện tải dữ liệu. Nếu tệp vượt giới hạn hoặc yêu cầu xung đột, hệ thống trả lỗi rõ ràng. Em chuyển sang ca xử lý có hai bước Preview và Apply.

## Slide 6. Use Case Preview–Apply

**Thời lượng: 28 giây** (khung 30 giây).

Người dùng chọn một phương pháp và phạm vi xử lý. Preview tạo bản kết quả dự kiến để người dùng so sánh trước và sau. Chỉ khi người dùng bấm Apply, hệ thống mới công bố phiên bản. Những trường hợp không hợp lệ, không có thay đổi, hết hạn hoặc dựa trên bản nền cũ đều bị chặn. Đây là nghiệp vụ em sẽ truy vết chi tiết ở phần workflow. Trước đó là các yêu cầu phi chức năng.

## Slide 7. Yêu cầu phi chức năng

**Thời lượng: 23 giây** (khung 25 giây).

Bảng yêu cầu phân biệt phiên đăng nhập với người đang thao tác tích cực. Mục tiêu tải API thường là mười request mỗi giây trong mười phút. Chỉ tiêu trình duyệt và mục tiêu phục hồi cũng có điều kiện đo riêng. Em nhấn mạnh đây là yêu cầu, chưa phải tất cả đều đã đạt. Kết quả đo thực tế sẽ nằm ở phần cuối. Tiếp theo là luồng người dùng và các nhánh lỗi.

## Slide 8. Luồng người dùng và nhánh lỗi

**Thời lượng: 23 giây** (khung 25 giây).

Thầy cô có thể đọc luồng chính theo hàng ngang. Khi hết phiên, giao diện cần khôi phục xác thực. Nếu nhập CSV thất bại thì người dùng sửa tệp trước khi tiếp tục. Ở bước Apply, conflict dẫn đến tải lại trạng thái và tạo preview phù hợp, thay vì ghi đè dữ liệu. Như vậy nhánh lỗi là một phần của luồng sử dụng. Em chuyển sang kiến trúc tổng thể.

## Slide 9. Kiến trúc tổng thể

**Thời lượng: 28 giây** (khung 30 giây).

Kiến trúc hiện tại gồm frontend React, backend NestJS và MongoDB có hỗ trợ transaction. Trình duyệt gọi API, không truy cập database trực tiếp. Backend tổ chức theo mô đun trong cùng một ứng dụng. Ollama chỉ tham gia khi người dùng yêu cầu gợi ý AI. Nhánh offline dùng lưu trữ trình duyệt và sẽ được giải thích riêng. Một điểm dùng chung giữa hai phía là data-core.

## Slide 10. Data Core dùng chung

**Thời lượng: 23 giây** (khung 25 giây).

Data-core chứa thuật toán và hợp đồng dữ liệu dùng chung. Backend chạy trên snapshot server, trong khi chế độ local gọi cùng engine trên snapshot trình duyệt. Tài liệu hiện hành có hai mươi tám phương pháp, gồm sửa ô và TF-IDF. Khi đối chiếu online với offline, cần cùng dữ liệu, specification và engine tương thích. Cách tổ chức này liên quan trực tiếp đến mô hình lưu trữ sau đây.

## Slide 11. MongoDB và 12 collection

**Thời lượng: 28 giây** (khung 30 giây).

Sơ đồ này tóm tắt đủ mười hai collection từ hợp đồng đang có trong mã nguồn. Nhánh bên trái quản lý người dùng và phiên. Nhánh trung tâm là project, dataset và các version. Mỗi version có schema cột và các chunk nhị phân. Preview lưu thay đổi dự kiến, operation lưu thao tác đã thực hiện, còn receipt hỗ trợ chống lặp. Các đường nối biểu diễn tham chiếu logic, không phải khóa ngoại do MongoDB tự cưỡng chế.

## Slide 12. Schema và index

**Thời lượng: 23 giây** (khung 25 giây).

Các ví dụ index ở đây đều có trong collection-contracts. Unique của workspace và dataset phản ánh ràng buộc theo project. Chunk có thứ tự riêng trong từng version. Với version đã công bố, cặp dataset và số phiên bản phải duy nhất. Schema và index được provision có kiểm soát rồi xác minh lúc khởi động. Index trên metadata không đồng nghĩa có index trực tiếp cho từng giá trị ô nhị phân. Em nói rõ hơn về version ở slide sau.

## Slide 13. Vòng đời phiên bản

**Thời lượng: 29 giây** (khung 30 giây).

Theo sơ đồ, hệ thống chuẩn bị candidate trước khi công bố. CAS có nghĩa là chỉ cập nhật nếu phiên bản và revision vẫn đúng như lúc bắt đầu. Transaction ngắn giúp cập nhật head, lịch sử và receipt cùng nhau. Khi Restore, hệ thống tạo một version mới từ bản được chọn để giữ lịch sử. Nó không sửa ngược snapshot đã published. Sau đây là hợp đồng API thực sự sử dụng cho Preview.

## Slide 14. API Preview và Apply

**Thời lượng: 29 giây** (khung 30 giây).

Hai endpoint trên có trong controller và API client. Ví dụ bên phải dùng ký hiệu thay ID, nên đây là minh họa hợp đồng, không phải response thu trực tiếp từ tài khoản. Preview nhận bản nền và specification. Apply chỉ nhận previewId, còn server lấy candidate đã chuẩn bị. Response thành công có operation và head mới của dataset. Mã lỗi giúp frontend phân biệt xung đột với hết hạn. Em chuyển sang phần AI.

## Slide 15. Luồng gợi ý AI local

**Thời lượng: 29 giây** (khung 30 giây).

Nhìn vào sơ đồ, backend kiểm quyền rồi đọc snapshot published. Code tính thống kê và tạo các ứng viên trước khi gọi Qwen3. Mô hình xếp hạng ứng viên, sau đó backend kiểm output và chạy thử bằng data-core. Người dùng vẫn cần xem Preview và quyết định Apply. Các gợi ý chỉ tồn tại trong response và state giao diện. Phần tiếp theo nêu dữ liệu gửi model và giới hạn vận hành.

## Slide 16. Dữ liệu và giới hạn AI

**Thời lượng: 24 giây** (khung 25 giây).

Ollama nhận thống kê và thông tin ứng viên, không nhận tên cột hay nội dung ô. Giao diện gọi tiếp các batch để xét hết ứng viên và báo chưa hoàn tất nếu dừng hoặc lỗi. Giới hạn một inference áp dụng cho từng process backend. Gợi ý không có collection lưu riêng. Repository chưa có bằng chứng tính chi phí vận hành, nên em không đưa con số chi phí. Sau đây là giao diện thật từ bộ kiểm thử.

## Slide 17. Đăng nhập và khôi phục phiên

**Thời lượng: 19 giây** (khung 20 giây).

Đây là ảnh giao diện đăng nhập từ bộ acceptance, không phải bản dựng minh họa. Router bảo vệ trang project và hồ sơ. Các request cần xác thực dùng access token, còn cơ chế refresh dùng cookie bảo vệ ở phía trình duyệt. Ảnh này minh họa bố cục và đường vào ứng dụng, không tự chứng minh toàn bộ bảo mật. Tiếp theo là workspace phân tích.

## Slide 18. Workspace phân tích dữ liệu

**Thời lượng: 19 giây** (khung 20 giây).

Ảnh này cho thấy phần Collection trong workspace. Người dùng xem bảng và thống kê trước khi chọn một nhóm xử lý. Điểm quan trọng là phân trang hoặc lọc bảng không đổi tập dữ liệu dùng tính thống kê toàn phiên bản. Fixture trong ảnh là dữ liệu kiểm thử để kiểm chức năng, không phải số liệu nghiên cứu. Em chuyển sang bản xem trước thay đổi.

## Slide 19. Giao diện Preview trước và sau

**Thời lượng: 24 giây** (khung 25 giây).

Ảnh được cắt từ screenshot thật ở vùng Preview. Fixture có hai giá trị chữ thường và phương pháp uppercase đổi chúng thành chữ hoa. Giao diện cho thấy số ô đổi, trạng thái và bảng trước sau. Con số hai ở đây chỉ mô tả fixture, không phải kết quả đo chất lượng dữ liệu thực tế. Người dùng đọc phần này trước khi bấm Apply. Một cách khảo sát khác là không gian 3D.

## Slide 20. Không gian 3D và lựa chọn điểm

**Thời lượng: 19 giây** (khung 20 giây).

Phần 3D cho phép chọn ba cột số làm trục và chọn một điểm để truy về dòng dữ liệu. Hệ thống thông báo số điểm hiển thị, điểm thiếu tọa độ và việc lấy mẫu. Khi không dùng được WebGL, giao diện có phương án hình chiếu tương thích. Ảnh này minh họa chức năng, chưa phải bằng chứng đạt ba mươi FPS. Em chuyển sang cấu trúc frontend.

## Slide 21. Cấu trúc frontend

**Thời lượng: 24 giây** (khung 25 giây).

Frontend chia app, features và shared. App ghép các tính năng thành trang. Mỗi feature giữ API, hook và component của nghiệp vụ đó. Shared cung cấp các phần dùng chung. Sơ đồ thể hiện chiều phụ thuộc đã có kiểm tra tự động, giúp tránh feature kéo ngược app hoặc tạo vòng import. Em lấy nhóm processing làm ví dụ xuyên suốt ở phần workflow. Trước đó là cách giao diện thể hiện trạng thái.

## Slide 22. Thiết kế UI và hiệu suất frontend

**Thời lượng: 24 giây** (khung 25 giây).

Giao diện dùng token cho màu, khoảng cách và các trạng thái tương tác. Apply bị khóa khi preview không còn phù hợp hoặc đang xử lý. Báo cáo build ghi chunk WebGL khoảng chín trăm năm mươi tám kilobyte, tải động và không nằm trong preload của entry đăng nhập. Service worker vẫn có thể cache nền để dùng offline. Các dữ kiện đó chưa thay cho phép đo LCP, CLS hoặc FPS. Tiếp theo là cấu trúc backend.

## Slide 23. Cấu trúc backend

**Thời lượng: 24 giây** (khung 25 giây).

Backend dùng mô hình modular monolith. Controller chuyển request đã kiểm tra sang service. Service điều phối nghiệp vụ, repository làm việc với database. Các phần auth, ownership và hạ tầng dùng chung giữ những ràng buộc xuyên mô đun. Cách chia này có thể thấy trực tiếp trong file controller, service và repository của processing. Em sẽ lần theo một thao tác cụ thể ngay sau đây.

## Slide 24. Sequence Preview–Apply xuyên suốt

**Thời lượng: 49 giây** (khung 50 giây).

Em xin dành thêm thời gian cho sơ đồ này. Khi bấm Xem trước, useProcessing tạo specification và giữ một khóa idempotency cho cùng yêu cầu. onlineProcessing chuyển tiếp sang processingApi rồi gửi POST previews. Controller gọi createPreview. Service kiểm quyền, đọc snapshot, chạy data-core và chuẩn bị candidate. Repository lưu preview, diff và receipt. Response hai không một trả về, frontend gọi GET preview để hiển thị so sánh. Khi bấm Apply, frontend gửi previewId với khóa riêng. Backend kiểm trạng thái và bản nền, rồi publish trong transaction. Response mang head mới về giao diện. Sau đó onApplied gọi load để tải lại project, metadata và rows. Các lỗi được ném về work và hiển thị tại UI, không báo thành công giả. Slide tiếp theo tập trung vào transaction Apply.

## Slide 25. Apply, retry và xung đột

**Thời lượng: 39 giây** (khung 40 giây).

Với Apply, service kiểm quyền rồi claim receipt trước khi kiểm preview cho yêu cầu mới. Nếu thao tác trước đã commit nhưng response bị mất, cùng key có thể nhận lại kết quả đã ghi. Với thao tác mới, publishCandidate kiểm CAS, markApplied đánh dấu preview và history được append trong cùng transaction với receipt. Nếu một bước thất bại thì transaction rollback. UI giữ key để kiểm tra lại, đồng thời chặn việc điều hướng có thể làm mất ngữ cảnh. Đây là lý do receipt và version cùng xuất hiện trong thiết kế. Em chuyển sang nhánh offline.

## Slide 26. Offline và đồng bộ

**Thời lượng: 29 giây** (khung 30 giây).

Ở nhánh offline, data-core chạy trong trình duyệt và dữ liệu nằm trong IndexedDB. Khi có mạng, bộ đồng bộ xác nhận tài khoản, ánh xạ ID và kiểm head trước khi replay thao tác. Nếu phát hiện conflict thì giữ bản local và dừng. Lần mở offline đầu tiên cần app đã được tải và cache trước đó. Xóa storage trình duyệt cũng xóa dữ liệu local. Sau đây là bằng chứng kiểm thử.

## Slide 27. Kiểm thử và mức bằng chứng

**Thời lượng: 29 giây** (khung 30 giây).

Repository có test unit, HTTP, integration và browser. Các số trên được trích theo từng báo cáo, có phạm vi và thời điểm khác nhau, nên em không cộng thành tổng mới nhất. Acceptance nghiệp vụ dùng HTTPS và MongoDB replica tạm. Một số test UI dùng fixture hoặc giả lập có nêu rõ. File last-run đang ghi passed nhưng không chứa đủ số lượng từng test, nên mức chứng cứ cần được đọc cùng báo cáo. Nhóm em chưa chạy lại các bộ test ứng dụng trong lần soạn slide này. Tiếp theo là đóng gói.

## Slide 28. Docker và Nginx local

**Thời lượng: 29 giây** (khung 30 giây).

Sơ đồ triển khai thể hiện frontend là các file tĩnh trong container Nginx, không phải một container React riêng. Nginx kết thúc HTTPS và proxy API sang backend nội bộ. MongoDB chạy replica set, còn các volume giữ database và tệp gốc. Báo cáo có kiểm health, trang đăng nhập và reload đường dẫn SPA ở local. Kiểm tra này không đăng nhập hay upload, nên em không suy rộng thành nghiệm thu toàn nghiệp vụ qua Nginx.

## Slide 29. Bảo mật và triển khai công khai

**Thời lượng: 24 giây** (khung 25 giây).

Mã nguồn có kiểm JWT gắn với session, quyền sở hữu tài nguyên và cookie refresh bảo vệ. Với production, Compose chỉ publish cổng bốn bốn ba và cần domain cùng chứng chỉ thật. Repository chưa chứng minh hệ thống đã phục vụ công khai trên Internet. Báo cáo còn nêu MongoDB chưa bật authentication và cần đánh giá trusted proxy khi rate limit sau Nginx. Đây là phần phải hoàn thiện trước khi vận hành dữ liệu thực. Sau đây là số đo k6.

## Slide 30. k6 tải API chưa đạt NFR-18

**Thời lượng: 34 giây** (khung 35 giây).

Đây là kết quả lần chạy lại, giữ nguyên ngưỡng yêu cầu. Request đã gửi đều thành công, nhưng chỉ đạt khoảng chín phẩy ba chín ba request mỗi giây và có ba trăm năm mươi bảy lượt bị bỏ lỡ. Hai nhóm project và workspace còn vượt ngưỡng p95 một giây. Vì vậy lỗi không phần trăm không có nghĩa đã đạt tải. Bộ đo chạy các thành phần trên cùng máy, không đi qua Nginx và chưa xác định nguyên nhân nghẽn. Em tiếp tục với profile dữ liệu và AI.

## Slide 31. k6 dữ liệu và AI warm

**Thời lượng: 29 giây** (khung 30 giây).

Profile dữ liệu hoàn tất hai mươi workflow và đạt cả mười hai nhóm ngưỡng trong lượt đo này. Fixture có mười nghìn dòng, hai mươi cột, khoảng không phẩy bảy tám megabyte. Import bao gồm cả upload. Profile AI gọi Qwen thật sau warmup, qua auth và MongoDB, đạt p95 năm phẩy tám một một giây cho Missing batch không. Kết quả đó chưa bao phủ cold start, nhiều batch hoặc chất lượng khuyến nghị. Cuối cùng là kết quả và hướng tiếp theo.

## Slide 32. Kết quả, hạn chế và hướng phát triển

**Thời lượng: 24 giây** (khung 25 giây).

Kết quả chính là chuỗi thao tác có version và kiểm soát trước khi ghi dữ liệu. Hệ thống cũng có nhánh local và gợi ý AI. Tuy nhiên các bằng chứng hiện còn khác nhau về phạm vi. Nhóm em ưu tiên phép đo tải có máy phát riêng, chỉ số trình duyệt và diễn tập backup trước khi mở rộng. AI cần kiểm cold start và nhiều người dùng, còn deploy công khai cần nghiệm thu riêng. Em xin kết luận.

## Slide 33. Kết luận

**Thời lượng: 19 giây** (khung 20 giây).

Qua đồ án này, nhóm em xây dựng một workspace để người dùng xem dữ liệu, thử thay đổi rồi mới công bố phiên bản. Data-core dùng chung hỗ trợ online và local, còn backend kiểm quyền và tính nhất quán khi ghi. Nhóm em trình bày kết quả theo đúng phạm vi bằng chứng và đã xác định các phép đo còn thiếu. Em xin cảm ơn thầy cô đã lắng nghe và xin nhận câu hỏi.
