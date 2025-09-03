# Terra Time Calculator - Chrome Extension

🕐 **Extension Chrome để tính toán thời gian làm việc còn thiếu trên hệ thống Terra**

## 📋 Tính năng

- ✅ Phân tích bảng chấm công Terra tự động
- ⏱️ Tính toán thời gian làm việc dự kiến vs thực tế
- 📊 Hiển thị thông tin thống kê chi tiết
- 🔧 Logic tính toán thông minh theo quy tắc Terra chính xác
- 🌟 Hỗ trợ nghỉ nửa ngày và các trường hợp đặc biệt

## ✨ Tính năng nổi bật

### 🧠 Logic tính toán thông minh
- **Hybrid Logic:** Kết hợp Dynamic và Fixed để tính chính xác
- **Penalty vào sớm:** Tự động phát hiện vào trước 7:30 và cộng penalty 30p
- **Overtime thông minh:** Chỉ tính thừa giờ >= 30p, làm tròn xuống 15p
- **Phân biệt ca:** Tự động nhận diện ca toàn thời gian vs ca chiều

### 🎯 Hỗ trợ đa dạng
- **Nghỉ nửa ngày:** Tự động phát hiện và tính toán chính xác
- **Tìm bảng thông minh:** Nhiều pattern nhận diện bảng Terra
- **Giao diện responsive:** Hoạt động mượt mà trên popup nhỏ

## 🚀 Cài đặt

### Cách 1: Từ source code (Development)

1. **Tải source code:**
   ```bash
   git clone https://github.com/bqhai199x/terra_tool.git
   cd terra_tool
   ```

2. **Cài đặt vào Chrome:**
   - Mở Chrome và truy cập: `chrome://extensions/`
   - Bật **Developer mode** ở góc trên bên phải
   - Click **"Load unpacked"** và chọn thư mục source code
   - Extension sẽ được cài đặt và hiển thị icon trên thanh công cụ

### Cách 2: Cài đặt từ GitHub Releases

1. **Tải extension:**
   - Truy cập [GitHub Releases](https://github.com/bqhai199x/terra_tool/releases)
   - Tải file `.zip` phiên bản mới nhất
   - Giải nén file

2. **Cài đặt:**
   - Làm theo hướng dẫn Cách 1 ở trên để load unpacked extension

## 📖 Hướng dẫn sử dụng

### Bước 1: Mở trang Terra
- Truy cập hệ thống Terra
- Điều hướng đến trang chấm công/timesheet
- Đảm bảo bảng thời gian làm việc đã được hiển thị

### Bước 2: Sử dụng Extension

**Chỉ sử dụng popup extension:**
1. Click vào icon extension trên thanh công cụ Chrome
2. Extension sẽ tự động kiểm tra xem có bảng Terra trên trang hiện tại không
3. Nếu tìm thấy bảng: Click nút **"📊 Phân tích"** 
4. Nếu chưa tìm thấy bảng: Click nút **"🔍 Quét lại"** để tìm kiếm lại

### Bước 3: Xem kết quả
- **Số ngày làm việc:** Tổng số ngày đã làm việc (bao gồm nghỉ nửa ngày)
- **Phút thiếu:** Tổng số phút thiếu do vào muộn, ra sớm, vào quá sớm
- **Phút thừa:** Tổng số phút thừa do làm overtime (chỉ tính từ 30p trở lên)
- **Kết quả:** Thời gian cần bù thêm hoặc đã đủ/thừa

### Bước 4: Xem chi tiết
- Click **"📋 Xem chi tiết"** để xem bảng phân tích chi tiết
- Bảng sẽ hiển thị thông tin từng ngày với thời gian vào/ra và tính toán thiếu/thừa

## 🔧 Cấu trúc dự án

```
terra_tool/
├── manifest.json           # Cấu hình Chrome Extension
├── content.js             # Script phân tích trang Terra
├── popup.html             # Giao diện popup
├── popup.js               # Logic popup
├── styles.css             # CSS cho extension
├── CALCULATION_RULES.md   # Quy tắc tính toán chi tiết
├── icons/                 # Thư mục chứa icon
│   ├── icon16.png/svg
│   ├── icon32.png/svg
│   ├── icon48.png/svg
│   └── icon128.png/svg
└── README.md              # Tài liệu này
```

## 🛠️ Phát triển

### Yêu cầu hệ thống
- Google Chrome 88+
- Hệ thống Terra có bảng chấm công

### Công nghệ sử dụng
- **Manifest V3** - Chrome Extension API mới nhất
- **Vanilla JavaScript** - Không phụ thuộc framework
- **CSS3** - Styling hiện đại
- **Chrome APIs:** tabs, scripting
- **Logic tính toán:** Hybrid Dynamic + Fixed theo quy tắc Terra

### Quy tắc tính toán
Extension sử dụng logic phức tạp để tính chính xác theo quy định Terra:
- **Thiếu giờ:** Vào muộn sau 8:30, penalty 30p nếu vào trước 7:30
- **Thừa giờ:** Làm sau 17:30 (ca toàn) hoặc 17:00 (ca chiều), chỉ tính từ 30p, làm tròn xuống 15p
- **Logic Hybrid:** Dynamic cho vào sớm (được thưởng), Fixed cho vào muộn (bị phạt)
- **Hỗ trợ nghỉ nửa ngày:** Tự động phát hiện và tính toán chính xác

Chi tiết xem file [CALCULATION_RULES.md](CALCULATION_RULES.md)

### Cấu trúc HTML bảng Terra được hỗ trợ
Extension tự động nhận diện bảng Terra với nhiều pattern khác nhau:
- Tìm bảng có header chứa "Ngày", "Phân loại", "Dự kiến", "Thực tế"
- Hỗ trợ các class `.el-table`, `table`
- Tự động xử lý dữ liệu từ cả text và input fields
- Phát hiện nghỉ nửa ngày (ô ngày trống + phân loại "đi làm")
