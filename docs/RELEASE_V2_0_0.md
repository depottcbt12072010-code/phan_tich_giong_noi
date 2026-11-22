# VOICE INTELLIGENCE AI V2.0.0 — BẢN TỔNG HỢP CHÍNH THỨC

## Mục tiêu sản phẩm
Một PWA cá nhân tiếp nhận âm thanh, quản lý transcript và phân tích, xây dựng kho tri thức cục bộ, kết nối nội dung qua nhiều bản ghi, theo dõi hành động/tiến triển và tạo báo cáo có nguồn.

## Các năng lực được tích hợp trong bản này
- Ghi âm trình duyệt và nhập tệp âm thanh.
- Lưu bản ghi/audio/transcript trong IndexedDB của trình duyệt.
- Chép lời bằng Gemini theo thao tác chủ động.
- Phân tích từng bản ghi, tìm kiếm cục bộ và gợi ý từ khóa.
- Tổng hợp tri thức liên bản ghi có tham chiếu nguồn.
- Trích xuất và theo dõi quyết định/hành động, không tự đặt người phụ trách/hạn.
- Đối chiếu tiến triển theo khoảng ngày, không tự đổi trạng thái và không coi thiếu đề cập là thất bại.
- Báo cáo dữ liệu cục bộ theo khoảng ngày, chủ đề lặp, tổng thời lượng, transcript, phân tích, hành động và danh mục bản ghi.
- Phân tích báo cáo bằng Gemini theo yêu cầu, xuất báo cáo TXT.
- Sao lưu/khôi phục JSON có dữ liệu âm thanh theo cơ chế hiện có.

## Bảo toàn dữ liệu nâng cấp
V2.0.0 giữ nguyên `DB_NAME='voice-intelligence-ai-v1'`, `DB_VERSION=1`, object store `records` để không tạo kho mới và tránh làm mất dữ liệu IndexedDB của các bản V1. Người dùng nên xuất JSON backup trước khi thay mã nguồn.

## Giới hạn quan trọng
- Đây là PWA browser-local; dữ liệu không tự đồng bộ giữa thiết bị hoặc trình duyệt.
- API key nhập trong trình duyệt không phải secret vault; không commit key lên GitHub.
- Gemini Free Tier có hạn mức và điều khoản riêng; không gửi dữ liệu mật hoặc nhạy cảm.
- Báo cáo keyword là thống kê gợi ý, không phải hiểu biết ngữ nghĩa. AI output cần người dùng kiểm tra với nguồn.
- Không suy luận suy nghĩ riêng, ý định, tính trung thực, chẩn đoán hoặc đặc điểm cá nhân từ giọng nói.

## Kiểm thử kỹ thuật đã thực hiện khi đóng gói
- Kiểm tra cú pháp JavaScript bằng Node.js.
- Kiểm tra ID HTML trùng lặp.
- Kiểm tra các nút báo cáo có ID tương ứng và cache version được cập nhật.

## Chưa thể xác nhận từ môi trường đóng gói
- Chưa chạy UAT trên GitHub Pages đang triển khai của người dùng.
- Chưa kiểm thử microphone/audio codec trên iPhone/Android thực tế.
- Chưa xác minh API key/quota Gemini của tài khoản.
