# TERRA TIME CALCULATION RULES

## 📋 Quy tắc tính toán thời gian chấm công Terra

### ⏰ Khung giờ làm việc chuẩn
- **Giờ vào chuẩn:** 08:30
- **Giờ ra chuẩn:** 17:30 (ca toàn thời gian) hoặc 17:00 (ca chiều)
- **Thời gian làm việc:** 8 tiếng (ca toàn) hoặc 4 tiếng (ca chiều)
- **Nghỉ trưa:** 1 tiếng (12:00-13:00) chỉ tính cho ca toàn thời gian

### 🔴 Quy tắc tính THIẾU GIỜ (Logic Hybrid: Dynamic + Fixed)

#### Nguyên tắc: Giờ ra chuẩn phụ thuộc vào vào sớm hay muộn
1. **Vào muộn sau 08:30** → Tính thiếu theo phút muộn
2. **Nếu vào <= 08:30**: Giờ ra chuẩn = Giờ vào + 9h (dynamic - được thưởng)
3. **Nếu vào > 08:30**: Giờ ra chuẩn = 17:30 cố định (fixed - bị phạt)
4. **Ra sớm trước giờ ra chuẩn** → Tính thiếu theo phút ra sớm
5. **Penalty vào quá sớm** → Trước 07:30 cộng thêm 30p

#### Điều kiện:
- **Ca toàn thời gian:** Chuẩn 08:30 → 17:30
- **Ca chiều:** Chuẩn 13:00 → 17:00  
- **Thừa giờ >= 30p** mới được tính và làm tròn xuống 15p

#### 2. Các trường hợp cụ thể

##### Ca toàn thời gian (Logic Hybrid)
- **Ví dụ 1:** 08:26 → 17:28
  - Vào sớm: 0p, Ra chuẩn: 17:26 (dynamic), Thực tế ra: 17:28 → **Không thiếu** ✅
- **Ví dụ 2:** 08:19 → 17:21 
  - Vào sớm: 0p, Ra chuẩn: 17:19 (dynamic), Ra muộn: 2p → **Không thiếu** ✅
- **Ví dụ 3:** 08:32 → 17:32
  - Vào muộn: 2p, Ra chuẩn: 17:30 (fixed), Ra muộn: 0p → **Thiếu 2 phút** ❌
- **Ví dụ 4:** 08:53 → 17:35
  - Vào muộn: 23p, Ra chuẩn: 17:30 (fixed), Ra muộn: 0p → **Thiếu 23 phút** ❌
- **Ví dụ 5:** 08:38 → 17:31
  - Vào muộn: 8p, Ra chuẩn: 17:30 (fixed), Ra muộn: 0p → **Thiếu 8 phút** ❌
- **Ví dụ 6:** 08:39 → 18:04
  - Vào muộn: 9p, Ra muộn: 0p, Thừa: 34p → **Thiếu 9p, Thừa 30p** ✅

##### Ca chiều (4 giờ)
- **Ví dụ 1:** 12:55 → 17:05
  - Làm: 4h10p > 4h → **Không thiếu** ✅
- **Ví dụ 2:** 13:10 → 16:50  
  - Làm: 3h40p < 4h → **Thiếu 20 phút** ❌

#### 3. Penalty vào quá sớm
- **Điều kiện:** Vào trước 07:30 (chỉ ca toàn thời gian)
- **Xử lý:** Cộng thêm 30 phút vào yêu cầu
- **Ví dụ:** 07:20 → 17:30 = 10h10p, nhưng yêu cầu 8h30p → **Thiếu 20 phút**

### 🟢 Quy tắc tính THỪA GIỜ (Overtime)

#### 1. Ca toàn thời gian (vào trước 12:00)
- **Điều kiện:** Thời gian vào < 12:00
- **Giờ ra chuẩn:** 17:30
- **Cách tính thừa:** Làm sau 17:30, **CHỈ TÍNH KHI >= 30 PHÚT**, cứ 15 phút làm tròn xuống
- **Ví dụ:**
  - Ra lúc 17:45 → 15 phút → **KHÔNG TÍNH** (< 30p)
  - Ra lúc 18:00 → 30 phút → **TÍNH 30 phút** (>= 30p)
  - Ra lúc 18:05 → 35 phút → **TÍNH 30 phút** (làm tròn xuống 15p)
  - Ra lúc 18:15 → 45 phút → **TÍNH 45 phút**
  - Ra lúc 18:20 → 50 phút → **TÍNH 45 phút** (làm tròn xuống 15p)

#### 2. Ca chiều (vào từ 12:00 trở đi)
- **Điều kiện:** Thời gian vào >= 12:00
- **Giờ vào chuẩn:** 13:00 
- **Giờ ra chuẩn:** 17:00
- **Cách tính thiếu:** Vào muộn sau 13:00 → tính thiếu
- **Cách tính thừa:** Làm sau 17:00, **CHỈ TÍNH KHI >= 30 PHÚT**, cứ 15 phút làm tròn xuống
- **Ví dụ ca chiều:**
  - Vào 12:53, ra 18:31 → Vào sớm 7p (OK), thừa 91p → **TÍNH 90 phút** (91p >= 30p, làm tròn xuống)
  - Ra lúc 17:15 → 15 phút → **KHÔNG TÍNH** (< 30p)
  - Ra lúc 17:30 → 30 phút → **TÍNH 30 phút** (>= 30p)
  - Ra lúc 17:35 → 35 phút → **TÍNH 30 phút** (làm tròn xuống 15p)

### 🧮 Công thức tính toán

#### Hàm tính thiếu giờ:
```javascript
function calculateLatePenalty(timeIn) {
    const standardStart = "08:30";
    const earlyPenaltyThreshold = "07:30";
    
    if (timeIn < earlyPenaltyThreshold) {
        return { type: "early_penalty", minutes: 30 };
    }
    
    if (timeIn > standardStart) {
        const lateMinutes = calculateMinutesDiff(standardStart, timeIn);
        return { type: "late", minutes: lateMinutes };
    }
    
    return { type: "normal", minutes: 0 };
}
```

#### Hàm tính thừa giờ:
```javascript
function calculateOvertime(timeIn, timeOut) {
    const isFullDay = timeIn < "12:00";
    const standardEnd = isFullDay ? "17:30" : "17:00";
    
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

#### Trường hợp 1: Ca toàn thời gian vào muộn
- **Vào:** 08:45 (muộn 15 phút)
- **Ra:** 17:45 (thừa 15 phút)
- **Thực tế:** 9h - 1h nghỉ trưa = 8h = 8h (đủ)
- **Kết quả:** Vào muộn 15p, Thừa 15p < 30p → **Thiếu 15 phút** ❌

#### Trường hợp 1b: Ca toàn thời gian cân bằng
- **Vào:** 09:00 (muộn 30 phút)
- **Ra:** 18:00 (thừa 30 phút >= 30p)
- **Kết quả:** Thiếu 30p, Thừa 30p → **Cân bằng** ✅
#### Trường hợp 1c: Ca toàn thời gian thiếu tổng giờ
- **Vào:** 08:40 
- **Ra:** 17:20
- **Thực tế:** 8h40p - 1h nghỉ trưa = 7h40p < 8h
- **Kết quả:** Thiếu 20 phút (theo tổng giờ làm)

#### Trường hợp 2: Ca chiều
- **Vào:** 13:00 (ca chiều)
- **Ra:** 17:20 (thừa 20 phút → **KHÔNG TÍNH** vì < 30p)
- **Kết quả:** 0 phút thừa

#### Trường hợp 2b: Ca chiều có overtime
- **Vào:** 13:00 (ca chiều)  
- **Ra:** 17:30 (thừa 30 phút → **TÍNH 30 phút**)
- **Kết quả:** Thừa 30 phút

#### Trường hợp 2c: Ca chiều với làm tròn xuống
- **Vào:** 13:00 (ca chiều)  
- **Ra:** 17:40 (thừa 40 phút → làm tròn xuống 30 phút)
- **Kết quả:** Thừa 30 phút

#### Trường hợp 3: Vào quá sớm
- **Vào:** 07:00 (trước 07:30)
- **Ra:** 17:00
- **Xử lý:** Trừ 30 phút penalty → Tính như ra lúc 16:30
- **Kết quả:** Thiếu 1 tiếng

### 🎯 Tổng kết công thức
```
Tổng thiếu = Late Minutes + Early Penalty
Tổng thừa = Overtime Minutes (CHỈ TÍNH KHI >= 30 PHÚT, rounded down to 15min)
Thời gian cần bù = Tổng thiếu - Tổng thừa
```

### ⚠️ Lưu ý quan trọng
- **Overtime < 30 phút**: KHÔNG được tính vào tổng thừa
- **Overtime >= 30 phút**: Được tính và làm tròn xuống 15 phút
- **Ví dụ làm tròn xuống**: 35p → 30p, 50p → 45p, 74p → 60p
