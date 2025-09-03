// Content script để phân tích bảng chấm công Terra
class TerraTimeAnalyzer {
    constructor() {
        this.tableData = [];
        this.terraTable = null;
        this.init();
    }

    init() {
        // Chỉ lắng nghe message từ popup, không tạo nút trên trang
        this.setupMessageListener();
    }

    setupMessageListener() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            switch (request.action) {
                case 'checkTerraTable':
                    // Tìm kiếm lại bảng khi được yêu cầu
                    const found = this.findTerraTable();
                    const data = found ? this.getTableInfo() : null;
                    sendResponse({ found, data });
                    break;

                case 'analyzeTable':
                    // Tìm lại bảng trước khi phân tích
                    if (!this.terraTable) {
                        this.findTerraTable();
                    }

                    this.performAnalysis().then(result => {
                        sendResponse(result);
                    }).catch(error => {
                        sendResponse({ success: false, error: error.message });
                    });
                    return true; // Giữ kênh message mở cho async response



                case 'showDetails':
                    // Sửa lỗi: truyền đúng dữ liệu analysis 
                    if (this.tableData && this.tableData.length > 0) {
                        const analysis = this.calculateTime(this.tableData);
                        this.showDetailedResults(analysis);
                        sendResponse({ success: true });
                    } else {
                        // Nếu chưa có dữ liệu, phân tích lại
                        this.performAnalysis().then(result => {
                            if (result.success) {
                                this.showDetailedResults(result.analysis);
                                sendResponse({ success: true });
                            } else {
                                sendResponse({ success: false, error: 'Không có dữ liệu để hiển thị chi tiết' });
                            }
                        });
                        return true; // Async response
                    }
                    break;

                case 'rescanPage':
                    // Tính năng: quét lại trang để tìm bảng
                    console.log('🔄 Đang quét lại trang...');
                    this.terraTable = null; // Reset
                    this.tableData = []; // Reset data
                    const foundTable = this.findTerraTable();
                    sendResponse({ found: foundTable, message: foundTable ? 'Đã tìm thấy bảng!' : 'Vẫn không tìm thấy bảng' });
                    break;
            }
        });
    }

    getTableInfo() {
        if (!this.terraTable) return null;

        const tbody = this.terraTable.closest('.el-table')?.querySelector('.el-table__body tbody');
        const rowCount = tbody ? tbody.querySelectorAll('tr').length : 0;

        return {
            recordCount: rowCount,
            tableFound: true
        };
    }

    async performAnalysis() {
        try {
            const data = this.extractTableData();
            if (data.length === 0) {
                throw new Error('Không tìm thấy dữ liệu trong bảng');
            }

            const analysis = this.calculateTime(data);
            this.tableData = data; // Lưu để export sau

            return {
                success: true,
                analysis
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    findTerraTable() {
        console.log('🔍 Đang tìm kiếm bảng Terra...');

        // Tìm bảng có header chứa "Ngày", "Phân loại", "Dự kiến", "Thực tế"
        const tables = document.querySelectorAll('table');
        console.log(`Tìm thấy ${tables.length} bảng trên trang`);

        for (let table of tables) {
            const headers = table.querySelectorAll('th .cell, th');
            const headerTexts = Array.from(headers).map(h => h.textContent.trim());

            console.log('Header texts:', headerTexts);

            // Kiểm tra các pattern khác nhau cho bảng Terra
            const hasNgay = headerTexts.some(text => text.includes('Ngày') || text.includes('Date'));
            const hasPhanLoai = headerTexts.some(text => text.includes('Phân loại') || text.includes('Type'));
            const hasDuKien = headerTexts.some(text => text.includes('Dự kiến') || text.includes('Expected') || text.includes('Plan'));
            const hasThucTe = headerTexts.some(text => text.includes('Thực tế') || text.includes('Actual'));

            if (hasNgay && (hasPhanLoai || hasDuKien || hasThucTe)) {
                this.terraTable = table;
                console.log('✅ Đã tìm thấy bảng Terra:', table);
                console.log('Headers found:', headerTexts);
                return true;
            }
        }

        // Nếu không tìm thấy, thử tìm theo class name
        const elTables = document.querySelectorAll('.el-table, [class*="table"]');
        console.log(`Tìm kiếm theo class: ${elTables.length} bảng`);

        for (let table of elTables) {
            const allText = table.textContent.toLowerCase();
            if (allText.includes('ngày') && (allText.includes('dự kiến') || allText.includes('thực tế'))) {
                this.terraTable = table;
                console.log('✅ Tìm thấy bảng Terra theo nội dung:', table);
                return true;
            }
        }

        console.log('❌ Không tìm thấy bảng Terra');
        return false;
    }

    // Hàm createAnalyzeButton và analyzeTable đã bị xóa 
    // Extension chỉ hoạt động thông qua popup

    extractTableData() {
        console.log('📊 Bắt đầu trích xuất dữ liệu từ bảng...');

        if (!this.terraTable) {
            console.log('❌ Không có bảng Terra để trích xuất');
            return [];
        }

        // Thử các cách tìm tbody khác nhau
        let tbody = null;

        // Cách 1: Tìm tbody trong el-table
        tbody = this.terraTable.closest('.el-table')?.querySelector('.el-table__body tbody');

        // Cách 2: Tìm tbody trực tiếp trong table
        if (!tbody) {
            tbody = this.terraTable.querySelector('tbody');
        }

        // Cách 3: Tìm tất cả tr có data (không phải header)
        if (!tbody) {
            const allRows = this.terraTable.querySelectorAll('tr');
            console.log(`Tìm thấy ${allRows.length} hàng tổng cộng`);

            // Lọc ra những hàng không phải header
            const dataRows = Array.from(allRows).filter(row => {
                const cells = row.querySelectorAll('td');
                return cells.length > 0; // Hàng có td (không chỉ th)
            });

            if (dataRows.length > 0) {
                console.log(`Tìm thấy ${dataRows.length} hàng dữ liệu`);
                return this.processDataRows(dataRows);
            }
        }

        if (!tbody) {
            console.log('❌ Không tìm thấy tbody hoặc dữ liệu');
            return [];
        }

        const rows = tbody.querySelectorAll('tr');
        console.log(`Tìm thấy ${rows.length} hàng trong tbody`);

        return this.processDataRows(Array.from(rows));
    }

    processDataRows(rows) {
        const data = [];
        let currentDate = null; // Theo dõi ngày hiện tại

        rows.forEach((row, index) => {
            // Thử các cách tìm cell khác nhau
            let cells = row.querySelectorAll('td .cell');

            // Nếu không có .cell, thử lấy td trực tiếp
            if (cells.length === 0) {
                cells = row.querySelectorAll('td');
            }

            console.log(`Hàng ${index + 1}: ${cells.length} ô`);

            if (cells.length >= 6) { // Ít nhất cần 6 cột
                const ngayText = this.getCellText(cells[0]);
                const phanLoaiText = this.getCellText(cells[1]);

                // Cập nhật ngày hiện tại nếu dòng này có ngày
                if (ngayText && ngayText !== '' && !ngayText.includes('Ngày')) {
                    currentDate = ngayText;
                }

                const rowData = {
                    ngay: ngayText || currentDate, // Sử dụng ngày hiện tại nếu dòng không có ngày
                    phanLoai: phanLoaiText,
                    duKienVao: this.getCellText(cells[2]),
                    duKienRa: this.getCellText(cells[3]),
                    thucTeVao: this.getCellTextFromInput(cells[4]), // Cột thực tế vào có input
                    thucTeRa: this.getCellTextFromInput(cells[5]),   // Cột thực tế ra có input
                    gioLam: cells.length > 6 ? this.getCellText(cells[6]) : '',
                    tangCa: cells.length > 7 ? this.getCellText(cells[7]) : ''
                };

                console.log('Dữ liệu hàng:', rowData);

                // Chỉ thêm hàng có phân loại là "Đi làm" (và có ngày hợp lệ)
                const hasValidDate = rowData.ngay && rowData.ngay !== '' && !rowData.ngay.includes('Ngày');
                const isWorkRow = rowData.phanLoai && rowData.phanLoai.toLowerCase().includes('đi làm');
                
                if (hasValidDate && isWorkRow) {
                    data.push(rowData);
                    console.log(`✅ Thêm dòng đi làm: ${rowData.ngay} - ${rowData.phanLoai}`);
                } else if (hasValidDate) {
                    console.log(`⏭️ Bỏ qua dòng không phải đi làm: ${rowData.ngay} - ${rowData.phanLoai}`);
                }
            }
        });

        console.log(`✅ Trích xuất được ${data.length} hàng dữ liệu hợp lệ`);
        return data;
    }

    getCellText(cell) {
        if (!cell) return '';

        // Lấy text thường từ .cell hoặc trực tiếp từ element
        const cellDiv = cell.querySelector('.cell');
        let text = cellDiv ? cellDiv.textContent.trim() : cell.textContent.trim();

        // Làm sạch text cho cột phân loại - ưu tiên lấy dòng "Đi làm"
        const lines = text.split('\n');
        if (lines.length > 1) {
            // Ưu tiên tìm dòng chứa "Đi làm" trước
            for (let line of lines) {
                const cleanLine = line.trim();
                if (cleanLine && cleanLine.toLowerCase().includes('đi làm')) {
                    return cleanLine;
                }
            }
            
            // Nếu không có "Đi làm", lấy dòng đầu tiên không rỗng và không phải đăng ký/công tác
            for (let line of lines) {
                const cleanLine = line.trim();
                if (cleanLine && !cleanLine.includes('Đăng ký') && !cleanLine.includes('Công tác')) {
                    return cleanLine;
                }
            }
        }

        return text;
    }

    getCellTextFromInput(cell) {
        if (!cell) return '';

        // Ưu tiên lấy giá trị từ input field (cho cột thực tế vào/ra)
        const input = cell.querySelector('input');
        if (input && input.value) {
            return input.value.trim();
        }

        // Fallback: lấy text thường nếu không có input
        const cellDiv = cell.querySelector('.cell');
        return cellDiv ? cellDiv.textContent.trim() : cell.textContent.trim();
    }

    calculateTime(data) {
        console.log('🧮 Bắt đầu tính toán thời gian theo quy tắc Terra...');

        let tongPhutThieu = 0;
        let tongPhutThua = 0;
        let soNgayLamViec = 0;
        let chiTietNgay = [];

        data.forEach(row => {
            // Data đã được lọc chỉ chứa dòng "Đi làm" từ processDataRows()
            // Đếm ngày làm việc đầy đủ
            soNgayLamViec += 1;
            console.log(`📅 Ngày làm việc: ${row.ngay} - ${row.phanLoai}`);

            const thongTinNgay = this.tinhToanNgay(row);
            chiTietNgay.push(thongTinNgay);

            tongPhutThieu += thongTinNgay.phutThieu;
            tongPhutThua += thongTinNgay.phutThua;

            console.log(`Ngày ${row.ngay}:`, thongTinNgay);
        });

        const phutConThieu = tongPhutThieu - tongPhutThua;
        const gioConThieu = (phutConThieu / 60).toFixed(2);

        const ketQua = {
            soNgayLamViec,
            tongPhutThieu,
            tongPhutThua,
            phutConThieu,
            gioConThieu,
            tongGioLamDuKien: (soNgayLamViec * 8).toFixed(2), // 8h/ngày
            tongGioLamThucTe: ((soNgayLamViec * 8 * 60 - phutConThieu) / 60).toFixed(2),
            chiTietNgay,
            data
        };

        console.log('📊 Kết quả tính toán:', ketQua);
        return ketQua;
    }

    tinhToanNgay(rowData) {
        const { ngay, thucTeVao, thucTeRa } = rowData;

        // Xử lý trường hợp thiếu dữ liệu thời gian
        if (!thucTeVao || !thucTeRa || thucTeVao === '--:--' || thucTeRa === '--:--') {
            return {
                ngay,
                loaiCa: 'Không xác định',
                phutThieu: 0,
                phutThua: 0,
                ghiChu: 'Thiếu dữ liệu thời gian'
            };
        }

        const thoiGianVao = this.chuanHoaGio(thucTeVao);
        const thoiGianRa = this.chuanHoaGio(thucTeRa);

        // Xác định loại ca
        let loaiCa = this.xacDinhLoaiCa(thoiGianVao, thoiGianRa);

        // Tính thiếu giờ - bao gồm cả vào muộn và ra sớm
        let thongTinThieu;
        thongTinThieu = this.tinhPhutThieuDayDu(thoiGianVao, thoiGianRa, loaiCa);

        // Tính thừa giờ
        const phutThua = this.tinhPhutThua(thoiGianVao, thoiGianRa, loaiCa);

        return {
            ngay,
            loaiCa,
            thoiGianVao,
            thoiGianRa,
            phutThieu: thongTinThieu.phut,
            phutThua,
            ghiChu: thongTinThieu.ghiChu
        };
    }

    tinhThoiGianLamThucTe(thoiGianVao, thoiGianRa, loaiCa) {
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
        
        return Math.max(0, thoiGianLam); // Không để âm
    }

    chuanHoaGio(timeStr) {
        // Chuyển đổi thời gian thành phút từ 00:00
        const parts = timeStr.split(':');
        const hours = parseInt(parts[0]) || 0;
        const minutes = parseInt(parts[1]) || 0;
        return hours * 60 + minutes;
    }

    phutSangGio(phut) {
        const h = Math.floor(phut / 60);
        const m = phut % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    }

    xacDinhLoaiCa(thoiGianVao, thoiGianRa) {
        const giua_ngay = 12 * 60; // 12:00 = 720 phút
        const mot_gio_chieu = 13 * 60; // 13:00 = 780 phút

        // Ca sáng: vào và ra đều trước 13:00
        if (thoiGianVao < mot_gio_chieu && thoiGianRa < mot_gio_chieu) {
            return 'Ca sáng';
        }
        // Ca chiều: vào sau 12:00
        else if (thoiGianVao > giua_ngay) {
            return 'Ca chiều';
        }
        // Ca toàn thời gian: vào trước 13:00 và ra sau 13:00
        else {
            return 'Ca toàn thời gian';
        }
    }

    tinhPhutThieuDayDu(thoiGianVao, thoiGianRa, loaiCa) {
        // Logic HYBRID: Dynamic cho vào trong khung flexible, Fixed cho vào muộn
        let gio_vao_chuan, gio_lam_yeu_cau;
        let gio_flex_start, gio_flex_end; // Khung giờ flexible

        // Xác định khung giờ chuẩn và flexible theo loại ca
        if (loaiCa.includes('Ca chiều')) {
            gio_vao_chuan = 13 * 60; // 13:00
            gio_lam_yeu_cau = 4 * 60; // 4 giờ = 240 phút
            gio_flex_start = 13 * 60; // 13:00
            gio_flex_end = 13 * 60 + 30; // 13:30
        } else if (loaiCa.includes('Ca sáng')) {
            gio_vao_chuan = 8 * 60 + 30; // 08:30
            gio_lam_yeu_cau = 4 * 60; // 4 giờ = 240 phút
            gio_flex_start = 7 * 60 + 30; // 07:30
            gio_flex_end = 8 * 60; // 08:00
        } else {
            // Ca toàn thời gian
            gio_vao_chuan = 8 * 60 + 30; // 08:30
            gio_lam_yeu_cau = 8 * 60; // 8 giờ = 480 phút
            gio_flex_start = 7 * 60 + 30; // 07:30
            gio_flex_end = 8 * 60 + 30; // 08:30
        }

        let phutThieu = 0;
        let ghiChu = '';

        // Tính toán thiếu giờ cho tất cả loại ca

            // 1. Tính vào muộn dựa trên khung flexible
            if (thoiGianVao > gio_flex_end) {
                const phutMuon = thoiGianVao - gio_flex_end;
                phutThieu += phutMuon;
                if (loaiCa.includes('Ca chiều')) {
                    ghiChu += `Vào muộn: ${phutMuon}p (sau 13:30); `;
                } else if (loaiCa.includes('Ca sáng')) {
                    ghiChu += `Vào muộn: ${phutMuon}p (sau 08:00); `;
                } else {
                    ghiChu += `Vào muộn: ${phutMuon}p (sau 08:00); `;
                }
            }

            // 2. Tính giờ ra chuẩn (HYBRID LOGIC)
            let gio_ra_chuan;
            if (loaiCa.includes('Ca chiều')) {
                // Ca chiều: dynamic trong khung flexible
                gio_ra_chuan = thoiGianVao + gio_lam_yeu_cau; // Vào + 4h
            } else if (loaiCa.includes('Ca sáng')) {
                // Ca sáng: dynamic trong khung flexible
                gio_ra_chuan = thoiGianVao + gio_lam_yeu_cau; // Vào + 4h
            } else {
                // Ca toàn: Dynamic nếu vào trong khung flexible, Fixed nếu vào muộn
                if (thoiGianVao <= gio_flex_end) {
                    // Vào trong khung flexible (7:30-8:00) → Dynamic
                    const gio_vao_flex = Math.max(thoiGianVao, gio_flex_start);
                    gio_ra_chuan = gio_vao_flex + gio_lam_yeu_cau + 60; // Vào + 8h + 1h nghỉ trưa
                } else {
                    // Vào muộn sau 8:00 → Fixed (bị phạt)
                    gio_ra_chuan = 17 * 60 + 30; // 17:30 cố định
                }
            }

            // 3. Tính ra sớm (so với giờ ra chuẩn)
            if (thoiGianRa < gio_ra_chuan) {
                const phutRaSom = gio_ra_chuan - thoiGianRa;
                phutThieu += phutRaSom;
                ghiChu += `Ra sớm: ${phutRaSom}p (chuẩn: ${this.phutSangGio(gio_ra_chuan)}); `;
            }

            // 4. Kiểm tra thời gian làm việc thực tế (có trừ nghỉ trưa cho ca toàn thời gian)
            const phutLamThucTe = this.tinhThoiGianLamThucTe(thoiGianVao, thoiGianRa, loaiCa);
            const phutCanLam = gio_lam_yeu_cau;
            
            if (phutLamThucTe < phutCanLam) {
                const phutThieuGioLam = phutCanLam - phutLamThucTe;
                // Chỉ tính thiếu nếu chưa được tính trong các bước trước
                if (phutThieu < phutThieuGioLam) {
                    phutThieu = phutThieuGioLam;
                    ghiChu = `Thiếu giờ làm: ${phutThieuGioLam}p (làm ${(phutLamThucTe/60).toFixed(1)}h/${(phutCanLam/60)}h, đã trừ nghỉ trưa nếu có); `;
                }
            }

            // Tạo ghi chú chi tiết
            if (phutThieu === 0) {
                ghiChu = `Đủ giờ (${this.phutSangGio(thoiGianVao)} - ${this.phutSangGio(thoiGianRa)}, đã trừ nghỉ trưa nếu có)`;
            } else {
                ghiChu = ghiChu.replace(/; $/, '') + ` → Tổng thiếu: ${phutThieu}p`;
                ghiChu += ` (${this.phutSangGio(thoiGianVao)} - ${this.phutSangGio(thoiGianRa)})`;
            }

        return {
            phut: phutThieu,
            ghiChu: ghiChu
        };
    }

    // Hàm tinhPhutRaSom đã được gộp vào tinhPhutThieuDayDu (logic bù trừ)

    tinhPhutThua(thoiGianVao, thoiGianRa, loaiCa) {
        let gio_ra_chuan;

        // Xác định giờ ra chuẩn theo loại ca
        if (loaiCa.includes('Ca chiều')) {
            gio_ra_chuan = 17 * 60; // 17:00 = 1020 phút cho ca chiều
        } else if (loaiCa.includes('Ca sáng')) {
            gio_ra_chuan = 12 * 60 + 30; // 12:30 = 750 phút cho ca sáng
        } else {
            gio_ra_chuan = 17 * 60 + 30; // 17:30 = 1050 phút cho ca toàn thời gian
        }

        // Kiểm tra xem có làm thêm giờ không
        if (thoiGianRa > gio_ra_chuan) {
            const phutThua = thoiGianRa - gio_ra_chuan;

            // CHỈ TÍNH KHI >= 30 PHÚT
            if (phutThua >= 30) {
                // Làm tròn xuống 15 phút (theo quy định công ty)
                const phutThuaLamTron = Math.floor(phutThua / 15) * 15;

                console.log(`Overtime (${loaiCa}): ${phutThua} phút (>= 30p) → làm tròn xuống ${phutThuaLamTron} phút`);
                return phutThuaLamTron;
            } else {
                console.log(`Overtime (${loaiCa}): ${phutThua} phút (< 30p) → KHÔNG TÍNH`);
                return 0;
            }
        }

        return 0;
    }

    calculateHours(timeIn, timeOut) {
        try {
            const [inHour, inMin] = timeIn.split(':').map(Number);
            const [outHour, outMin] = timeOut.split(':').map(Number);

            const inMinutes = inHour * 60 + inMin;
            let outMinutes = outHour * 60 + outMin;

            // Xử lý trường hợp qua ngày
            if (outMinutes < inMinutes) {
                outMinutes += 24 * 60;
            }

            const totalMinutes = outMinutes - inMinutes;
            return totalMinutes / 60;
        } catch (error) {
            console.error('Lỗi tính toán giờ:', error);
            return 0;
        }
    }

    showResults(analysis) {
        // Xóa modal cũ nếu có
        const existingModal = document.getElementById('terra-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // Tạo modal hiển thị kết quả
        const modal = document.createElement('div');
        modal.id = 'terra-modal';
        modal.className = 'terra-modal-overlay';

        const content = document.createElement('div');
        content.className = 'terra-modal-content';

        const shortageStatus = parseFloat(analysis.phutConThieu) > 0 ? 'shortage' : 'complete';
        const shortageIcon = parseFloat(analysis.phutConThieu) > 0 ? '⚠️' : '✅';
        const shortageText = parseFloat(analysis.phutConThieu) > 0 ? 'Còn thiếu' : 'Đã đủ/thừa';
        const shortageValue = Math.abs(parseFloat(analysis.phutConThieu));
        const shortageUnit = shortageValue >= 60 ? `${(shortageValue / 60).toFixed(1)}h` : `${shortageValue}p`;

        content.innerHTML = `
            <div class="terra-modal-header">
                <h2>📊 Phân tích thời gian Terra (New Logic)</h2>
                <p>Báo cáo chi tiết theo quy tắc chấm công</p>
            </div>
            
            <div class="terra-stats-grid">
                <div class="terra-stat-card">
                    <h3>Ngày làm việc</h3>
                    <div class="value">${analysis.soNgayLamViec}</div>
                </div>
                <div class="terra-stat-card">
                    <h3>Tổng phút thiếu</h3>
                    <div class="value" style="color: #d32f2f;">${analysis.tongPhutThieu}p</div>
                </div>
                <div class="terra-stat-card">
                    <h3>Tổng phút thừa</h3>
                    <div class="value" style="color: #2e7d32;">${analysis.tongPhutThua}p</div>
                </div>
                <div class="terra-stat-card ${shortageStatus}">
                    <h3>${shortageIcon} ${shortageText}</h3>
                    <div class="value">${shortageUnit}</div>
                </div>
            </div>
            
            <div style="margin: 15px 0; padding: 15px; background: #f8f9fa; border-radius: 8px; font-size: 13px;">
                <strong>📋 Tóm tắt:</strong><br>
                • Giờ chuẩn: ${analysis.tongGioLamDuKien}h (${analysis.soNgayLamViec} ngày × 8h)<br>
                • Giờ thực tế: ${analysis.tongGioLamThucTe}h<br>
                • Thiếu: ${analysis.tongPhutThieu} phút | Thừa: ${analysis.tongPhutThua} phút<br>
                • <strong>Kết quả: ${analysis.phutConThieu > 0 ? 'Cần bù' : 'Đã đủ'} ${shortageUnit}</strong><br>
                <small style="color: #666;">* Chỉ tính thừa giờ khi >= 30 phút, làm tròn xuống 15p</small>
            </div>
            
            <div class="terra-actions" style="display: flex; gap: 10px; width: 100%; margin-top: 20px;">
                <button class="terra-btn terra-btn-primary" id="terra-detail-btn" style="flex: 1; padding: 12px 24px; font-size: 14px;">📋 Xem chi tiết</button>
                <button class="terra-btn terra-btn-danger" id="terra-close-btn" style="flex: 1; padding: 12px 24px; font-size: 14px;">✕ Đóng</button>
            </div>
        `;

        modal.appendChild(content);
        document.body.appendChild(modal);

        // Xử lý sự kiện
        document.getElementById('terra-close-btn').addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        document.getElementById('terra-detail-btn').addEventListener('click', () => {
            this.showDetailedResults(analysis);
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }

    showDetailedResults(analysis) {
        // Tạo modal chi tiết
        const modal = document.createElement('div');
        modal.className = 'terra-modal-overlay';

        const content = document.createElement('div');
        content.className = 'terra-modal-content';
        content.style.maxWidth = '900px';

        let tableHTML = `
            <div class="terra-modal-header">
                <h2>📋 Chi tiết thời gian làm việc</h2>
                <p>Phân tích từng ngày theo quy tắc Terra</p>
            </div>
            
            <table class="terra-detail-table">
                <thead>
                    <tr>
                        <th>Ngày</th>
                        <th>Loại ca</th>
                        <th>Vào</th>
                        <th>Ra</th>
                        <th>Thiếu (p)</th>
                        <th>Thừa (p)</th>
                        <th>Ghi chú</th>
                    </tr>
                </thead>
                <tbody>
        `;

        if (analysis.chiTietNgay && analysis.chiTietNgay.length > 0) {
            analysis.chiTietNgay.forEach(ngay => {
                const thieuClass = ngay.phutThieu > 0 ? 'style="color: #d32f2f; font-weight: bold;"' : '';
                const thuaClass = ngay.phutThua > 0 ? 'style="color: #2e7d32; font-weight: bold;"' : '';

                tableHTML += `
                    <tr>
                        <td>${ngay.ngay}</td>
                        <td><small>${ngay.loaiCa}</small></td>
                        <td>${ngay.thoiGianVao ? this.phutSangGio(ngay.thoiGianVao) : '-'}</td>
                        <td>${ngay.thoiGianRa ? this.phutSangGio(ngay.thoiGianRa) : '-'}</td>
                        <td ${thieuClass}>${ngay.phutThieu || 0}</td>
                        <td ${thuaClass}>${ngay.phutThua || 0}</td>
                        <td><small>${ngay.ghiChu || ''}</small></td>
                    </tr>
                `;
            });
        } else {
            // Fallback: hiển thị dữ liệu gốc
            analysis.data.forEach(row => {
                tableHTML += `
                    <tr>
                        <td>${row.ngay}</td>
                        <td>${row.phanLoai}</td>
                        <td>${row.thucTeVao}</td>
                        <td>${row.thucTeRa}</td>
                        <td>-</td>
                        <td>-</td>
                        <td>Dữ liệu gốc</td>
                    </tr>
                `;
            });
        }

        tableHTML += `
                </tbody>
            </table>
            
            <div class="terra-actions" style="width: 100%; display: flex; justify-content: center; margin-top: 20px;">
                <button class="terra-btn terra-btn-danger" id="terra-close-detail-btn" style="width: 100%; min-width: 120px; padding: 12px 24px; font-size: 14px;">✕ Đóng</button>
            </div>
        `;

        content.innerHTML = tableHTML;
        modal.appendChild(content);
        document.body.appendChild(modal);

        // Xử lý sự kiện
        document.getElementById('terra-close-detail-btn').addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }
}

// Khởi tạo khi trang được tải
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new TerraTimeAnalyzer());
} else {
    new TerraTimeAnalyzer();
}
