# Terra Time Calculator - Chrome Extension

🕐 **Extension Chrome để tính toán thời gian làm việc còn thiếu trên hệ thống Terra**

## 📋 Tính năng

- ✅ Phân tích bảng chấm công Terra tự động
- ⏱️ Tính toán thời gian làm việc dự kiến vs thực tế
- 📊 Hiển thị thông tin thống kê chi tiết
- 🎯 Giao diện thân thiện và dễ sử dụng

## 🚀 Cài đặt

### Cách 1: Từ source code (Development)

1. **Tải source code:**
   ```bash
   git clone https://github.com/yourusername/terra-time-calculator.git
   cd terra-time-calculator
   ```

2. **Cài đặt vào Chrome:**
   - Mở Chrome và truy cập: `chrome://extensions/`
   - Bật **Developer mode** ở góc trên bên phải
   - Click **"Load unpacked"** và chọn thư mục source code
   - Extension sẽ được cài đặt và hiển thị icon trên thanh công cụ

### Cách 2: Từ file build (Recommended)

1. **Tải file build:**
   - Tải file `terra-time-calculator.zip` từ thư mục `build/`
   - Hoặc chạy script build: `.\build-extension.ps1`

2. **Cài đặt:**
   - Xem hướng dẫn chi tiết trong file `build/INSTALL.md`
   - Hoặc làm theo hướng dẫn Cách 1 ở trên

### 🔨 Build từ source

Để build extension thành file package:

```powershell
# Chạy script build
.\build-extension.ps1

# File output: build/terra-time-calculator.zip
# Kèm theo: build/INSTALL.md (hướng dẫn cài đặt)
```

## 📖 Hướng dẫn sử dụng

### Bước 1: Mở trang Terra
- Truy cập hệ thống Terra
- Điều hướng đến trang chấm công/timesheet
- Đảm bảo bảng thời gian làm việc đã được hiển thị

### Bước 2: Sử dụng Extension

#### Cách 1: Sử dụng nút trên trang
1. Khi ở trang Terra, sẽ xuất hiện nút **"📊 Tính thời gian còn thiếu"** ở góc trên phải
2. Click vào nút để phân tích bảng

#### Cách 2: Sử dụng popup extension
1. Click vào icon extension trên thanh công cụ Chrome
2. Click nút **"📊 Phân tích"** trong popup
3. Xem kết quả hiển thị

### Bước 3: Xem kết quả
- **Số ngày làm việc:** Tổng số ngày đã làm việc
- **Giờ dự kiến:** Tổng số giờ theo kế hoạch
- **Giờ thực tế:** Tổng số giờ đã làm việc thực tế
- **Thời gian còn thiếu:** Số giờ cần bù thêm (nếu có)

### Bước 4: Xem chi tiết
- Click **"📋 Xem chi tiết"** để xem bảng phân tích chi tiết
- Bảng sẽ hiển thị thông tin từng ngày với thời gian vào/ra và tính toán thiếu/thừa

## 🔧 Cấu trúc dự án

```
terra-time-calculator/
├── manifest.json           # Cấu hình Chrome Extension
├── content.js             # Script phân tích trang Terra
├── popup.html             # Giao diện popup
├── popup.js               # Logic popup
├── styles.css             # CSS cho extension
├── icons/                 # Thư mục chứa icon
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
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
- **Chrome APIs:** tabs, storage, scripting

### Cấu trúc HTML bảng Terra được hỗ trợ
Extension tự động nhận diện bảng có cấu trúc:
```html
<table class="el-table__header">
  <thead>
    <tr>
      <th>Ngày</th>
      <th>Phân loại</th>
      <th colspan="2">Dự kiến</th>
      <th colspan="2">Thực tế</th>
      <th>Giờ làm</th>
      <th>Tăng ca</th>
    </tr>
    <tr>
      <th>Vào</th>
      <th>Ra</th>
      <th>Vào</th>
      <th>Ra</th>
    </tr>
  </thead>
</table>
```

## 🐛 Báo lỗi và góp ý

Nếu bạn gặp lỗi hoặc có ý tưởng cải thiện:

1. **Tạo Issue** trên GitHub repository
2. **Mô tả chi tiết:**
   - Bước tái tạo lỗi
   - Ảnh chụp màn hình (nếu có)
   - Phiên bản Chrome
   - URL trang Terra (nếu được phép)

## 📝 Changelog

### v1.0.0 (2025-08-29)
- ✨ Phiên bản đầu tiên
- 🔍 Tự động nhận diện bảng Terra
- 📊 Tính toán thời gian làm việc
- 🎨 Giao diện popup đẹp mắt

## 🔐 Bảo mật và Quyền riêng tư

- Extension chỉ hoạt động trên trang web bạn đang truy cập
- Không thu thập dữ liệu cá nhân
- Không gửi thông tin về server bên ngoài
- Dữ liệu chỉ được xử lý cục bộ trên trình duyệt

## 📄 Giấy phép

MIT License - Xem file [LICENSE](LICENSE) để biết chi tiết.

## 🤝 Đóng góp

Mọi đóng góp đều được hoan nghênh! Vui lòng:

1. Fork repository
2. Tạo feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Tạo Pull Request

---

**Được phát triển với ❤️ cho cộng đồng Terra**
