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
        let currentDate = null; // Lưu ngày hiện tại để xử lý trường hợp nghỉ nửa ngày

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
                
                // Xử lý trường hợp nghỉ nửa ngày
                let ngayToUse = ngayText;
                if (!ngayText || ngayText.trim() === '') {
                    // Ô ngày trống - có thể là hàng thứ 2 của nghỉ nửa ngày
                    if (currentDate && phanLoaiText.toLowerCase().includes('đi làm')) {
                        ngayToUse = currentDate + ' (Chiều)'; // Đánh dấu là buổi chiều
                        console.log(`🔄 Phát hiện nghỉ nửa ngày - Hàng ${index + 1}: Sử dụng ngày ${currentDate} cho buổi chiều`);
                    } else {
                        console.log(`⚠️ Bỏ qua hàng ${index + 1}: Không có ngày và không phải trường hợp nghỉ nửa ngày`);
                        return; // Bỏ qua hàng này
                    }
                } else {
                    // Cập nhật ngày hiện tại
                    currentDate = ngayText;
                }

                const rowData = {
                    ngay: ngayToUse,
                    phanLoai: phanLoaiText,
                    duKienVao: this.getCellText(cells[2]),
                    duKienRa: this.getCellText(cells[3]),
                    thucTeVao: this.getCellTextFromInput(cells[4]), // Cột thực tế vào có input
                    thucTeRa: this.getCellTextFromInput(cells[5]),   // Cột thực tế ra có input
                    gioLam: cells.length > 6 ? this.getCellText(cells[6]) : '',
                    tangCa: cells.length > 7 ? this.getCellText(cells[7]) : ''
                };
                
                console.log('Dữ liệu hàng:', rowData);
                
                // Chỉ thêm hàng có ngày hợp lệ (bao gồm trường hợp nghỉ nửa ngày)
                if (rowData.ngay && rowData.ngay !== '' && !rowData.ngay.includes('Ngày')) {
                    data.push(rowData);
                }
            }
        });

        console.log(`✅ Trích xuất được ${data.length} hàng dữ liệu hợp lệ (bao gồm nghỉ nửa ngày)`);
        return data;
    }

    getCellText(cell) {
        if (!cell) return '';
        
        // Lấy text thường từ .cell hoặc trực tiếp từ element
        const cellDiv = cell.querySelector('.cell');
        let text = cellDiv ? cellDiv.textContent.trim() : cell.textContent.trim();
        
        // Làm sạch text cho cột phân loại - chỉ lấy dòng đầu tiên
        const lines = text.split('\n');
        if (lines.length > 1) {
            // Lấy dòng đầu tiên không rỗng
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
            // Kiểm tra phân loại - tính cả nghỉ nửa ngày  
            const phanLoaiClean = row.phanLoai.toLowerCase();
            const isWorkDay = phanLoaiClean.includes('đi làm') || phanLoaiClean.includes('work') || phanLoaiClean.includes('làm việc');
            const isHalfDayLeave = row.ngay.includes('(Chiều)') || row.ngay.includes('(Sáng)'); // Nghỉ nửa ngày
            
            if (isWorkDay || isHalfDayLeave) {
                // Đếm ngày làm việc (bao gồm nghỉ nửa ngày)
                if (isWorkDay) {
                    if (isHalfDayLeave) {
                        soNgayLamViec += 0.5; // Nghỉ nửa ngày chỉ tính 0.5 ngày
                        console.log(`📅 Nghỉ nửa ngày: ${row.ngay} (+0.5 ngày)`);
                    } else {
                        soNgayLamViec += 1; // Ngày làm việc đầy đủ
                        console.log(`📅 Ngày làm việc đầy đủ: ${row.ngay} (+1 ngày)`);
                    }
                    
                    const thongTinNgay = this.tinhToanNgay(row);
                    chiTietNgay.push(thongTinNgay);
                    
                    tongPhutThieu += thongTinNgay.phutThieu;
                    tongPhutThua += thongTinNgay.phutThua;
                    
                    console.log(`Ngày ${row.ngay}:`, thongTinNgay);
                }
            } else {
                console.log(`Bỏ qua ngày ${row.ngay} - Phân loại: ${row.phanLoai}`);
            }
        });

        const phutConThieu = tongPhutThieu - tongPhutThua;
        const gioConThieu = (phutConThieu / 60).toFixed(2);

        const ketQua = {
            soNgayLamViec,
            tongPhutThieu,
            tongPhutThua, 
            phutConThieu,
            gioConThieu,
            tongGioLamDuKien: (soNgayLamViec * 8).toFixed(2), // 8h/ngày (bao gồm nửa ngày)
            tongGioLamThucTe: ((soNgayLamViec * 8 * 60 - phutConThieu) / 60).toFixed(2),
            chiTietNgay,
            data,
            // Thêm thông tin về nghỉ nửa ngày
            coNghiNuaNgay: chiTietNgay.some(ngay => ngay.loaiCa.includes('Nửa ngày'))
        };

        console.log('📊 Kết quả tính toán:', ketQua);
        return ketQua;
    }

    tinhToanNgay(rowData) {
        const { ngay, thucTeVao, thucTeRa } = rowData;
        
        // Xử lý trường hợp nghỉ nửa ngày
        const isHalfDay = ngay.includes('(Chiều)') || ngay.includes('(Sáng)');
        
        if (!thucTeVao || !thucTeRa || thucTeVao === '--:--' || thucTeRa === '--:--') {
            return {
                ngay,
                loaiCa: isHalfDay ? 'Nghỉ nửa ngày' : 'Không xác định',
                phutThieu: isHalfDay ? 240 : 0, // Nghỉ nửa ngày = thiếu 4h = 240 phút
                phutThua: 0,
                ghiChu: isHalfDay ? 'Nghỉ nửa ngày (thiếu 4h)' : 'Thiếu dữ liệu thời gian'
            };
        }

        const thoiGianVao = this.chuanHoaGio(thucTeVao);
        const thoiGianRa = this.chuanHoaGio(thucTeRa);
        
        // Xác định loại ca
        let loaiCa = this.xacDinhLoaiCa(thoiGianVao);
        if (isHalfDay) {
            loaiCa += ' (Nửa ngày)';
        }
        
        // Tính thiếu giờ - bao gồm cả vào muộn và ra sớm
        let thongTinThieu;
        if (isHalfDay) {
            thongTinThieu = this.tinhPhutThieuNuaNgay(thoiGianVao, thoiGianRa);
        } else {
            thongTinThieu = this.tinhPhutThieuDayDu(thoiGianVao, thoiGianRa, loaiCa);
        }
        
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

    xacDinhLoaiCa(thoiGianVao) {
        const giua_ngay = 12 * 60; // 12:00 = 720 phút
        
        if (thoiGianVao < giua_ngay) {
            return 'Ca toàn thời gian';
        } else {
            return 'Ca chiều';
        }
    }

    tinhPhutThieuDayDu(thoiGianVao, thoiGianRa, loaiCa) {
        // Logic HYBRID: Dynamic cho vào sớm, Fixed cho vào muộn
        let gio_vao_chuan, gio_lam_yeu_cau;
        
        // Xác định khung giờ chuẩn theo loại ca
        if (loaiCa.includes('Ca chiều') || loaiCa.includes('Nửa ngày')) {
            gio_vao_chuan = 13 * 60; // 13:00
            gio_lam_yeu_cau = 4 * 60; // 4 giờ = 240 phút
        } else {
            gio_vao_chuan = 8 * 60 + 30; // 08:30
            gio_lam_yeu_cau = 8 * 60; // 8 giờ = 480 phút
        }
        
        let phutThieu = 0;
        let ghiChu = '';
        
        // 1. Tính penalty vào quá sớm
        const gio_som_qua = 7 * 60 + 30; // 07:30
        if (thoiGianVao < gio_som_qua && !loaiCa.includes('Ca chiều')) {
            phutThieu += 30;
            ghiChu += 'Penalty vào quá sớm: 30p; ';
        }
        
        // 2. Tính vào muộn (so với giờ chuẩn)
        if (thoiGianVao > gio_vao_chuan) {
            const phutMuon = thoiGianVao - gio_vao_chuan;
            phutThieu += phutMuon;
            ghiChu += `Vào muộn: ${phutMuon}p; `;
        }
        
        // 3. Tính giờ ra chuẩn (HYBRID LOGIC)
        let gio_ra_chuan;
        if (loaiCa.includes('Ca chiều') || loaiCa.includes('Nửa ngày')) {
            // Ca chiều: luôn dùng logic dynamic
            gio_ra_chuan = thoiGianVao + gio_lam_yeu_cau; // Vào + 4h
        } else {
            // Ca toàn: Dynamic nếu vào sớm, Fixed nếu vào muộn
            if (thoiGianVao <= gio_vao_chuan) {
                // Vào sớm/đúng giờ → Dynamic (được thưởng)
                gio_ra_chuan = thoiGianVao + gio_lam_yeu_cau + 60; // Vào + 8h + 1h nghỉ trưa
            } else {
                // Vào muộn → Fixed (bị phạt)
                gio_ra_chuan = 17 * 60 + 30; // 17:30 cố định
            }
        }
        
        // 4. Tính ra sớm (so với giờ ra chuẩn)
        if (thoiGianRa < gio_ra_chuan) {
            const phutRaSom = gio_ra_chuan - thoiGianRa;
            phutThieu += phutRaSom;
            ghiChu += `Ra sớm: ${phutRaSom}p (chuẩn: ${this.phutSangGio(gio_ra_chuan)}); `;
        }
        
        // Tạo ghi chú chi tiết
        if (phutThieu === 0) {
            ghiChu = `Đủ giờ (${this.phutSangGio(thoiGianVao)} - ${this.phutSangGio(thoiGianRa)})`;
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

    tinhPhutThieuNuaNgay(thoiGianVao, thoiGianRa) {
        // Tính toán cho trường hợp nghỉ nửa ngày (chỉ cần làm 4h)
        const gioLamThucTe = (thoiGianRa - thoiGianVao) / 60; // Convert sang giờ
        const gioCanLam = 4; // Nửa ngày = 4 giờ
        
        if (gioLamThucTe >= gioCanLam) {
            return {
                phut: 0,
                ghiChu: `Đủ giờ nửa ngày (${gioLamThucTe.toFixed(1)}h/${gioCanLam}h)`
            };
        } else {
            const phutThieu = (gioCanLam - gioLamThucTe) * 60;
            return {
                phut: Math.round(phutThieu),
                ghiChu: `Thiếu ${Math.round(phutThieu)} phút (${gioLamThucTe.toFixed(1)}h/${gioCanLam}h)`
            };
        }
    }

    tinhPhutThieu(thoiGianVao) {
        const gio_chuan_sang = 8 * 60 + 30; // 08:30 = 510 phút (ca toàn thời gian)
        const gio_chuan_chieu = 13 * 60; // 13:00 = 780 phút (ca chiều)
        const gio_som_qua = 7 * 60 + 30; // 07:30 = 450 phút
        const gio_huan_luyen = 8 * 60; // 08:00 = 480 phút
        const giua_ngay = 12 * 60; // 12:00 = 720 phút

        // Xác định loại ca dựa trên thời gian vào
        if (thoiGianVao >= giua_ngay) {
            // CA CHIỀU (từ 12:00 trở đi) - chuẩn là 13:00
            if (thoiGianVao > gio_chuan_chieu) {
                const phutMuon = thoiGianVao - gio_chuan_chieu;
                return {
                    phut: phutMuon,
                    ghiChu: `Ca chiều vào muộn ${phutMuon} phút (${this.phutSangGio(thoiGianVao)} vs 13:00)`
                };
            } else {
                return {
                    phut: 0,
                    ghiChu: `Ca chiều đúng giờ (${this.phutSangGio(thoiGianVao)})`
                };
            }
        } else {
            // CA TOÀN THỜI GIAN (trước 12:00) - chuẩn là 08:30
            // Trường hợp đặc biệt: Vào quá sớm (trước 7:30)
            if (thoiGianVao < gio_som_qua) {
                return {
                    phut: 30, // Penalty 30 phút
                    ghiChu: `Vào quá sớm (${this.phutSangGio(thoiGianVao)}), penalty 30 phút`
                };
            }

            // Trường hợp đặc biệt: Vào trong khoảng 7:30-8:00 (có thể training)
            if (thoiGianVao >= gio_som_qua && thoiGianVao <= gio_huan_luyen) {
                return {
                    phut: 0,
                    ghiChu: `Vào sớm hợp lệ (${this.phutSangGio(thoiGianVao)})`
                };
            }

            // Trường hợp vào muộn sau 8:30
            if (thoiGianVao > gio_chuan_sang) {
                const phutMuon = thoiGianVao - gio_chuan_sang;
                return {
                    phut: phutMuon,
                    ghiChu: `Vào muộn ${phutMuon} phút (${this.phutSangGio(thoiGianVao)})`
                };
            }

            // Vào đúng giờ hoặc sớm hợp lệ
            return {
                phut: 0,
                ghiChu: `Đúng giờ (${this.phutSangGio(thoiGianVao)})`
            };
        }
    }

    tinhPhutThua(thoiGianVao, thoiGianRa, loaiCa) {
        let gio_ra_chuan;
        
        // Xác định giờ ra chuẩn theo loại ca
        if (loaiCa.includes('Ca chiều') || loaiCa.includes('Nửa ngày')) {
            gio_ra_chuan = 17 * 60; // 17:00 = 1020 phút cho ca chiều
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
        const shortageUnit = shortageValue >= 60 ? `${(shortageValue/60).toFixed(1)}h` : `${shortageValue}p`;

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
                ${analysis.coNghiNuaNgay ? '<span style="color: #ff9800;">⚠️ Có nghỉ nửa ngày (đã tính vào kết quả)</span><br>' : ''}
                <small style="color: #666;">* Chỉ tính thừa giờ khi >= 30 phút, làm tròn xuống 15p</small>
            </div>
            
            <div class="terra-actions">
                <button class="terra-btn terra-btn-primary" id="terra-detail-btn">📋 Xem chi tiết</button>
                <button class="terra-btn terra-btn-danger" id="terra-close-btn">✕ Đóng</button>
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
            
            <div style="margin: 15px 0; padding: 10px; background: #f0f7ff; border-radius: 6px; font-size: 12px;">
                <strong>📘 Quy tắc tính toán:</strong><br>
                • <strong>Thiếu:</strong> Vào muộn sau 8:30, vào quá sớm trước 7:30 (penalty 30p)<br>
                • <strong>Thừa:</strong> Ra sau 17:30 (ca toàn) hoặc 17:00 (ca chiều), <strong>CHỈ TÍNH KHI >= 30 PHÚT</strong>, làm tròn xuống 15p<br>
                • <strong>Ca chiều:</strong> Vào từ 12:00 trở đi<br>
                • <strong>Kết quả:</strong> Tổng thiếu - Tổng thừa = Thời gian cần bù
            </div>
            
            <div class="terra-actions">
                <button class="terra-btn terra-btn-danger" id="terra-close-detail-btn">✕ Đóng</button>
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
