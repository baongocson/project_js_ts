# Bằng chứng còn thiếu

1. Prompt 03 không được cung cấp. Cần bản gốc để đối chiếu yêu cầu riêng nếu có.
2. Thông tin thành viên, lớp, giảng viên chưa có nguồn được xác minh, không tự điền lên bìa.
3. NFR-18 chưa đạt: cần generator riêng, đo lại đúng điều kiện, phân tích bottleneck có telemetry. Không xóa kết quả fail.
4. LCP/CLS/FPS/offline startup chưa có phép đo chuẩn: cần browser trace và từng lượt theo NFR-20.
5. Backup/RPO/RTO chưa có diễn tập: cần bản sao, restore cô lập và thời gian/RPO được đối chiếu.
6. Production Internet chưa nghiệm thu: cần domain, certificate chain tin cậy, probe ngoài mạng, firewall IPv4/IPv6 và TLS renew.
7. Nginx local mới nghiệm thu chỉ đọc: cần chuỗi login → import → processing → AI trên replica riêng qua Nginx.
8. AI: có k6 warm API/DB/Qwen thật, chưa có full browser → DB thật → Qwen, cold start 3 lần, full multi-batch, tải nhiều người và thẩm định chất lượng.
9. AI Docker có cấu hình nhưng thiếu bằng chứng inference xuyên container. Chi phí AI: Chưa có bằng chứng trong repository.
10. Test: cần full machine-readable logs/report gắn commit cho toàn bộ số đếm trong báo cáo. .last-run chỉ ghi passed/failedTests, không chứng minh số đếm.
11. Chưa kiểm deck bằng Microsoft PowerPoint hoặc thực hành bấm giờ người nói; kết quả QA kỹ thuật được ghi riêng.
