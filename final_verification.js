// Final verification: Kiểm tra TẤT CẢ các ví dụ trong CALCULATION_RULES.md

function chuanHoaGio(timeStr) {
    const parts = timeStr.split(':');
    const hours = parseInt(parts[0]) || 0;
    const minutes = parseInt(parts[1]) || 0;
    return hours * 60 + minutes;
}

function phutSangGio(phut) {
    const h = Math.floor(phut / 60);
    const m = phut % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function xacDinhLoaiCa(thoiGianVao, thoiGianRa) {
    const giua_ngay = 12 * 60;
    const mot_gio_chieu = 13 * 60;
    
    if (thoiGianVao < mot_gio_chieu && thoiGianRa < mot_gio_chieu) {
        return 'Ca sáng';
    } else if (thoiGianVao > giua_ngay) {
        return 'Ca chiều';
    } else {
        return 'Ca toàn thời gian';
    }
}

function tinhThoiGianLamThucTe(thoiGianVao, thoiGianRa, loaiCa) {
    let thoiGianLam = thoiGianRa - thoiGianVao;
    
    if (loaiCa.includes('Ca toàn thời gian')) {
        const nghiTruaBatDau = 12 * 60;
        const nghiTruaKetThuc = 13 * 60;
        
        if (thoiGianVao < nghiTruaKetThuc && thoiGianRa > nghiTruaBatDau) {
            const batDauNghiTrua = Math.max(thoiGianVao, nghiTruaBatDau);
            const ketThucNghiTrua = Math.min(thoiGianRa, nghiTruaKetThuc);
            const thoiGianNghiTrua = ketThucNghiTrua - batDauNghiTrua;
            thoiGianLam -= thoiGianNghiTrua;
        }
    }
    
    return Math.max(0, thoiGianLam);
}

function tinhPhutThieuDayDu(thoiGianVao, thoiGianRa, loaiCa) {
    if (loaiCa.includes('Ca sáng')) {
        const gio_lam_yeu_cau = 4 * 60;
        const gio_flex_start = 8 * 60 + 0;
        const gio_flex_end = 8 * 60 + 30;
        let phutThieu = 0;
        
        if (thoiGianVao > gio_flex_end) {
            phutThieu += (thoiGianVao - gio_flex_end);
        }
        
        let gio_ra_chuan;
        if (thoiGianVao <= gio_flex_end) {
            const gio_vao_flex = Math.max(thoiGianVao, gio_flex_start);
            gio_ra_chuan = gio_vao_flex + gio_lam_yeu_cau;
        } else {
            gio_ra_chuan = 12 * 60 + 30;
        }
        
        if (thoiGianRa < gio_ra_chuan) {
            phutThieu += (gio_ra_chuan - thoiGianRa);
        }
        
        const phutLamThucTe = tinhThoiGianLamThucTe(thoiGianVao, thoiGianRa, loaiCa);
        if (phutLamThucTe < gio_lam_yeu_cau) {
            phutThieu = Math.max(phutThieu, gio_lam_yeu_cau - phutLamThucTe);
        }
        
        return phutThieu;
    }
    
    if (loaiCa.includes('Ca chiều')) {
        const gio_lam_yeu_cau = 4 * 60;
        const gio_flex_start = 13 * 60 + 0;
        const gio_flex_end = 13 * 60 + 30;
        let phutThieu = 0;
        
        if (thoiGianVao > gio_flex_end) {
            phutThieu += (thoiGianVao - gio_flex_end);
        }
        
        let gio_ra_chuan;
        if (thoiGianVao <= gio_flex_end) {
            const gio_vao_flex = Math.max(thoiGianVao, gio_flex_start);
            gio_ra_chuan = gio_vao_flex + gio_lam_yeu_cau;
        } else {
            gio_ra_chuan = 17 * 60 + 0;
        }
        
        if (thoiGianRa < gio_ra_chuan) {
            phutThieu += (gio_ra_chuan - thoiGianRa);
        }
        
        const phutLamThucTe = tinhThoiGianLamThucTe(thoiGianVao, thoiGianRa, loaiCa);
        if (phutLamThucTe < gio_lam_yeu_cau) {
            phutThieu = Math.max(phutThieu, gio_lam_yeu_cau - phutLamThucTe);
        }
        
        return phutThieu;
    }
    
    if (loaiCa.includes('Ca toàn thời gian')) {
        const gio_lam_yeu_cau = 8 * 60;
        const gio_flex_start = 7 * 60 + 30;
        const gio_flex_end = 8 * 60 + 30;
        let phutThieu = 0;
        
        if (thoiGianVao > gio_flex_end) {
            phutThieu += (thoiGianVao - gio_flex_end);
        }
        
        let gio_ra_chuan;
        if (thoiGianVao <= gio_flex_end) {
            const gio_vao_flex = Math.max(thoiGianVao, gio_flex_start);
            gio_ra_chuan = gio_vao_flex + gio_lam_yeu_cau + 60;
        } else {
            gio_ra_chuan = 17 * 60 + 30;
        }
        
        if (thoiGianRa < gio_ra_chuan) {
            phutThieu += (gio_ra_chuan - thoiGianRa);
        }
        
        const phutLamThucTe = tinhThoiGianLamThucTe(thoiGianVao, thoiGianRa, loaiCa);
        if (phutLamThucTe < gio_lam_yeu_cau) {
            phutThieu = Math.max(phutThieu, gio_lam_yeu_cau - phutLamThucTe);
        }
        
        return phutThieu;
    }
    
    return 0;
}

// Test tất cả ví dụ từ CALCULATION_RULES.md
const testCases = [
    // Ca sáng
    { vao: "08:25", ra: "12:40", expected: "Đủ giờ", note: "Ca sáng ví dụ 1" },
    { vao: "08:35", ra: "12:32", expected: "Thiếu 5p", note: "Ca sáng ví dụ 2" },
    
    // Ca chiều  
    { vao: "13:15", ra: "17:20", expected: "Đủ giờ", note: "Ca chiều ví dụ 1" },
    { vao: "13:35", ra: "17:30", expected: "Thiếu 5p", note: "Ca chiều ví dụ 2" },
    
    // Ca toàn thời gian
    { vao: "07:25", ra: "16:40", expected: "Đủ giờ", note: "Ca toàn ví dụ 1 - QUAN TRỌNG" },
    { vao: "08:15", ra: "17:15", expected: "Đủ giờ", note: "Ca toàn ví dụ 2" },
    { vao: "08:35", ra: "17:32", expected: "Thiếu 5p", note: "Ca toàn ví dụ 3" }
];

console.log("🔍 KIỂM TRA TẤT CẢ VÍ DỤ TRONG CALCULATION_RULES.md\n");

let allPassed = true;

testCases.forEach((test, index) => {
    const thoiGianVao = chuanHoaGio(test.vao);
    const thoiGianRa = chuanHoaGio(test.ra);
    const loaiCa = xacDinhLoaiCa(thoiGianVao, thoiGianRa);
    const phutThieu = tinhPhutThieuDayDu(thoiGianVao, thoiGianRa, loaiCa);
    
    let ketQua;
    if (phutThieu === 0) {
        ketQua = "Đủ giờ";
    } else {
        ketQua = `Thiếu ${phutThieu}p`;
    }
    
    const passed = ketQua === test.expected;
    allPassed = allPassed && passed;
    
    const status = passed ? "✅" : "❌";
    console.log(`${status} Test ${index + 1}: ${test.note}`);
    console.log(`   Input: ${test.vao} → ${test.ra} (${loaiCa})`);
    console.log(`   Expected: ${test.expected}`);
    console.log(`   Actual: ${ketQua}`);
    console.log(`   Match: ${passed ? "PASS" : "FAIL"}`);
    console.log();
});

console.log("=" .repeat(60));
console.log(`🎯 KẾT QUẢ TỔNG QUAN: ${allPassed ? "✅ TẤT CẢ PASS" : "❌ CÓ LỖI"}`);
console.log(`📊 Thống kê: ${testCases.filter((_, i) => {
    const thoiGianVao = chuanHoaGio(testCases[i].vao);
    const thoiGianRa = chuanHoaGio(testCases[i].ra);
    const loaiCa = xacDinhLoaiCa(thoiGianVao, thoiGianRa);
    const phutThieu = tinhPhutThieuDayDu(thoiGianVao, thoiGianRa, loaiCa);
    const ketQua = phutThieu === 0 ? "Đủ giờ" : `Thiếu ${phutThieu}p`;
    return ketQua === testCases[i].expected;
}).length}/${testCases.length} test cases passed`);

if (allPassed) {
    console.log("🚀 Tất cả ví dụ trong documentation đều CHÍNH XÁC!");
} else {
    console.log("⚠️ Có ví dụ chưa chính xác, cần review lại!");
}
