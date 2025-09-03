# TERRA TIME CALCULATION RULES

## 📋 Quy tắc tính toán thời gian chấm công Terra

### ⏰ Khung giờ làm việc chuẩn
- **Ca sáng:** 08:30 - 12:30 (4 tiếng, **TỰ ĐỘNG TRỪ** khoảng 12:00-13:00 nếu làm qua)
- **Ca chiều:** 13:00 - 17:00 (4 tiếng)  
- **Ca toàn thời gian:** 08:30 - 17:30 (8 tiếng, **TỰ ĐỘNG TRỪ** nghỉ trưa 12:00-13:00)
- **⚠️ Lưu ý:** Thời gian 12:00-13:00 **KHÔNG TÍNH** vào giờ làm việc cho TẤT CẢ các ca

### 🔍 Quy tắc xác định loại ca
- **Ca sáng:** Vào và ra đều **trước 13:00**
- **Ca chiều:** Vào **sau 12:00** (bất kể giờ ra)
- **Ca toàn thời gian:** Vào **trước 13:00** và ra **sau 13:00**

#### Logic phân tích:
```javascript
if (thoiGianVao < 13:00 && thoiGianRa < 13:00) {
    return 'Ca sáng';
} else if (thoiGianVao > 12:00) {
    return 'Ca chiều';
} else {
    return 'Ca toàn thời gian';
}
```

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
- **Ca sáng:** Flexible 07:30-08:00 → 11:30-12:00 (chỉ làm buổi sáng)
- **Ca chiều:** Flexible 13:00-13:30 → 17:00-17:30 (chỉ làm buổi chiều, bắt đầu từ 13:00)
- **Ca toàn thời gian:** Flexible 07:30-08:30 → 16:30-17:30 (làm cả ngày, trừ nghỉ trưa)
- **Thừa giờ >= 30p** mới được tính và làm tròn xuống 15p

#### 2. Các trường hợp cụ thể

##### Ca sáng (Logic Hybrid - Khung flexible 7:30-8:00)
- **Ví dụ 1:** 07:25 → 12:40 (trong khung flexible)
  - Vào trong khung: flex từ 7:30, Làm thực tế: 4h35p (7:30→12:00), Thừa: 10p (12:30→12:40) → **KHÔNG TÍNH** (< 30p) ✅
- **Ví dụ 2:** 07:55 → 11:55 (trong khung flexible)
  - Vào trong khung: 0p thiếu, Ra chuẩn: 11:55 (7:55 + 4h), Ra đúng → **Không thiếu** ✅
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

### 🟢 Quy tắc tính THỪA GIỜ (Overtime)

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

### 🧮 Công thức tính toán

#### Hàm tính thời gian làm thực tế:
```javascript
function tinhThoiGianLamThucTe(thoiGianVao, thoiGianRa, loaiCa) {
    let thoiGianLam = thoiGianRa - thoiGianVao;
    
    // Ca sáng: chỉ tính đến trước 12:00
    if (loaiCa.includes('Ca sáng')) {
        const sangKetThuc = 12 * 60; // 12:00
        if (thoiGianRa > sangKetThuc) {
            // Nếu ra sau 12:00, chỉ tính đến 12:00
            thoiGianLam = sangKetThuc - thoiGianVao;
        }
    }
    // Ca chiều: chỉ tính từ 13:00 trở đi
    else if (loaiCa.includes('Ca chiều')) {
        const chieuBatDau = 13 * 60; // 13:00
        if (thoiGianVao < chieuBatDau) {
            // Nếu vào trước 13:00, chỉ tính từ 13:00
            thoiGianLam = thoiGianRa - chieuBatDau;
        }
    }
    // Ca toàn thời gian: trừ thời gian nghỉ trưa (12:00-13:00)
    else {
        const nghiTruaBatDau = 12 * 60; // 12:00
        const nghiTruaKetThuc = 13 * 60; // 13:00
        
        // Chỉ trừ nghỉ trưa nếu làm việc qua khung 12:00-13:00
        if (thoiGianVao < nghiTruaKetThuc && thoiGianRa > nghiTruaBatDau) {
            const batDauNghiTrua = Math.max(thoiGianVao, nghiTruaBatDau);
            const ketThucNghiTrua = Math.min(thoiGianRa, nghiTruaKetThuc);
            const thoiGianNghiTrua = ketThucNghiTrua - batDauNghiTrua;
            thoiGianLam -= thoiGianNghiTrua;
        }
    }
    
    return Math.max(0, thoiGianLam);
}
```

#### Hàm tính thiếu giờ (deprecated):
```javascript
function calculateWorkingTime(timeIn, timeOut, shiftType) {
    // ⚠️ HÀM NÀY ĐÃ ĐƯỢC THAY THẾ bằng tinhThoiGianLamThucTe() ở trên
    // Logic cũ không phân biệt ca sáng đúng cách
    // Logic mới phân biệt rõ ràng 3 loại ca:
    // - Ca sáng: chỉ tính đến 12:00 (không tính nghỉ trưa)
    // - Ca chiều: chỉ tính từ 13:00 (không tính time trước đó)
    // - Ca toàn: trừ nghỉ trưa 12:00-13:00
}

function calculateLatePenalty(timeIn, shiftType) {
    const earlyPenaltyThreshold = 7 * 60 + 30; // 07:30
    
    if (timeIn < earlyPenaltyThreshold) {
        return { type: "early_penalty", minutes: 30 };
    }
    
    // Flexible time ranges
    let flexStart, flexEnd;
    if (shiftType === 'Ca sáng') {
        flexStart = 7 * 60 + 30; flexEnd = 8 * 60; // 07:30-08:00
    } else if (shiftType === 'Ca chiều') {
        flexStart = 13 * 60; flexEnd = 13 * 60 + 30; // 13:00-13:30
    } else { // Ca toàn thời gian
        flexStart = 7 * 60 + 30; flexEnd = 8 * 60 + 30; // 07:30-08:30
    }
    
    if (timeIn > flexEnd) {
        const lateMinutes = timeIn - flexEnd;
        return { type: "late", minutes: lateMinutes };
    }
    
    return { type: "normal", minutes: 0 };
}
```

#### Hàm tính thừa giờ:
```javascript
function calculateOvertime(timeIn, timeOut, loaiCa) {
    let standardEnd;
    
    if (loaiCa.includes('Ca sáng')) {
        standardEnd = "12:30"; // Ca sáng ra chuẩn 12:30
    } else if (loaiCa.includes('Ca chiều')) {
        standardEnd = "17:00"; // Ca chiều ra chuẩn 17:00
    } else {
        standardEnd = "17:30"; // Ca toàn thời gian ra chuẩn 17:30
    }
    
    if (timeOut > standardEnd) {
        const overtimeMinutes = calculateMinutesDiff(standardEnd, timeOut);
        
        // CHỈ TÍNH KHI >= 30 PHÚT
        if (overtimeMinutes >= 30) {
            // Làm tròn xuống 15 phút
            return Math.floor(overtimeMinutes / 15) * 15;
        }
    }
    
    return 0;
}
```

### 📊 Ví dụ tính toán thực tế

#### Trường hợp 1: Ca sáng
- **Vào:** 08:45 (muộn 15 phút so với 08:30)
- **Ra:** 12:45 (thừa 15 phút so với 12:30)
- **Thực tế:** 4h = 4h (đủ)
- **Kết quả:** Vào muộn 15p, Thừa 15p < 30p → **Thiếu 15 phút** ❌

#### Trường hợp 1b: Ca sáng cân bằng
- **Vào:** 09:00 (muộn 30 phút so với 08:30)
- **Ra:** 13:00 (thừa 30 phút >= 30p so với 12:30)
- **Kết quả:** Thiếu 30p, Thừa 30p → **Cân bằng** ✅

#### Trường hợp 2: Ca chiều
- **Vào:** 13:00 (ca chiều)
- **Ra:** 17:20 (thừa 20 phút → **KHÔNG TÍNH** vì < 30p)
- **Kết quả:** 0 phút thừa

#### Trường hợp 2b: Ca chiều có overtime
- **Vào:** 13:00 (ca chiều)  
- **Ra:** 17:30 (thừa 30 phút → **TÍNH 30 phút**)
- **Kết quả:** Thừa 30 phút

#### Trường hợp 3: Ca toàn thời gian vào muộn
- **Vào:** 08:45 (muộn 15 phút)
- **Ra:** 17:45 (thừa 15 phút)
- **Thực tế:** 9h - 1h nghỉ trưa = 8h = 8h (đủ)
- **Kết quả:** Vào muộn 15p, Thừa 15p < 30p → **Thiếu 15 phút** ❌

#### Trường hợp 3b: Ca toàn thời gian cân bằng
- **Vào:** 09:00 (muộn 30 phút)
- **Ra:** 18:00 (thừa 30 phút >= 30p)
- **Thực tế:** 9h - 1h nghỉ trưa = 8h (đủ 8h yêu cầu)
- **Kết quả:** Thiếu 30p, Thừa 30p → **Cân bằng** ✅

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
Tổng thừa = Overtime Minutes (CHỈ TÍNH KHI >= 30 PHÚT, rounded down to 15min)
Phút còn thiếu = Tổng thiếu - Tổng thừa

Nếu Phút còn thiếu > 0: Còn thiếu
Nếu Phút còn thiếu <= 0: Đã đủ/thừa
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
- **Phút thừa**: Tổng phút thừa (overtime >= 30p, làm tròn xuống 15p)
- **Kết quả cuối**: 
  - ⚠️ **Còn thiếu**: X phút/giờ (màu đỏ) nếu còn thiếu > 0
  - ✅ **Đã đủ/thừa**: X phút/giờ (màu xanh) nếu còn thiếu <= 0

#### Tự động phân tích:
1. **Tìm thấy bảng Terra** → Tự động phân tích ngay lập tức
2. **Hiển thị kết quả** → Click "📋 Chi tiết" để xem breakdown từng ngày
3. **Làm mới** → Quét lại bảng và phân tích mới

#### Chi tiết từng ngày (Modal):
- **Ngày**: Ngày làm việc
- **Loại ca**: Ca sáng/Ca chiều/Ca toàn thời gian/Nửa ngày
- **Vào/Ra**: Thời gian thực tế
- **Thiếu (p)**: Phút thiếu trong ngày (màu đỏ nếu > 0)
- **Thừa (p)**: Phút thừa trong ngày (màu xanh nếu > 0)
- **Ghi chú**: Chi tiết tính toán (vào muộn, ra sớm, penalty...)

### ⚠️ Lưu ý quan trọng
- **Overtime < 30 phút**: KHÔNG được tính vào tổng thừa
- **Overtime >= 30 phút**: Được tính và làm tròn xuống 15 phút
- **Ví dụ làm tròn xuống**: 35p → 30p, 50p → 45p, 74p → 60p
- **⚠️ Nghỉ trưa**: Khoảng 12:00-13:00 KHÔNG tính vào giờ làm việc cho ca toàn thời gian
- **Tính thời gian thực tế**: Ca toàn thời gian tự động trừ 1h nghỉ trưa khi kiểm tra đủ 8h yêu cầu
