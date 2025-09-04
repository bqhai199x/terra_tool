// Content script để phân tích bảng chấm công Terra

// Guard against multiple injections
if (window.terraTimeAnalyzerInjected) {
    // Still need to respond to ping messages
    if (!chrome.runtime.onMessage.hasListener(window.terraMessageHandler)) {
        chrome.runtime.onMessage.addListener(window.terraMessageHandler);
    }
} else {
    window.terraTimeAnalyzerInjected = true;
    // Constants for shift types and time calculations
    const SHIFT_TYPES = {
        MORNING: 'Sáng',
        AFTERNOON: 'Chiều',
        FULL_DAY: 'Đầy đủ'
    };

    const TIME_CONSTANTS = {
        WORK_HOURS: {
            HALF_DAY: 4 * 60,    // 4 hours in minutes
            FULL_DAY: 8 * 60,    // 8 hours in minutes
            LUNCH_BREAK: 60      // 1 hour lunch break
        },
        FLEXIBLE_RANGES: {
            FULL_DAY: { start: 7 * 60 + 30, end: 8 * 60 + 30 },     // 07:30-08:30
            MORNING: { start: 7 * 60 + 30, end: 8 * 60 },           // 07:30-08:00
            AFTERNOON: { start: 13 * 60, end: 13 * 60 + 30 }        // 13:00-13:30
        },
        STANDARD_TIMES: {
            MORNING_END: 12 * 60,      // 12:00
            AFTERNOON_START: 13 * 60,   // 13:00
            FIXED_END_TIME: 17 * 60 + 30 // 17:30
        },
        OVERTIME: {
            MIN_MINUTES: 30,    // Minimum 30 minutes to count
            ROUND_INTERVAL: 15  // Round down to 15-minute intervals
        }
    };

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
            // Store handler reference for cleanup
            window.terraMessageHandler = (request, sender, sendResponse) => {
                this.handleMessage(request, sendResponse);
                return true; // Keep message channel open for async responses
            };

            chrome.runtime.onMessage.addListener(window.terraMessageHandler);
        }

        async handleMessage(request, sendResponse) {
            try {
                switch (request.action) {
                    case 'ping':
                        sendResponse({ pong: true, injected: true });
                        break;
                    case 'checkTerraTable':
                        await this.handleCheckTable(sendResponse);
                        break;
                    case 'analyzeTable':
                        await this.handleAnalyzeTable(sendResponse);
                        break;
                    case 'showDetails':
                        await this.handleShowDetails(sendResponse);
                        break;
                    case 'rescanPage':
                        await this.handleRescanPage(sendResponse);
                        break;
                    default:
                        sendResponse({ success: false, error: 'Unknown action' });
                }
            } catch (error) {
                console.error('Error in handleMessage:', error);
                sendResponse({ success: false, error: error.message });
            }
        }

        async handleCheckTable(sendResponse) {
            const found = this.findTerraTable();
            const data = found ? this.getTableInfo() : null;
            sendResponse({ found, data });
        }

        async handleAnalyzeTable(sendResponse) {
            if (!this.terraTable) {
                this.findTerraTable();
            }

            const result = await this.performAnalysis();
            sendResponse(result);
        }

        async handleShowDetails(sendResponse) {
            if (this.tableData && this.tableData.length > 0) {
                const analysis = this.calculateTime(this.tableData);
                this.showDetailedResults(analysis);
                sendResponse({ success: true });
            } else {
                const result = await this.performAnalysis();
                if (result.success) {
                    this.showDetailedResults(result.analysis);
                    sendResponse({ success: true });
                } else {
                    sendResponse({ success: false, error: 'Không có dữ liệu để hiển thị chi tiết' });
                }
            }
        }

        async handleRescanPage(sendResponse) {
            this.reset();
            const foundTable = this.findTerraTable();
            sendResponse({
                found: foundTable,
                message: foundTable ? 'Đã tìm thấy bảng!' : 'Vẫn không tìm thấy bảng'
            });
        }

        reset() {
            this.terraTable = null;
            this.tableData = [];
        }

        // === TIME UTILITY METHODS ===
        timeToMinutes(timeStr) {
            // Chuyển đổi thời gian thành phút từ 00:00
            const parts = timeStr.split(':');
            const hours = parseInt(parts[0]) || 0;
            const minutes = parseInt(parts[1]) || 0;
            return hours * 60 + minutes;
        }

        minutesToTime(minutes) {
            const h = Math.floor(minutes / 60);
            const m = minutes % 60;
            return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        }

        determineShiftType(timeIn, timeOut) {
            const midDay = TIME_CONSTANTS.STANDARD_TIMES.MORNING_END;
            const afternoonStart = TIME_CONSTANTS.STANDARD_TIMES.AFTERNOON_START;

            if (timeIn < afternoonStart && timeOut < afternoonStart) {
                return SHIFT_TYPES.MORNING;
            } else if (timeIn > midDay) {
                return SHIFT_TYPES.AFTERNOON;
            } else {
                return SHIFT_TYPES.FULL_DAY;
            }
        }

        getFlexibleRange(shiftType) {
            switch (shiftType) {
                case SHIFT_TYPES.MORNING:
                    return TIME_CONSTANTS.FLEXIBLE_RANGES.MORNING;
                case SHIFT_TYPES.AFTERNOON:
                    return TIME_CONSTANTS.FLEXIBLE_RANGES.AFTERNOON;
                case SHIFT_TYPES.FULL_DAY:
                default:
                    return TIME_CONSTANTS.FLEXIBLE_RANGES.FULL_DAY;
            }
        }

        getRequiredWorkHours(shiftType) {
            return shiftType === SHIFT_TYPES.FULL_DAY
                ? TIME_CONSTANTS.WORK_HOURS.FULL_DAY
                : TIME_CONSTANTS.WORK_HOURS.HALF_DAY;
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

        // === TABLE DETECTION AND DATA EXTRACTION ===
        findTerraTable() {
            const detectors = [
                this.detectByHeaders.bind(this),
                this.detectByClassName.bind(this),
                this.detectByContent.bind(this)
            ];

            for (const detector of detectors) {
                if (detector()) {
                    return true;
                }
            }
            return false;
        }

        detectByHeaders() {
            const tables = document.querySelectorAll('table');
            const requiredHeaders = ['Ngày', 'Date', 'Phân loại', 'Type', 'Dự kiến', 'Expected', 'Plan', 'Thực tế', 'Actual'];

            for (let table of tables) {
                const headers = table.querySelectorAll('th .cell, th');
                const headerTexts = Array.from(headers).map(h => h.textContent.trim().toLowerCase());

                const matchCount = requiredHeaders.filter(required =>
                    headerTexts.some(header => header.includes(required.toLowerCase()))
                ).length;

                // Cần ít nhất 2 headers khớp để xác định đây là bảng Terra
                if (matchCount >= 2) {
                    this.terraTable = table;
                    return true;
                }
            }
            return false;
        }

        detectByClassName() {
            const elTables = document.querySelectorAll('.el-table, [class*="table"]');
            for (let table of elTables) {
                const allText = table.textContent.toLowerCase();
                if (allText.includes('ngày') && (allText.includes('dự kiến') || allText.includes('thực tế'))) {
                    this.terraTable = table;
                    return true;
                }
            }
            return false;
        }

        detectByContent() {
            // Fallback: tìm bảng có chứa từ khóa liên quan đến chấm công
            const tables = document.querySelectorAll('table');
            const keywords = ['chấm công', 'time', 'attendance', 'giờ làm', 'work'];

            for (let table of tables) {
                const text = table.textContent.toLowerCase();
                if (keywords.some(keyword => text.includes(keyword))) {
                    this.terraTable = table;
                    return true;
                }
            }
            return false;
        }

        // Hàm createAnalyzeButton và analyzeTable đã bị xóa 
        // Extension chỉ hoạt động thông qua popup

        extractTableData() {
            if (!this.terraTable) {
                return [];
            }
            const tbody = this.findTableBody();
            if (!tbody) {
                return [];
            }
            const rows = this.getDataRows(tbody);
            return this.processDataRows(rows);
        }

        findTableBody() {
            // Strategy pattern for finding tbody
            const strategies = [
                () => this.terraTable.closest('.el-table')?.querySelector('.el-table__body tbody'),
                () => this.terraTable.querySelector('tbody'),
                () => this.getRowsDirectly()
            ];

            for (const strategy of strategies) {
                const result = strategy();
                if (result) return result;
            }

            return null;
        }

        getRowsDirectly() {
            const allRows = this.terraTable.querySelectorAll('tr');
            const dataRows = Array.from(allRows).filter(row => {
                const cells = row.querySelectorAll('td');
                return cells.length > 0; // Hàng có td (không chỉ th)
            });

            return dataRows.length > 0 ? { querySelectorAll: () => dataRows } : null;
        }

        getDataRows(tbody) {
            if (tbody.querySelectorAll) {
                return Array.from(tbody.querySelectorAll('tr'));
            }
            return tbody; // Already an array from getRowsDirectly
        }

        processDataRows(rows) {
            const data = [];
            let currentDate = null; // Theo dõi ngày hiện tại

            rows.forEach((row, index) => {
                const rowData = this.extractRowData(row, currentDate);

                if (rowData) {
                    // Cập nhật ngày hiện tại nếu dòng này có ngày mới
                    if (rowData.ngay && this.isValidDate(rowData.ngay)) {
                        currentDate = rowData.ngay;
                    }

                    // Chỉ thêm hàng "Đi làm" có ngày hợp lệ
                    if (this.isWorkRow(rowData)) {
                        data.push(rowData);
                    }
                }
            });

            return data;
        }

        extractRowData(row, currentDate) {
            const cells = this.getRowCells(row);

            if (cells.length < 6) {
                return null; // Không đủ cột dữ liệu
            }

            const ngayText = this.getCellText(cells[0]);

            return {
                ngay: ngayText || currentDate, // Sử dụng ngày hiện tại nếu dòng không có ngày
                phanLoai: this.getCellText(cells[1]),
                duKienVao: this.getCellText(cells[2]),
                duKienRa: this.getCellText(cells[3]),
                thucTeVao: this.getCellTextFromInput(cells[4]), // Cột thực tế vào có input
                thucTeRa: this.getCellTextFromInput(cells[5]),   // Cột thực tế ra có input
                gioLam: cells.length > 6 ? this.getCellText(cells[6]) : '',
                tangCa: cells.length > 7 ? this.getCellText(cells[7]) : ''
            };
        }

        getRowCells(row) {
            // Thử các cách tìm cell khác nhau
            let cells = row.querySelectorAll('td .cell');

            // Nếu không có .cell, thử lấy td trực tiếp
            if (cells.length === 0) {
                cells = row.querySelectorAll('td');
            }

            return cells;
        }

        isValidDate(dateText) {
            return dateText && dateText !== '' && !dateText.includes('Ngày');
        }

        isWorkRow(rowData) {
            const hasValidDate = this.isValidDate(rowData.ngay);
            const isWorkType = rowData.phanLoai && rowData.phanLoai.toLowerCase().includes('đi làm');
            return hasValidDate && isWorkType;
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
            const summary = this.initializeSummary();
            const detailsByDay = [];

            data.forEach(row => {
                // Data đã được lọc chỉ chứa dòng "Đi làm" từ processDataRows()
                summary.workDays += 1;
                const dayDetails = this.calculateDayDetails(row);
                detailsByDay.push(dayDetails);

                summary.totalDeficitMinutes += dayDetails.phutThieu;
                summary.totalOvertimeMinutes += dayDetails.phutThua;
            });
            return this.buildFinalResult(summary, detailsByDay, data);
        }

        initializeSummary() {
            return {
                workDays: 0,
                totalDeficitMinutes: 0,
                totalOvertimeMinutes: 0
            };
        }

        buildFinalResult(summary, detailsByDay, originalData) {
            const netDeficitMinutes = summary.totalDeficitMinutes - summary.totalOvertimeMinutes;
            const netDeficitHours = (netDeficitMinutes / 60).toFixed(2);

            const result = {
                soNgayLamViec: summary.workDays,
                tongPhutThieu: summary.totalDeficitMinutes,
                tongPhutThua: summary.totalOvertimeMinutes,
                phutConThieu: netDeficitMinutes,
                gioConThieu: netDeficitHours,
                tongGioLamDuKien: (summary.workDays * 8).toFixed(2), // 8h/ngày
                tongGioLamThucTe: ((summary.workDays * 8 * 60 - netDeficitMinutes) / 60).toFixed(2),
                chiTietNgay: detailsByDay,
                data: originalData
            };

            return result;
        }

        calculateDayDetails(rowData) {
            const { ngay, thucTeVao, thucTeRa } = rowData;

            // Xử lý trường hợp thiếu dữ liệu thời gian
            if (!this.hasValidTimeData(thucTeVao, thucTeRa)) {
                return this.createEmptyDayResult(ngay);
            }

            const timeIn = this.timeToMinutes(thucTeVao);
            const timeOut = this.timeToMinutes(thucTeRa);
            const shiftType = this.determineShiftType(timeIn, timeOut);

            // Tính thiếu giờ và thừa giờ
            const deficitMinutes = this.calculateDeficitMinutes(timeIn, timeOut, shiftType);
            const overtimeMinutes = this.calculateOvertimeMinutes(timeIn, timeOut, shiftType);

            return {
                ngay,
                loaiCa: shiftType,
                thoiGianVao: timeIn,
                thoiGianRa: timeOut,
                phutThieu: deficitMinutes,
                phutThua: overtimeMinutes
            };
        }

        hasValidTimeData(timeIn, timeOut) {
            return timeIn && timeOut && timeIn !== '--:--' && timeOut !== '--:--';
        }

        createEmptyDayResult(ngay) {
            return {
                ngay,
                loaiCa: 'Chưa xác định',
                phutThieu: 0,
                phutThua: 0
            };
        }

        calculateActualWorkTime(timeIn, timeOut, shiftType) {
            let workTime = timeOut - timeIn;

            // Ca sáng: chỉ tính đến trước 12:00
            if (shiftType === SHIFT_TYPES.MORNING) {
                const morningEnd = TIME_CONSTANTS.STANDARD_TIMES.MORNING_END;
                if (timeOut > morningEnd) {
                    workTime = morningEnd - timeIn;
                }
            }
            // Ca chiều: chỉ tính từ 13:00 trở đi
            else if (shiftType === SHIFT_TYPES.AFTERNOON) {
                const afternoonStart = TIME_CONSTANTS.STANDARD_TIMES.AFTERNOON_START;
                if (timeIn < afternoonStart) {
                    workTime = timeOut - afternoonStart;
                }
            }
            // Ca toàn thời gian: trừ thời gian nghỉ trưa (12:00-13:00)
            else if (shiftType === SHIFT_TYPES.FULL_DAY) {
                const lunchStart = TIME_CONSTANTS.STANDARD_TIMES.MORNING_END;
                const lunchEnd = TIME_CONSTANTS.STANDARD_TIMES.AFTERNOON_START;

                // Chỉ trừ nghỉ trưa nếu làm việc qua khung 12:00-13:00
                if (timeIn < lunchEnd && timeOut > lunchStart) {
                    const actualLunchStart = Math.max(timeIn, lunchStart);
                    const actualLunchEnd = Math.min(timeOut, lunchEnd);
                    const lunchTime = actualLunchEnd - actualLunchStart;
                    workTime -= lunchTime;
                }
            }

            return Math.max(0, workTime);
        }

        // === CALCULATION METHODS ===
        calculateDeficitMinutes(timeIn, timeOut, shiftType) {
            const flexRange = this.getFlexibleRange(shiftType);
            const requiredHours = this.getRequiredWorkHours(shiftType);
            let deficitMinutes = 0;

            // 1. Check late arrival (beyond flexible range)
            if (timeIn > flexRange.end) {
                deficitMinutes += timeIn - flexRange.end;
            }

            // 2. Calculate expected end time using hybrid logic
            const expectedEndTime = this.calculateExpectedEndTime(timeIn, shiftType);

            // 3. Check early departure
            if (timeOut < expectedEndTime) {
                deficitMinutes += expectedEndTime - timeOut;
            }

            // 4. Verify actual work time meets requirements
            const actualWorkTime = this.calculateActualWorkTime(timeIn, timeOut, shiftType);
            if (actualWorkTime < requiredHours) {
                const workDeficit = requiredHours - actualWorkTime;
                // Use the maximum of calculated deficit or work time deficit
                deficitMinutes = Math.max(deficitMinutes, workDeficit);
            }

            return deficitMinutes;
        }

        calculateOvertimeMinutes(timeIn, timeOut, shiftType) {
            const expectedEndTime = this.calculateExpectedEndTime(timeIn, shiftType);

            if (timeOut > expectedEndTime) {
                const overtimeMinutes = timeOut - expectedEndTime;

                // Only count if >= 30 minutes
                if (overtimeMinutes >= TIME_CONSTANTS.OVERTIME.MIN_MINUTES) {
                    // Round down to 15-minute intervals
                    return Math.floor(overtimeMinutes / TIME_CONSTANTS.OVERTIME.ROUND_INTERVAL) * TIME_CONSTANTS.OVERTIME.ROUND_INTERVAL;
                }
            }

            return 0;
        }

        calculateExpectedEndTime(timeIn, shiftType) {
            const flexRange = this.getFlexibleRange(shiftType);
            const requiredHours = this.getRequiredWorkHours(shiftType);

            switch (shiftType) {
                case SHIFT_TYPES.AFTERNOON:
                    // Dynamic: arrival + 4 hours (minimum from 13:00)
                    return Math.max(timeIn, flexRange.start) + requiredHours;

                case SHIFT_TYPES.MORNING:
                    // Dynamic: arrival + 4 hours (maximum until 12:00)
                    const dynamicEnd = Math.max(timeIn, flexRange.start) + requiredHours;
                    return Math.min(dynamicEnd, TIME_CONSTANTS.STANDARD_TIMES.MORNING_END);

                case SHIFT_TYPES.FULL_DAY:
                default:
                    // Hybrid logic: dynamic if within flexible range, fixed if late
                    if (timeIn <= flexRange.end) {
                        // Within flexible range → dynamic
                        const effectiveStart = Math.max(timeIn, flexRange.start);
                        return effectiveStart + requiredHours + TIME_CONSTANTS.WORK_HOURS.LUNCH_BREAK;
                    } else {
                        // Late arrival → fixed end time
                        return TIME_CONSTANTS.STANDARD_TIMES.FIXED_END_TIME;
                    }
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
                <h2>📊 Phân tích thời gian Terra</h2>
                <p>Báo cáo chi tiết theo quy tắc chấm công</p>
            </div>
            
            <div class="terra-stats-grid">
                <div class="terra-stat-card">
                    <h3>Ngày làm việc</h3>
                    <div class="value">${analysis.soNgayLamViec}</div>
                </div>
                <div class="terra-stat-card">
                    <h3>Tổng phút thiếu</h3>
                    <div class="value terra-value-deficit">${analysis.tongPhutThieu}p</div>
                </div>
                <div class="terra-stat-card">
                    <h3>Tổng phút thừa</h3>
                    <div class="value terra-value-surplus">${analysis.tongPhutThua}p</div>
                </div>
                <div class="terra-stat-card ${shortageStatus}">
                    <h3>${shortageIcon} ${shortageText}</h3>
                    <div class="value">${shortageUnit}</div>
                </div>
            </div>
            
            <div class="terra-summary-box">
                <strong>📋 Tóm tắt:</strong><br>
                • Giờ chuẩn: ${analysis.tongGioLamDuKien}h (${analysis.soNgayLamViec} ngày × 8h)<br>
                • Giờ thực tế: ${analysis.tongGioLamThucTe}h<br>
                • Thiếu: ${analysis.tongPhutThieu} phút | Thừa: ${analysis.tongPhutThua} phút<br>
                • <strong>Kết quả: ${analysis.phutConThieu > 0 ? 'Cần bù' : 'Đã đủ'} ${shortageUnit}</strong><br>
                <small class="terra-text-muted">* Chỉ tính thừa giờ khi >= 30 phút, làm tròn xuống 15p</small>
            </div>
            
            <div class="terra-actions-flex">
                <button class="terra-btn terra-btn-primary terra-btn-flex" id="terra-detail-btn">📋 Xem chi tiết</button>
                <button class="terra-btn terra-btn-danger terra-btn-flex" id="terra-close-btn">✕ Đóng</button>
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

            let tableHTML = `
            <div class="terra-modal-header terra-modal-header-with-close">
                <h2>📋 Chi tiết thời gian làm việc</h2>
                <button class="terra-close-x" id="terra-close-detail-btn">✕</button>
            </div>
            
            <div class="terra-table-container">
                <table class="terra-detail-table">
                    <thead class="terra-table-header-sticky">
                        <tr>
                            <th>Ngày</th>
                            <th>Loại ca</th>
                            <th>Vào</th>
                            <th>Ra</th>
                            <th>Thiếu (p)</th>
                            <th>Thừa (p)</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

            if (analysis.chiTietNgay && analysis.chiTietNgay.length > 0) {
                analysis.chiTietNgay.forEach(ngay => {
                    const thieuClass = ngay.phutThieu > 0 ? 'terra-text-danger' : '';

                    // Tạo text cho cột thừa giờ với khoảng thời gian
                    let thuaText = '-';
                    if (ngay.phutThua > 0) {
                        // Sử dụng method calculateExpectedEndTime để tái sử dụng logic
                        const expectedEndTime = this.calculateExpectedEndTime(ngay.thoiGianVao, ngay.loaiCa);
                        const gioRaChuan = this.minutesToTime(expectedEndTime);
                        const gioRaThucTe = this.minutesToTime(ngay.thoiGianRa);
                        thuaText = `<span class="terra-text-success">${ngay.phutThua}</span> (${gioRaChuan}-${gioRaThucTe})`;
                    }

                    // Class CSS cho loại ca
                    const loaiCaClass = (ngay.loaiCa === 'Sáng' || ngay.loaiCa === 'Chiều') ? 'terra-text-warning' : '';

                    // Detect vào muộn và ra sớm để highlight
                    let gioVaoText = ngay.thoiGianVao ? this.minutesToTime(ngay.thoiGianVao) : '-';
                    let gioRaText = ngay.thoiGianRa ? this.minutesToTime(ngay.thoiGianRa) : '-';

                    if (ngay.thoiGianVao && ngay.thoiGianRa) {
                        // Sử dụng helper methods để get flexible range và expected end time
                        const flexRange = this.getFlexibleRange(ngay.loaiCa);
                        const expectedEndTime = this.calculateExpectedEndTime(ngay.thoiGianVao, ngay.loaiCa);

                        // Highlight vào muộn
                        if (ngay.thoiGianVao > flexRange.end) {
                            gioVaoText = `<span class="terra-text-underline">${gioVaoText}</span>`;
                        }

                        // Highlight ra sớm
                        if (ngay.thoiGianRa < expectedEndTime) {
                            gioRaText = `<span class="terra-text-underline">${gioRaText}</span>`;
                        }
                    }

                    tableHTML += `
                    <tr>
                        <td>${ngay.ngay}</td>
                        <td><small class="${loaiCaClass}">${ngay.loaiCa}</small></td>
                        <td>${gioVaoText}</td>
                        <td>${gioRaText}</td>
                        <td class="${thieuClass}">${ngay.phutThieu || '-'}</td>
                        <td>${thuaText}</td>
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
                    </tr>
                `;
                });
            }

            tableHTML += `
                    </tbody>
                </table>
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

    // Store analyzer instance globally to prevent multiple instances
    window.terraAnalyzer = new TerraTimeAnalyzer();

    // End of injection guard
}
