# Terra Time Calculator Chrome Extension

Dự án tạo Chrome extension để tính toán thời gian còn thiếu trên hệ thống Terra.

## Yêu cầu dự án
- Chrome extension để phân tích bảng chấm công Terra
- Tính toán thời gian làm việc còn thiếu
- Hiển thị thông tin thời gian thực tế vs dự kiến

## Tiến trình
- [x] Tạo copilot-instructions.md
- [x] Thiết lập cấu trúc dự án Chrome extension
- [x] Tạo manifest.json
- [x] Tạo content script để phân tích HTML table
- [x] Tạo popup UI để hiển thị kết quả
- [x] Viết logic tính toán thời gian
- [x] Tạo file README.md với hướng dẫn chi tiết
- [ ] Tạo icon cho extension
- [ ] Test extension trên trang Terra thực tế

## Tính năng đã hoàn thành
1. **manifest.json** - Cấu hình Chrome Extension Manifest V3
2. **content.js** - Script phân tích bảng Terra với các tính năng:
   - Tự động nhận diện bảng chấm công Terra (cải tiến)
   - Trích xuất dữ liệu từ HTML table (linh hoạt hơn)
   - **LOGIC MỚI:** Tính toán thời gian theo quy tắc Terra chính xác
     * Thiếu giờ: Vào muộn sau 8:30, penalty 30p nếu vào trước 7:30
     * Thừa giờ: Làm sau 17:30 (ca toàn) hoặc 17:00 (ca chiều), làm tròn 15p
     * Phân biệt ca toàn thời gian vs ca chiều
   - Hiển thị kết quả trong modal đẹp mắt
3. **popup.html/js** - Giao diện popup extension với:
   - Kiểm tra trang Terra (cải tiến)
   - Nút "Quét lại" để tìm bảng
   - Nút Debug để phân tích tables
   - Hiển thị thống kê theo logic mới
4. **styles.css** - CSS styling hoàn chỉnh
5. **README.md** - Tài liệu hướng dẫn đầy đủ
6. **CALCULATION_RULES.md** - Quy tắc tính toán chi tiết

## Cách sử dụng
1. Load extension vào Chrome (chrome://extensions/)
2. Mở trang chấm công Terra
3. Click nút "📊 Tính thời gian còn thiếu" hoặc dùng popup extension
4. Xem kết quả phân tích qua nút "📋 Chi tiết"
