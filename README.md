# Terra Time Calculator - Chrome Extension

🕐 **Extension Chrome tính toán thời gian làm việc còn thiếu trên hệ thống Terra**

## 📋 Tính năng

- ✅ Phân tích bảng chấm công Terra tự động
- ⏱️ Tính toán thời gian làm việc dự kiến vs thực tế
- 📊 Hiển thị thông tin thống kê chi tiết
- �️ **Nhóm theo tuần:** Tự động nhóm và tính tổng thiếu/dư/net theo từng tuần
- �🔧 Logic tính toán thông minh theo quy tắc Terra chính xác
- 🌟 Hỗ trợ nghỉ nửa ngày và các trường hợp đặc biệt- ⏰ **Hỗ trợ làm bù:** Tự động tính và hiển thị giờ làm bù
- 🏖️ **Theo dõi nghỉ phép:** Thống kê số ngày nghỉ phép năm, nghỉ lễ- ⚙️ **Cấu hình linh hoạt:** Tùy chỉnh giờ làm việc và quy tắc làm bù

## ✨ Tính năng nổi bật

### 🧠 Logic tính toán thông minh
- **Hybrid Logic:** Kết hợp Dynamic và Fixed để tính chính xác
- **Làm bù thông minh:** Làm bù có thể cấu hình (mặc định ≥30p, làm tròn 15p)
- **Phân biệt ca:** Tự động nhận diện ca toàn thời gian vs nửa ngày
- **Cấu hình linh hoạt:** Điều chỉnh giờ làm việc và quy tắc làm bù theo nhu cầu

### 🎯 Hỗ trợ đa dạng
- **Nghỉ nửa ngày:** Tự động phát hiện và tính toán chính xác
- **Nhóm theo tuần:** Tự động nhóm dữ liệu theo tuần (Thứ 2 - Chủ nhật), hiển thị tổng thiếu/dư và net mỗi tuần
- **Tìm bảng thông minh:** Nhiều pattern nhận diện bảng Terra
- **Giao diện responsive:** Hoạt động mượt mà trên popup nhỏ
- **URL validation:** Chỉ hoạt động trên trang Terra chính thức

### ⚙️ Hệ thống cấu hình
- **Giờ làm việc:** Tùy chỉnh ca đầy đủ (4-12 giờ), ca nửa ngày tự động = ca đầy đủ/2
- **Quy tắc làm bù:** Cấu hình thời gian tối thiểu (1-120 phút) và khoảng làm tròn (1-60 phút)
- **Lưu trữ bền vững:** Cấu hình được lưu trong localStorage của trình duyệt

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
3. Nếu chưa tìm thấy bảng: Click nút **"🔍 Quét lại"** để tìm kiếm lại

### Bước 3: Xem kết quả
- **Số ngày làm việc:** Tổng số ngày đã làm việc (bao gồm nghỉ nửa ngày)
- **Nghỉ phép:** Số ngày nghỉ phép năm, nghỉ lễ
- **Phút thiếu:** Tổng số phút thiếu do vào muộn, ra sớm
- **Phút làm bù:** Tổng số phút làm bù (tùy theo cấu hình)
- **Giờ làm bù:** Tổng giờ làm bù được tính từ các dòng "Làm bù"
- **Kết quả:** Thời gian cần bù thêm hoặc đã đủ/thừa (sau khi trừ cả giờ làm bù)

### Bước 4: Cấu hình (tùy chọn)
- Click **"⚙️ Cấu hình"** để tùy chỉnh:
  - **Giờ làm ca đầy đủ:** Từ 4-12 giờ (mặc định 8 giờ)
  - **Làm bù tối thiểu:** Từ 1-120 phút (mặc định 30 phút)
  - **Làm tròn làm bù:** Từ 1-60 phút (mặc định 15 phút)
- Cấu hình được lưu tự động và áp dụng cho các lần sử dụng sau

### Bước 5: Xem chi tiết
- Click **"📋 Xem chi tiết"** để xem bảng phân tích chi tiết
- Bảng sẽ hiển thị thông tin từng ngày với thời gian vào/ra và tính toán thiếu/thừa
- **Tính năng nhóm theo tuần:**
  - Dữ liệu được tự động nhóm theo tuần (Thứ 2 - Chủ nhật)
  - Mỗi tuần hiển thị:
    - **Thiếu:** Tổng phút thiếu trong tuần
    - **Dư:** Tổng phút làm bù trong tuần
    - **Net:** Kết quả ròng (Thiếu - Dư)
      - Đỏ: còn thiếu (âm)
      - Xanh: đã đủ/thừa (dương)
- **Hiển thị đặc biệt:**
  - Dòng "Làm bù" được đánh dấu màu xanh dương với giờ làm bù (+0.5h, +1h, etc.)
  - Dòng "Nghỉ phép" được đánh dấu màu cam
  - Dòng "Đi làm" bình thường hiển thị thời gian vào/ra và tính toán thiếu/thừa

## 🔧 Cấu trúc dự án

```
terra_tool/
├── manifest.json          # Cấu hình Chrome Extension
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
- **Thiếu giờ:** Vào muộn sau flexible range, về sớm hơn giờ chuẩn
- **Thừa giờ:** Làm thêm sau giờ chuẩn, có thể cấu hình ngưỡng tối thiểu và khoảng làm tròn
- **Logic Hybrid:** Dynamic cho vào trong flexible range, penalty cho vào muộn
- **Hỗ trợ nghỉ nửa ngày:** Tự động phát hiện và tính toán chính xác
- **Cấu hình linh hoạt:** Người dùng có thể tùy chỉnh giờ làm việc và quy tắc làm bù

Chi tiết xem file [CALCULATION_RULES.md](CALCULATION_RULES.md)

### Cấu trúc HTML bảng Terra được hỗ trợ
Extension tự động nhận diện bảng Terra với nhiều pattern khác nhau:
- Tìm bảng có header chứa "Ngày", "Phân loại", "Dự kiến", "Thực tế"
- Hỗ trợ các class `.el-table`, `table`
- Tự động xử lý dữ liệu từ cả text và input fields
- Phát hiện nghỉ nửa ngày (ô ngày trống + phân loại "đi làm")
