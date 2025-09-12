# TERRA TIME CALCULATION RULES

## 📋 Quy tắc tính toán thời gian chấm công Terra

### ⚙️ Hệ thống cấu hình linh hoạt

Extension hỗ trợ cấu hình các tham số chính:

#### 🕐 Cấu hình giờ làm việc
- **Ca đầy đủ:** 4-12 giờ (mặc định: 8 giờ = 480 phút)
- **Ca nửa ngày:** Tự động = Ca đầy đủ ÷ 2 (mặc định: 4 giờ = 240 phút)
- **Nghỉ trưa:** Cố định 1 giờ (12:00-13:00) cho ca toàn thời gian

#### ⏰ Cấu hình làm bù
- **Thời gian tối thiểu:** 1-120 phút (mặc định: 30 phút)
- **Khoảng làm tròn:** 1-60 phút (mặc định: 15 phút)
- **Quy tắc:** Chỉ tính làm bù khi >= thời gian tối thiểu, làm tròn xuống theo khoảng đã cấu hình

#### 💾 Lưu trữ cấu hình
- Cấu hình được lưu trong localStorage của trình duyệt
- Tự động khôi phục khi sử dụng extension
- Có thể reset về mặc định bất kỳ lúc nào

### ⏰ Khung giờ làm việc chuẩn (theo cấu hình)
- **Ca sáng:** 08:30 - 12:30 (theo cấu hình ca nửa ngày, **TỰ ĐỘNG TRỪ** khoảng 12:00-13:00 nếu làm qua)
- **Ca chiều:** 13:00 - 17:00 (theo cấu hình ca nửa ngày)  
- **Ca toàn thời gian:** 08:30 - 17:30 (theo cấu hình ca đầy đủ, **TỰ ĐỘNG TRỪ** nghỉ trưa 12:00-13:00)
- **⚠️ Lưu ý:** Thời gian 12:00-13:00 **KHÔNG TÍNH** vào giờ làm việc cho TẤT CẢ các ca
- **🔧 Cấu hình:** Giờ làm việc có thể điều chỉnh trong phần cấu hình extension

### 🔍 Quy tắc xác định loại ca
- **Ca sáng:** Vào và ra đều **trước 13:00**
- **Ca chiều:** Vào **sau 12:00** (bất kể giờ ra)
- **Ca toàn thời gian:** Vào **trước 13:00** và ra **sau 13:00**

### 🔴 Quy tắc tính THIẾU GIỜ (Logic Hybrid: Dynamic + Fixed)

#### Nguyên tắc: Giờ ra chuẩn phụ thuộc vào việc vào trong khung flexible hay muộn
1. **Khung flexible:** Ca sáng 7:30-8:00, Ca chiều 13:00-13:30, Ca toàn 7:30-8:30
2. **Vào trong khung flexible** → Dynamic: Giờ ra = Giờ vào + thời gian làm
3. **Vào muộn ngoài khung flexible** → Dynamic: Giờ ra = Giờ vào + thời gian làm (có tính penalty vào muộn)
4. **Ra sớm trước giờ ra chuẩn** → Tính thiếu theo phút ra sớm
5. **Vào trước 07:30** → Penalty 30 phút
6. **⚠️ Ca chiều**: Chỉ tính thời gian từ 13:00 trở đi, không tính trước 13:00
7. **⚠️ Tất cả các ca**: Tự động loại trừ khoảng 12:00-13:00 khi tính thời gian làm việc

#### Điều kiện:
- **Ca sáng:** Flexible 07:30-08:00 → Giờ kết thúc theo cấu hình (chỉ làm buổi sáng)
- **Ca chiều:** Flexible 13:00-13:30 → Giờ kết thúc theo cấu hình (chỉ làm buổi chiều, bắt đầu từ 13:00)
- **Ca toàn thời gian:** Flexible 07:30-08:30 → Giờ kết thúc theo cấu hình (làm cả ngày, trừ nghỉ trưa)
- **Làm bù:** Theo cấu hình (mặc định ≥30p, làm tròn 15p)

#### 2. Các trường hợp cụ thể

##### Ca sáng (Logic Hybrid - Khung flexible 7:30-8:00)
- **Ví dụ 1:** 07:25 → 12:40 (trong khung flexible)
  - Vào trong khung: flex từ 7:30, Làm thực tế: theo cấu hình ca nửa ngày, Thừa: tùy theo cấu hình làm bù ✅
- **Ví dụ 2:** 07:55 → 11:55 (trong khung flexible)
  - Vào trong khung: 0p thiếu, Ra chuẩn: theo cấu hình (7:55 + giờ ca nửa ngày), Ra đúng → **Không thiếu** ✅
- **Ví dụ 3:** 08:05 → 12:35 (ngoài khung flexible)
  - Vào muộn: 5p (sau 8:00), Làm thực tế: 3h55p (8:05→12:00), Thừa: 5p (12:30→12:35) → **Thiếu 5p** ❌

##### Ca chiều (Logic Hybrid - Khung flexible 13:00-13:30)
- **Ví dụ 1:** 13:15 → 17:20 (trong khung flexible)
  - Vào trong khung: 0p thiếu, Ra chuẩn: 17:15 (13:15 + 4h), Ra muộn: 5p → **Không thiếu** ✅
- **Ví dụ 2:** 13:35 → 17:30 (ngoài khung flexible)
  - Vào muộn: 5p (sau 13:30), Làm thực tế: 3h55p (13:35→17:30), Ra muộn hơn 17:00 → **Thiếu 5 phút** ❌

##### Ca toàn thời gian (Logic Hybrid - Khung flexible 7:30-8:30)
- **Ví dụ 1:** 07:25 → 16:40 (trong khung flexible)
  - Vào trong khung: flex từ 7:30, Ra chuẩn: 16:30 (7:30 + 9h), Ra muộn: 10p → **Đủ giờ** ✅
- **Ví dụ 2:** 08:15 → 17:15 (trong khung flexible)
  - Vào trong khung: 0p thiếu, Làm thực tế: 8h (9h - 1h nghỉ trưa), Ra chuẩn: 17:15 → **Không thiếu** ✅
- **Ví dụ 3:** 08:35 → 17:32 (ngoài khung flexible)
  - Vào muộn: 5p (sau 8:30), Làm thực tế: 7h57p (8h57p - 1h nghỉ trưa), Ra muộn: 2p → **Thiếu 5p** ❌

### 🟢 Quy tắc tính THỪA GIỜ (Làm bù)

#### 1. Ca sáng (vào và ra trước 13:00)
- **Điều kiện:** Thời gian vào < 13:00 VÀ thời gian ra < 13:00
- **Giờ vào chuẩn:** 08:30
- **Giờ ra chuẩn:** 12:30 (làm 4 tiếng)
- **Cách tính thời gian:** Chỉ tính đến 12:00, phần sau 12:00 tính thừa
- **Cách tính thừa:** Làm sau 12:30, **CHỈ TÍNH KHI >= 30 PHÚT**, cứ 15 phút làm tròn xuống
- **Ví dụ:**
  - 08:00 → 12:45: Làm 4h (8:00→12:00) + Thừa 15p (12:30→12:45) → **KHÔNG TÍNH** (< 30p)
  - 08:00 → 12:50: Làm 4h (8:00→12:00) + Thừa 20p (12:30→12:50) → **KHÔNG TÍNH** (< 30p)  
  - ⚠️ **Lưu ý:** Ra sau 13:00 sẽ thành "Ca toàn thời gian", không phải ca sáng

#### 2. Ca chiều (vào sau 12:00)
- **Điều kiện:** Thời gian vào > 12:00
- **Giờ vào chuẩn:** 13:00 
- **Giờ ra chuẩn:** 17:00
- **Cách tính thiếu:** Vào muộn sau 13:00 → tính thiếu
- **Cách tính thừa:** Làm sau 17:00, **CHỈ TÍNH KHI >= 30 PHÚT**, cứ 15 phút làm tròn xuống
- **Ví dụ ca chiều:**
  - Vào 12:53, ra 18:31 → Vào sớm 7p (OK), thừa 91p → **TÍNH 90 phút** (91p >= 30p, làm tròn xuống)
  - Ra lúc 17:15 → 15 phút → **KHÔNG TÍNH** (< 30p)
  - Ra lúc 17:30 → 30 phút → **TÍNH 30 phút** (>= 30p)
  - Ra lúc 17:35 → 35 phút → **TÍNH 30 phút** (làm tròn xuống 15p)

#### 3. Ca toàn thời gian (vào trước 13:00 và ra sau 13:00)
- **Điều kiện:** Thời gian vào < 13:00 VÀ thời gian ra > 13:00
- **Giờ vào chuẩn:** 08:30
- **Giờ ra chuẩn:** 17:30
- **Cách tính thừa:** Làm sau 17:30, **CHỈ TÍNH KHI >= 30 PHÚT**, cứ 15 phút làm tròn xuống
- **Ví dụ:**
  - Ra lúc 17:45 → 15 phút → **KHÔNG TÍNH** (< 30p)
  - Ra lúc 18:00 → 30 phút → **TÍNH 30 phút** (>= 30p)
  - Ra lúc 18:05 → 35 phút → **TÍNH 30 phút** (làm tròn xuống 15p)
  - Ra lúc 18:15 → 45 phút → **TÍNH 45 phút**
  - Ra lúc 18:20 → 50 phút → **TÍNH 45 phút** (làm tròn xuống 15p)

### 📊 Ví dụ tính toán thực tế

#### Trường hợp 1: Ca sáng
- **Vào:** 08:45 (muộn 15 phút so với 08:30)
- **Ra:** 12:45 (làm bù 15 phút so với 12:30)
- **Thực tế:** 4h = 4h (đủ)
- **Kết quả:** Vào muộn 15p, Làm bù 15p < 30p → **Thiếu 15 phút** ❌

#### Trường hợp 1b: Ca sáng cân bằng
- **Vào:** 09:00 (muộn 30 phút so với 08:30)
- **Ra:** 13:00 (làm bù 30 phút >= 30p so với 12:30)
- **Kết quả:** Thiếu 30p, Làm bù 30p → **Cân bằng** ✅

#### Trường hợp 2: Ca chiều
- **Vào:** 13:00 (ca chiều)
- **Ra:** 17:20 (thừa 20 phút → **KHÔNG TÍNH** vì < 30p)
- **Kết quả:** 0 phút làm bù

#### Trường hợp 2b: Ca chiều có làm bù
- **Vào:** 13:00 (ca chiều)  
- **Ra:** 17:30 (làm bù 30 phút → **TÍNH 30 phút**)
- **Kết quả:** Làm bù 30 phút

#### Trường hợp 3: Ca toàn thời gian vào muộn
- **Vào:** 08:45 (muộn 15 phút)
- **Ra:** 17:45 (làm bù 15 phút)
- **Thực tế:** 9h - 1h nghỉ trưa = 8h = 8h (đủ)
- **Kết quả:** Vào muộn 15p, Làm bù 15p < 30p → **Thiếu 15 phút** ❌

#### Trường hợp 3b: Ca toàn thời gian cân bằng
- **Vào:** 09:00 (muộn 30 phút)
- **Ra:** 18:00 (làm bù 30 phút >= 30p)
- **Thực tế:** 9h - 1h nghỉ trưa = 8h (đủ 8h yêu cầu)
- **Kết quả:** Thiếu 30p, Làm bù 30p → **Cân bằng** ✅

#### Trường hợp 3c: Ca toàn thời gian tính nghỉ trưa
- **Vào:** 08:30 (đúng giờ)
- **Ra:** 17:00 (sớm 30p so với 17:30)
- **Thực tế:** 8h30p - 1h nghỉ trưa = 7h30p < 8h yêu cầu
- **Kết quả:** **Thiếu 30 phút** ❌ (do ra sớm và không đủ 8h làm việc)

#### Trường hợp 4: Vào quá sớm
- **Vào:** 07:00 (trước 07:30)
- **Ra:** 17:00
- **Xử lý:** Trừ 30 phút penalty → Tính như ra lúc 16:30
- **Kết quả:** Thiếu 1 tiếng

### 🎯 Tổng kết công thức
```
Thời gian làm việc thực tế (ca toàn thời gian) = Giờ ra - Giờ vào - 1h nghỉ trưa (12:00-13:00)

Tổng thiếu = Late Minutes + Early Penalty + Ra sớm + Thiếu giờ làm việc
Tổng làm bù = Làm bù Minutes (CHỈ TÍNH KHI >= ngưỡng cấu hình, làm tròn xuống theo cấu hình)
Phút còn thiếu = Tổng thiếu - Tổng làm bù

Nếu Phút còn thiếu > 0: Còn thiếu
Nếu Phút còn thiếu <= 0: Đã đủ/làm bù
```

### ⚠️ Lưu ý quan trọng về cách tính thời gian làm thực tế

#### 📋 Logic phân biệt 3 loại ca:

##### 1. Ca sáng (vào và ra trước 13:00)
- **Chỉ tính đến 12:00**: Nếu ra sau 12:00, chỉ tính đến 12:00
- **Không trừ nghỉ trưa**: Ca sáng không qua nghỉ trưa
- **Ví dụ:**
  - 07:30 → 11:30 = 4h ✅
  - 08:00 → 12:30 = 4h (chỉ tính đến 12:00) ✅
  - 08:15 → 12:45 = 3h45p (chỉ tính đến 12:00) ✅

##### 2. Ca chiều (vào sau 12:00)  
- **Chỉ tính từ 13:00**: Nếu vào trước 13:00, chỉ tính từ 13:00
- **Không tính time trước 13:00**: Bỏ qua thời gian 12:00-13:00
- **Ví dụ:**
  - 13:00 → 17:00 = 4h ✅
  - 12:30 → 17:30 = 4h30p (chỉ tính từ 13:00) ✅
  - 12:45 → 16:45 = 3h45p (từ 13:00-16:45) ✅

##### 3. Ca toàn thời gian (vào trước 13:00, ra sau 13:00)
- **Trừ nghỉ trưa 12:00-13:00**: Tự động trừ 1h nghỉ trưa
- **Tính toàn bộ**: Từ giờ vào đến giờ ra, trừ nghỉ trưa
- **Ví dụ:**
  - 08:30 → 17:30 = 9h - 1h = 8h ✅  
  - 07:45 → 18:00 = 10h15p - 1h = 9h15p ✅
  - 11:30 → 14:30 = 3h - 1h = 2h ✅
  - 07:45 → 13:15 = 5h30p - 1h = 4h30p ✅ (Ca toàn, không phải ca sáng)

### 📱 Hiển thị trong Extension Popup

#### Thông tin tổng quan:
- **Ngày làm việc**: Tổng số ngày làm việc
- **Phút thiếu**: Tổng phút thiếu (vào muộn + penalty + ra sớm)
- **Phút làm bù**: Tổng phút làm bù (>= ngưỡng cấu hình, làm tròn xuống theo cấu hình)
- **Kết quả cuối**: 
  - ⚠️ **Còn thiếu**: X phút/giờ (màu đỏ) nếu còn thiếu > 0
  - ✅ **Đã đủ/làm bù**: X phút/giờ (màu xanh) nếu còn thiếu <= 0

#### Tự động phân tích:
1. **Tìm thấy bảng Terra** → Tự động phân tích ngay lập tức
2. **Hiển thị kết quả** → Click "📋 Chi tiết" để xem breakdown từng ngày
3. **Làm mới** → Quét lại bảng và phân tích mới

#### Chi tiết từng ngày (Modal):
- **Ngày**: Ngày làm việc
- **Loại ca**: Ca sáng/Ca chiều/Ca toàn thời gian/Nửa ngày
- **Vào/Ra**: Thời gian thực tế
- **Thiếu (p)**: Phút thiếu trong ngày (màu đỏ nếu > 0)
- **Làm bù (p)**: Phút làm bù trong ngày (màu xanh nếu > 0)
- **Ghi chú**: Chi tiết tính toán (vào muộn, ra sớm, penalty...)

### ⚠️ Lưu ý quan trọng
- **Làm bù < ngưỡng tối thiểu**: KHÔNG được tính vào tổng làm bù (theo cấu hình)
- **Làm bù >= ngưỡng tối thiểu**: Được tính và làm tròn xuống theo khoảng đã cấu hình
- **Ví dụ làm tròn xuống** (với cấu hình mặc định 15p): 35p → 30p, 50p → 45p, 74p → 60p
- **⚠️ Nghỉ trưa**: Khoảng 12:00-13:00 KHÔNG tính vào giờ làm việc cho ca toàn thời gian
- **Tính thời gian thực tế**: Ca toàn thời gian tự động trừ 1h nghỉ trưa khi kiểm tra đủ giờ yêu cầu

## ⚙️ HƯỚNG DẪN CẤU HÌNH

### 🔧 Truy cập cấu hình
1. Mở extension Terra Time Calculator
2. Click nút **"⚙️ Cấu hình"** 
3. Điều chỉnh các tham số theo nhu cầu
4. Click **"💾 Lưu"** để áp dụng

### 📊 Các tham số cấu hình

#### 🕐 Giờ làm việc ca đầy đủ
- **Phạm vi:** 4.0 - 12.0 giờ
- **Mặc định:** 8.0 giờ (480 phút)
- **Ảnh hưởng:** 
  - Ca toàn thời gian sẽ yêu cầu số giờ này
  - Ca nửa ngày tự động = giá trị này ÷ 2
  - Giờ kết thúc dự kiến được tính dựa trên giá trị này

#### ⏰ Làm bù tối thiểu
- **Phạm vi:** 1 - 120 phút
- **Mặc định:** 30 phút
- **Ảnh hưởng:**
  - Chỉ tính làm bù khi làm thêm >= giá trị này
  - Nếu < giá trị này → không tính làm bù
  - Ví dụ: Cấu hình 45p → chỉ tính làm bù từ 45p trở lên

#### 🔄 Khoảng làm tròn làm bù  
- **Phạm vi:** 1 - 60 phút
- **Mặc định:** 15 phút
- **Ảnh hưởng:**
  - Làm bù sẽ được làm tròn xuống theo khoảng này
  - Ví dụ với 15p: 47p → 45p, 62p → 60p
  - Ví dụ với 30p: 47p → 30p, 62p → 60p

### 💡 Ví dụ cấu hình tùy chỉnh

#### Cấu hình công ty A (linh hoạt)
```
Giờ làm ca đầy đủ: 7.5 giờ
Làm bù tối thiểu: 15 phút  
Khoảng làm tròn: 5 phút
```
→ Ca toàn thời gian: 7.5h, Ca nửa ngày: 3.75h, Làm bù từ 15p, làm tròn 5p

#### Cấu hình công ty B (nghiêm ngặt)
```
Giờ làm ca đầy đủ: 8.5 giờ
Làm bù tối thiểu: 60 phút
Khoảng làm tròn: 30 phút  
```
→ Ca toàn thời gian: 8.5h, Ca nửa ngày: 4.25h, Làm bù từ 1h, làm tròn 30p

### 🔄 Reset cấu hình
- Click **"🔄 Mặc định"** trong modal cấu hình
- Khôi phục về giá trị mặc định: 8h, 30p, 15p
- Không mất dữ liệu phân tích đã có

### 💾 Lưu trữ cấu hình
- Cấu hình được lưu trong localStorage của trình duyệt
- Tự động khôi phục khi mở extension
- Riêng biệt cho từng trình duyệt/profile
- Không đồng bộ giữa các thiết bị
