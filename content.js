// Content script để phân tích bảng chấm công Terra

// Guard against multiple injections
if (window.terraTimeAnalyzerInjected) {
    // Still need to respond to ping messages
    if (!chrome.runtime.onMessage.hasListener(window.terraMessageHandler)) {
        chrome.runtime.onMessage.addListener(window.terraMessageHandler);
    }
} else {
    window.terraTimeAnalyzerInjected = true;
    // Default configuration - can be overridden by user settings
    const DEFAULT_CONFIG = {
        WORK_HOURS: {
            FULL_DAY: 8 * 60
        },
        OVERTIME: {
            MIN_MINUTES: 30,
            ROUND_INTERVAL: 15
        }
    };

    // Configuration management
    const CONFIG_MANAGER = {
        // Load configuration from localStorage or use defaults
        loadConfig() {
            try {
                const savedConfig = localStorage.getItem('terra_time_config');
                if (savedConfig) {
                    const userConfig = JSON.parse(savedConfig);
                    return this.mergeConfig(DEFAULT_CONFIG, userConfig);
                }
            } catch (error) {
                console.warn('Failed to load Terra config from localStorage:', error);
            }
            return this.getDefaultConfig();
        },

        // Save configuration to localStorage
        saveConfig(config) {
            try {
                localStorage.setItem('terra_time_config', JSON.stringify(config));
                return true;
            } catch (error) {
                console.error('Failed to save Terra config to localStorage:', error);
                return false;
            }
        },

        // Merge user config with defaults
        mergeConfig(defaultConfig, userConfig) {
            const merged = JSON.parse(JSON.stringify(defaultConfig));
            
            if (userConfig.WORK_HOURS) {
                if (userConfig.WORK_HOURS.FULL_DAY) {
                    merged.WORK_HOURS.FULL_DAY = userConfig.WORK_HOURS.FULL_DAY;
                }
            }

            if (userConfig.OVERTIME) {
                if (userConfig.OVERTIME.MIN_MINUTES) {
                    merged.OVERTIME.MIN_MINUTES = userConfig.OVERTIME.MIN_MINUTES;
                }
                if (userConfig.OVERTIME.ROUND_INTERVAL) {
                    merged.OVERTIME.ROUND_INTERVAL = userConfig.OVERTIME.ROUND_INTERVAL;
                }
            }

            return merged;
        },

        // Get default configuration
        getDefaultConfig() {
            return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
        },

        // Reset to default configuration
        resetConfig() {
            localStorage.removeItem('terra_time_config');
            return this.getDefaultConfig();
        }
    };

    // Load current configuration
    let USER_CONFIG = CONFIG_MANAGER.loadConfig();

    // Constants for shift types and time calculations
    const SHIFT_TYPES = {
        MORNING: 'Sáng',
        AFTERNOON: 'Chiều',
        FULL_DAY: 'Đầy đủ'
    };

    // Dynamic TIME_CONSTANTS that uses current configuration
    const TIME_CONSTANTS = {
        get WORK_HOURS() {
            return {
                HALF_DAY: Math.floor(USER_CONFIG.WORK_HOURS.FULL_DAY / 2),
                FULL_DAY: USER_CONFIG.WORK_HOURS.FULL_DAY,
                LUNCH_BREAK: 60
            };
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
        get OVERTIME() {
            return {
                MIN_MINUTES: USER_CONFIG.OVERTIME.MIN_MINUTES,
                ROUND_INTERVAL: USER_CONFIG.OVERTIME.ROUND_INTERVAL
            };
        }
    };

    // Function to check if current page is Terra timesheet
    function isTerraTimesheetPage() {
        const currentUrl = window.location.href;
        // More strict URL validation - must start with the Terra timesheet URL
        return currentUrl.startsWith('https://client.terra-plat.vn/time-sheet');
    }

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
                    case 'getConfig':
                        await this.handleGetConfig(sendResponse);
                        break;
                    case 'updateConfig':
                        await this.handleUpdateConfig(request.config, sendResponse);
                        break;
                    case 'resetConfig':
                        await this.handleResetConfig(sendResponse);
                        break;
                    case 'showConfigModal':
                        await this.handleShowConfigModal(sendResponse);
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
            if (!isTerraTimesheetPage()) {
                sendResponse({ 
                    found: false, 
                    data: null,
                    error: 'Không phải trang Terra timesheet.<br/>Vui lòng truy cập <a href="https://client.terra-plat.vn/time-sheet" target="_blank" class="terra-link-external">https://client.terra-plat.vn/time-sheet</a>'
                });
                return;
            }

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

        async handleGetConfig(sendResponse) {
            const currentConfig = {
                ...USER_CONFIG,
                WORK_HOURS: {
                    ...USER_CONFIG.WORK_HOURS,
                    HALF_DAY: Math.floor(USER_CONFIG.WORK_HOURS.FULL_DAY / 2)
                }
            };
            sendResponse({ success: true, config: currentConfig });
        }

        async handleUpdateConfig(newConfig, sendResponse) {
            try {
                // Validate configuration
                if (!this.validateConfig(newConfig)) {
                    throw new Error('Cấu hình không hợp lệ');
                }

                // Update global config
                USER_CONFIG = CONFIG_MANAGER.mergeConfig(USER_CONFIG, newConfig);
                
                // Save to localStorage
                const saved = CONFIG_MANAGER.saveConfig(USER_CONFIG);
                if (!saved) {
                    throw new Error('Không thể lưu cấu hình');
                }

                sendResponse({ 
                    success: true, 
                    message: 'Cập nhật cấu hình thành công',
                    config: USER_CONFIG 
                });
            } catch (error) {
                sendResponse({ success: false, error: error.message });
            }
        }

        async handleResetConfig(sendResponse) {
            try {
                USER_CONFIG = CONFIG_MANAGER.resetConfig();
                sendResponse({ 
                    success: true, 
                    message: 'Đã khôi phục cấu hình mặc định',
                    config: USER_CONFIG 
                });
            } catch (error) {
                sendResponse({ success: false, error: error.message });
            }
        }

        async handleShowConfigModal(sendResponse) {
            this.showConfigModal();
            sendResponse({ success: true });
        }

        validateConfig(config) {
            if (config.WORK_HOURS) {
                if (config.WORK_HOURS.FULL_DAY && 
                    (config.WORK_HOURS.FULL_DAY < 60 || config.WORK_HOURS.FULL_DAY > 12 * 60)) {
                    return false;
                }
            }

            if (config.OVERTIME) {
                if (config.OVERTIME.MIN_MINUTES && 
                    (config.OVERTIME.MIN_MINUTES < 1 || config.OVERTIME.MIN_MINUTES > 120)) {
                    return false;
                }
                if (config.OVERTIME.ROUND_INTERVAL && 
                    (config.OVERTIME.ROUND_INTERVAL < 1 || config.OVERTIME.ROUND_INTERVAL > 60)) {
                    return false;
                }
            }

            return true;
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
            const pendingData = []; // Lưu tạm dữ liệu làm bù và nghỉ phép chưa merge

            rows.forEach((row, index) => {
                const rowData = this.extractRowData(row, currentDate);

                if (rowData) {
                    // Cập nhật ngày hiện tại nếu dòng này có ngày mới
                    if (rowData.ngay && this.isValidDate(rowData.ngay)) {
                        currentDate = rowData.ngay;
                    }

                    // Chỉ thêm hàng "Đi làm" có ngày hợp lệ
                    // Làm bù và nghỉ phép sẽ được merge vào dòng đi làm cùng ngày
                    if (this.isWorkRow(rowData)) {
                        // Merge pending data (compensation/leave) từ cùng ngày
                        const pendingForThisDay = pendingData.filter(p => p.ngay === rowData.ngay);
                        pendingForThisDay.forEach(pendingItem => {
                            if (pendingItem.type === 'compensation') {
                                rowData.gioLamBu = pendingItem.gioLam;
                                rowData.duKienVaoLamBu = pendingItem.duKienVao;
                                rowData.duKienRaLamBu = pendingItem.duKienRa;
                            } else if (pendingItem.type === 'leave') {
                                rowData.noteNghiPhep = pendingItem.phanLoai;
                                rowData.gioLam = pendingItem.gioLam; // Số giờ nghỉ
                            }
                        });
                        // Xóa pending data đã merge
                        pendingData.splice(0, pendingData.length, ...pendingData.filter(p => p.ngay !== rowData.ngay));
                        
                        data.push(rowData);
                    } else if (this.isCompensationRow(rowData)) {
                        // Tìm dòng đi làm cùng ngày và merge thông tin làm bù vào
                        const workRowSameDay = data.find(d => d.ngay === rowData.ngay && this.isWorkRow(d));
                        if (workRowSameDay) {
                            workRowSameDay.gioLamBu = rowData.gioLam;
                            workRowSameDay.duKienVaoLamBu = rowData.duKienVao;
                            workRowSameDay.duKienRaLamBu = rowData.duKienRa;
                        } else {
                            // Chưa có dòng work, lưu tạm
                            pendingData.push({ ...rowData, type: 'compensation' });
                        }
                    } else if (this.isLeaveRow(rowData)) {
                        // Tìm dòng đi làm cùng ngày và merge thông tin nghỉ phép vào
                        const workRowSameDay = data.find(d => d.ngay === rowData.ngay && this.isWorkRow(d));
                        if (workRowSameDay) {
                            workRowSameDay.noteNghiPhep = rowData.phanLoai;
                            workRowSameDay.gioLam = rowData.gioLam; // Số giờ nghỉ
                        } else {
                            // Chưa có dòng work, lưu tạm
                            pendingData.push({ ...rowData, type: 'leave' });
                        }
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

        isCompensationRow(rowData) {
            const isCompensation = rowData.phanLoai && rowData.phanLoai.toLowerCase().includes('làm bù');
            return isCompensation;
        }

        isLeaveRow(rowData) {
            // Chỉ tính nghỉ phép năm
            const isAnnualLeave = rowData.phanLoai && 
                rowData.phanLoai.toLowerCase().includes('nghỉ phép năm');
            return isAnnualLeave;
        }

        getCellText(cell) {
            if (!cell) return '';

            // Lấy text thường từ .cell hoặc trực tiếp từ element
            const cellDiv = cell.querySelector('.cell');
            
            // Ưu tiên lấy span không phải .text-muted (bỏ qua dự kiến trong ngoặc)
            const nonMutedSpans = cellDiv ? cellDiv.querySelectorAll('span:not(.text-muted)') : cell.querySelectorAll('span:not(.text-muted)');
            if (nonMutedSpans.length > 0) {
                const firstSpanText = nonMutedSpans[0].textContent.trim();
                if (firstSpanText) {
                    return firstSpanText;
                }
            }
            
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
                // Xử lý đi làm (có thể có làm bù và/hoặc nghỉ phép)
                if (this.isWorkRow(row)) {
                    // Đi làm bình thường
                    summary.workDays += 1;
                    const dayDetails = this.calculateDayDetails(row);
                    detailsByDay.push(dayDetails);
                    summary.totalDeficitMinutes += dayDetails.phutThieu;
                    summary.totalOvertimeMinutes += dayDetails.phutThua;
                    summary.totalCompensationMinutes += dayDetails.phutLamBu || 0;
                    
                    // Tính nghỉ phép nếu có (có thể nửa ngày)
                    if (dayDetails.soNgayNghi > 0) {
                        summary.leaveDays += dayDetails.soNgayNghi;
                    }
                }
            });
            return this.buildFinalResult(summary, detailsByDay, data);
        }

        initializeSummary() {
            return {
                workDays: 0,
                totalDeficitMinutes: 0,
                totalOvertimeMinutes: 0,
                totalCompensationMinutes: 0,
                leaveDays: 0
            };
        }

        buildFinalResult(summary, detailsByDay, originalData) {
            const netDeficitMinutes = summary.totalDeficitMinutes - summary.totalOvertimeMinutes - summary.totalCompensationMinutes;
            const netDeficitHours = (netDeficitMinutes / 60).toFixed(2);
            const dailyWorkHours = (USER_CONFIG.WORK_HOURS.FULL_DAY / 60).toFixed(2);
            const dailyWorkMinutes = USER_CONFIG.WORK_HOURS.FULL_DAY;

            const result = {
                soNgayLamViec: summary.workDays,
                tongPhutThieu: summary.totalDeficitMinutes,
                tongPhutThua: summary.totalOvertimeMinutes, // Chỉ overtime, không cộng compensation
                tongPhutLamBu: summary.totalCompensationMinutes,
                soNgayNghiPhep: parseFloat(summary.leaveDays.toFixed(2)),
                phutConThieu: netDeficitMinutes,
                gioConThieu: netDeficitHours,
                tongGioLamDuKien: (summary.workDays * parseFloat(dailyWorkHours)).toFixed(2),
                tongGioLamThucTe: ((summary.workDays * dailyWorkMinutes - netDeficitMinutes) / 60).toFixed(2),
                chiTietNgay: detailsByDay,
                data: originalData
            };

            return result;
        }

        calculateCompensationDetails(rowData) {
            const { ngay, gioLam } = rowData;
            
            // Parse giờ làm bù từ cột "Giờ làm" - format: (+0.5), (+1), (+1.25)
            let compensationMinutes = 0;
            if (gioLam) {
                const match = gioLam.match(/\(\+?([\d.]+)\)/);
                if (match) {
                    const hours = parseFloat(match[1]);
                    compensationMinutes = Math.round(hours * 60);
                }
            }

            return {
                ngay,
                loaiCa: 'Làm bù',
                phutLamBu: compensationMinutes,
                phutThieu: 0,
                phutThua: 0
            };
        }

        calculateLeaveDetails(rowData) {
            const { ngay, phanLoai } = rowData;
            
            return {
                ngay,
                loaiCa: 'Nghỉ phép',
                loaiNghi: phanLoai,
                phutThieu: 0,
                phutThua: 0,
                phutLamBu: 0,
                khungGioLamBu: ''
            };
        }

        calculateDayDetails(rowData) {
            const { ngay, thucTeVao, thucTeRa, duKienVao, duKienRa } = rowData;

            // Xử lý trường hợp thiếu dữ liệu thời gian
            if (!this.hasValidTimeData(thucTeVao, thucTeRa)) {
                return this.createEmptyDayResult(ngay);
            }

            const timeIn = this.timeToMinutes(thucTeVao);
            const timeOut = this.timeToMinutes(thucTeRa);
            
            // Parse nghỉ phép nếu có (xác định nghỉ nửa ngày)
            let leaveDays = 0;
            let leaveNote = '';
            let leaveType = null; // 'morning' hoặc 'afternoon'
            if (rowData.noteNghiPhep) {
                leaveNote = rowData.noteNghiPhep;
                
                // Xác định nghỉ nửa ngày dựa vào khung giờ dự kiến
                if (duKienVao && duKienRa) {
                    const expectedIn = this.timeToMinutes(duKienVao);
                    const expectedOut = this.timeToMinutes(duKienRa);
                    
                    // Nghỉ sáng: dự kiến 08:00-12:00 hoặc kết thúc trước 13:00
                    if (expectedOut <= TIME_CONSTANTS.STANDARD_TIMES.AFTERNOON_START) {
                        leaveType = 'morning';
                        leaveDays = 0.5;
                    }
                    // Nghỉ chiều: dự kiến 13:00-17:00 hoặc bắt đầu từ 13:00
                    else if (expectedIn >= TIME_CONSTANTS.STANDARD_TIMES.AFTERNOON_START) {
                        leaveType = 'afternoon';
                        leaveDays = 0.5;
                    }
                    // Nghỉ cả ngày: qua cả sáng và chiều
                    else {
                        leaveDays = 1;
                    }
                } else {
                    // Fallback: parse từ cột "Giờ làm"
                    if (rowData.gioLam) {
                        const match = rowData.gioLam.match(/\(([\d.]+)\)/);
                        if (match) {
                            leaveDays = parseFloat(match[1]);
                        } else {
                            leaveDays = 1;
                        }
                    } else {
                        leaveDays = 1;
                    }
                }
            }
            
            const shiftType = this.determineShiftType(timeIn, timeOut);

            // Tính thiếu giờ và thừa giờ (điều chỉnh nếu có nghỉ phép nửa ngày)
            let deficitMinutes = this.calculateDeficitMinutes(timeIn, timeOut, shiftType);
            let overtimeMinutes = this.calculateOvertimeMinutes(timeIn, timeOut, shiftType);
            
            // Điều chỉnh khi có nghỉ phép nửa ngày
            if (leaveType === 'morning' && shiftType === SHIFT_TYPES.AFTERNOON) {
                // Nghỉ sáng, làm chiều → không tính thiếu (đã nghỉ phép)
                deficitMinutes = 0;
            } else if (leaveType === 'afternoon' && shiftType === SHIFT_TYPES.MORNING) {
                // Nghỉ chiều, làm sáng → không tính thiếu (đã nghỉ phép)
                deficitMinutes = 0;
            }

            // Parse giờ làm bù nếu có (cho phép cả khi có nghỉ phép nửa ngày)
            let compensationMinutes = 0;
            let compensationTimeRange = '';
            if (rowData.gioLamBu) {
                const match = rowData.gioLamBu.match(/\(\+?([\d.]+)\)/);
                if (match) {
                    const hours = parseFloat(match[1]);
                    compensationMinutes = Math.round(hours * 60);
                    // Tạo khung giờ làm bù từ dự kiến vào/ra (với khoảng trắng)
                    if (rowData.duKienVaoLamBu && rowData.duKienRaLamBu) {
                        compensationTimeRange = `${rowData.duKienVaoLamBu} - ${rowData.duKienRaLamBu}`;
                    }
                }
            }

            return {
                ngay,
                loaiCa: shiftType,
                thoiGianVao: timeIn,
                thoiGianRa: timeOut,
                phutThieu: deficitMinutes,
                phutThua: overtimeMinutes,
                phutLamBu: compensationMinutes,
                khungGioLamBu: compensationTimeRange,
                soNgayNghi: leaveDays,
                noteNghiPhep: leaveNote,
                leaveType: leaveType // 'morning', 'afternoon' hoặc null
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
                phutThua: 0,
                phutLamBu: 0,
                khungGioLamBu: '',
                soNgayNghi: 0,
                noteNghiPhep: ''
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

                if (overtimeMinutes >= TIME_CONSTANTS.OVERTIME.MIN_MINUTES) {
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
                    return Math.max(timeIn, flexRange.start) + requiredHours;

                case SHIFT_TYPES.MORNING:
                    const dynamicEnd = Math.max(timeIn, flexRange.start) + requiredHours;
                    return Math.min(dynamicEnd, TIME_CONSTANTS.STANDARD_TIMES.MORNING_END);

                case SHIFT_TYPES.FULL_DAY:
                default:
                    if (timeIn <= flexRange.end) {
                        const effectiveStart = Math.max(timeIn, flexRange.start);
                        return effectiveStart + requiredHours + TIME_CONSTANTS.WORK_HOURS.LUNCH_BREAK;
                    } else {
                        return TIME_CONSTANTS.STANDARD_TIMES.FIXED_END_TIME;
                    }
            }
        }

        // === DATE & WEEK UTILITIES ===
        
        parseDateFromString(dateText) {
            if (!dateText) return null;

            const match = dateText.trim().match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/);
            if (!match) return null;

            const day = parseInt(match[1], 10);
            const month = parseInt(match[2], 10);
            const year = this.inferYear(month, match[3]);

            return this.createValidatedDate(year, month, day);
        }

        inferYear(month, yearString) {
            if (yearString) {
                const year = parseInt(yearString, 10);
                return yearString.length === 2 
                    ? (year >= 50 ? 1900 + year : 2000 + year)
                    : year;
            }

            // Auto-detect year for cross-year weeks
            const now = new Date();
            const currentYear = now.getFullYear();
            const currentMonth = now.getMonth();

            if (month === 12 && currentMonth === 0) return currentYear - 1;
            if (month === 1 && currentMonth === 11) return currentYear + 1;
            
            return currentYear;
        }

        createValidatedDate(year, month, day) {
            const date = new Date(year, month - 1, day);
            
            if (Number.isNaN(date.getTime())) return null;
            
            // Validate date components (e.g., prevent 31/02 becoming 03/03)
            const isValid = date.getFullYear() === year 
                && date.getMonth() === month - 1 
                && date.getDate() === day;
            
            if (!isValid) return null;

            date.setHours(0, 0, 0, 0);
            return date;
        }

        formatDateForDisplay(date) {
            if (!date) return '';
            
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            
            return `${day}/${month}`;
        }

        getWeekInfo(date) {
            if (!date) return null;

            const weekStart = this.getMonday(date);
            const weekEnd = this.getWeekEnd(weekStart);
            
            return {
                key: this.formatWeekKey(weekStart),
                label: `${this.formatDateForDisplay(weekStart)} - ${this.formatDateForDisplay(weekEnd)}`,
                start: weekStart,
                end: weekEnd
            };
        }

        getMonday(date) {
            const monday = new Date(date);
            const dayOffset = (monday.getDay() + 6) % 7; // 0 = Monday, 6 = Sunday
            monday.setDate(monday.getDate() - dayOffset);
            monday.setHours(0, 0, 0, 0);
            return monday;
        }

        getWeekEnd(weekStart) {
            const sunday = new Date(weekStart);
            sunday.setDate(weekStart.getDate() + 6);
            return sunday;
        }

        formatWeekKey(date) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }

        groupDetailsByWeek(dayDetails) {
            const groupsMap = this.createWeekGroups(dayDetails);
            const groups = Array.from(groupsMap.values());
            return this.sortWeekGroups(groups);
        }

        createWeekGroups(dayDetails) {
            const groupsMap = new Map();

            dayDetails.forEach(detail => {
                const weekInfo = this.getWeekInfoForDetail(detail);
                const groupKey = weekInfo.key;

                if (!groupsMap.has(groupKey)) {
                    groupsMap.set(groupKey, this.createEmptyWeekGroup(weekInfo));
                }

                this.addDetailToGroup(groupsMap.get(groupKey), detail);
            });

            return groupsMap;
        }

        getWeekInfoForDetail(detail) {
            const parsedDate = this.parseDateFromString(detail.ngay);
            
            if (parsedDate) {
                const weekInfo = this.getWeekInfo(parsedDate);
                return {
                    key: `week-${weekInfo.key}`,
                    label: weekInfo.label,
                    start: weekInfo.start,
                    end: weekInfo.end
                };
            }

            // Fallback for unparseable dates
            return {
                key: `unknown-${detail.ngay}`,
                label: `Tuần ${detail.ngay}`,
                start: null,
                end: null
            };
        }

        createEmptyWeekGroup(weekInfo) {
            return {
                key: weekInfo.key,
                label: weekInfo.label,
                start: weekInfo.start,
                end: weekInfo.end,
                rows: [],
                totalDeficit: 0,
                totalLamBu: 0
            };
        }

        addDetailToGroup(group, detail) {
            group.rows.push(detail);
            group.totalDeficit += detail.phutThieu || 0;
            group.totalLamBu += (detail.phutThua || 0) + (detail.phutLamBu || 0);
        }

        sortWeekGroups(groups) {
            return groups.sort((a, b) => {
                // Both have valid dates
                if (a.start && b.start) return a.start - b.start;
                
                // Valid dates come before invalid ones
                if (a.start) return -1;
                if (b.start) return 1;
                
                // Both invalid, maintain order
                return 0;
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
                            <th>Tuần</th>
                            <th>Ngày</th>
                            <th>Loại ca</th>
                            <th>Vào</th>
                            <th>Ra</th>
                            <th>Thiếu (p)</th>
                            <th>Thừa (p)</th>
                            <th>Làm bù (p)</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

            if (analysis.chiTietNgay && analysis.chiTietNgay.length > 0) {
                const weeklyGroups = this.groupDetailsByWeek(analysis.chiTietNgay);

                weeklyGroups.forEach((group, groupIndex) => {
                    group.rows.forEach((ngay, index) => {
                        const thieuClass = ngay.phutThieu > 0 ? 'terra-text-danger' : '';

                        let lamBuText = '-';
                        let thuaText = '-';
                        let gioVaoText = '-';
                        let gioRaText = '-';
                        let loaiCaClass = '';

                        // Xử lý theo loại ngày
                        let loaiCaDisplay = ngay.loaiCa;
                        
                        // Nếu có nghỉ phép, note vào loại ca
                        if (ngay.noteNghiPhep) {
                            loaiCaDisplay += ` (Off)`;
                        }
                        
                        // Dòng đi làm bình thường
                        loaiCaClass = (ngay.loaiCa === 'Sáng' || ngay.loaiCa === 'Chiều') ? 'terra-text-warning' : '';

                        gioVaoText = ngay.thoiGianVao ? this.minutesToTime(ngay.thoiGianVao) : '-';
                        gioRaText = ngay.thoiGianRa ? this.minutesToTime(ngay.thoiGianRa) : '-';

                        // Cột Thừa (overtime)
                        if (ngay.phutThua > 0) {
                            const expectedEndTime = this.calculateExpectedEndTime(ngay.thoiGianVao, ngay.loaiCa);
                            const gioRaChuan = this.minutesToTime(expectedEndTime);
                            const gioRaThucTe = this.minutesToTime(ngay.thoiGianRa);
                            thuaText = `<span class="terra-text-success">${ngay.phutThua}</span> (${gioRaChuan} - ${gioRaThucTe})`;
                        }

                        // Cột Làm bù (compensation với khung giờ)
                        if (ngay.phutLamBu > 0) {
                            if (ngay.khungGioLamBu) {
                                lamBuText = `<span class="terra-text-info">${ngay.phutLamBu}</span> (${ngay.khungGioLamBu})`;
                            } else {
                                lamBuText = `<span class="terra-text-info">${ngay.phutLamBu}</span>`;
                            }
                        }

                        if (ngay.thoiGianVao && ngay.thoiGianRa) {
                            const flexRange = this.getFlexibleRange(ngay.loaiCa);
                            const expectedEndTime = this.calculateExpectedEndTime(ngay.thoiGianVao, ngay.loaiCa);

                            if (ngay.thoiGianVao > flexRange.end) {
                                gioVaoText = `<span class="terra-text-underline">${gioVaoText}</span>`;
                            }

                            if (ngay.thoiGianRa < expectedEndTime) {
                                gioRaText = `<span class="terra-text-underline">${gioRaText}</span>`;
                            }
                        }

                        const netMinutes = group.totalDeficit - group.totalLamBu;
                        let netLabel = '-', netClass = '';
                        if (netMinutes > 0) {
                            netLabel = `-${netMinutes}p`;
                            netClass = 'terra-week-net-negative';
                        } else if (netMinutes < 0) {
                            netLabel = `+${Math.abs(netMinutes)}p`;
                            netClass = 'terra-week-net-positive';
                        }

                        const weekCell = index === 0
                            ? `<td class="terra-week-cell" rowspan="${group.rows.length}">
                                    <div class="terra-week-label">${group.label}</div>
                                    ${(group.totalDeficit === 0 && group.totalLamBu === 0) ? '' : `
                                    <div class="terra-week-summary">
                                        <div class="terra-week-left">
                                            <span class="terra-week-deficit">Thiếu: ${group.totalDeficit}p</span>
                                            <span class="terra-week-surplus">Dư: ${group.totalLamBu}p</span>
                                        </div>
                                        <div class="terra-week-net-divider"></div>
                                        <div class="terra-week-net ${netClass}">${netLabel}</div>
                                    </div>`}
                                </td>`
                            : '';

                        const isLastWeek = groupIndex === weeklyGroups.length - 1;
                        const rowClass = index === 0
                            ? (groupIndex === 0 ? 'terra-week-start-first' : 'terra-week-start-row')
                            : (index === group.rows.length - 1 && !isLastWeek ? 'terra-week-end-row' : '');

                        tableHTML += `
                        <tr${rowClass ? ` class="${rowClass}"` : ''}>
                            ${weekCell}
                            <td>${ngay.ngay}</td>
                            <td><small class="${loaiCaClass}">${loaiCaDisplay}</small></td>
                            <td>${gioVaoText}</td>
                            <td>${gioRaText}</td>
                            <td class="${thieuClass}">${ngay.phutThieu || '-'}</td>
                            <td>${thuaText}</td>
                            <td>${lamBuText}</td>
                        </tr>
                    `;
                    });
                });
            } else {
                // Fallback: hiển thị dữ liệu gốc
                analysis.data.forEach(row => {
                    tableHTML += `
                    <tr>
                        <td>-</td>
                        <td>${row.ngay}</td>
                        <td>${row.phanLoai}</td>
                        <td>${row.thucTeVao}</td>
                        <td>${row.thucTeRa}</td>
                        <td>-</td>
                        <td>-</td>
                        <td>-</td>
                    </tr>
                `;
                });
            }

            const totalNetMinutes = analysis.tongPhutThieu - analysis.tongPhutThua - (analysis.tongPhutLamBu || 0);
            let totalNetLabel, totalNetClass;
            if (totalNetMinutes > 0) {
                totalNetLabel = `-${totalNetMinutes}p`;
                totalNetClass = 'terra-week-net-negative';
            } else if (totalNetMinutes < 0) {
                totalNetLabel = `+${Math.abs(totalNetMinutes)}p`;
                totalNetClass = 'terra-week-net-positive';
            }

            tableHTML += `
                    <tr class="terra-total-row">
                        <td colspan="5"><strong>Tổng <span class="terra-week-net ${totalNetClass}">(${totalNetLabel})</span></strong></td>
                        <td class="terra-text-danger"><strong>${analysis.tongPhutThieu}</strong></td>
                        <td><strong class="terra-text-success">${analysis.tongPhutThua}</strong></td>
                        <td><strong class="terra-text-info">${analysis.tongPhutLamBu || 0}</strong></td>
                    </tr>
            `;

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

        showConfigModal() {
            // Remove existing config modal if any
            const existingModal = document.getElementById('terra-config-modal');
            if (existingModal) {
                existingModal.remove();
            }

            const modal = document.createElement('div');
            modal.id = 'terra-config-modal';
            modal.className = 'terra-modal-overlay';

            const content = document.createElement('div');
            content.className = 'terra-modal-content terra-config-modal-content';

            const currentConfig = USER_CONFIG;
            const fullDayHours = (currentConfig.WORK_HOURS.FULL_DAY / 60).toFixed(1);

            content.innerHTML = `
                <div class="terra-modal-header">
                    <h2>⚙️ Cấu hình thời gian làm việc</h2>
                    <p>Tùy chỉnh quy tắc tính toán theo Terra</p>
                </div>
                
                <form id="terra-config-form" class="terra-config-form">
                    <div class="terra-config-section">
                        <h3>📅 Giờ làm việc</h3>
                        <div class="terra-config-row">
                            <label for="fullDayHours">Giờ làm ca đầy đủ:</label>
                            <input type="number" id="fullDayHours" min="4" max="12" step="0.5" value="${fullDayHours}">
                            <span class="terra-config-unit">giờ</span>
                        </div>
                    </div>

                    <div class="terra-config-section">
                        <h3>⏰ Làm bù</h3>
                        <div class="terra-config-row">
                            <label for="overtimeMin">Tối thiểu tính làm bù:</label>
                            <input type="number" id="overtimeMin" min="1" max="120" step="1" value="${currentConfig.OVERTIME.MIN_MINUTES}">
                            <span class="terra-config-unit">phút</span>
                        </div>
                        <div class="terra-config-row">
                            <label for="roundInterval">Làm tròn xuống:</label>
                            <input type="number" id="roundInterval" min="1" max="60" step="1" value="${currentConfig.OVERTIME.ROUND_INTERVAL}">
                            <span class="terra-config-unit">phút</span>
                        </div>
                    </div>

                    <div class="terra-config-note">
                        <strong>📝 Lưu ý:</strong><br>
                        • Giờ làm nửa ca sẽ tự động bằng ca đầy đủ chia 2<br>
                        • Làm bù chỉ tính khi >= thời gian tối thiểu<br>
                        • Làm tròn xuống theo khoảng thời gian đã chọn<br>
                        • Cấu hình được lưu trong trình duyệt
                    </div>

                    <div class="terra-actions-flex">
                        <button type="button" class="terra-btn terra-btn-secondary" id="terra-config-reset">🔄 Mặc định</button>
                        <button type="submit" class="terra-btn terra-btn-primary">💾 Lưu</button>
                    </div>
                </form>
            `;

            modal.appendChild(content);
            document.body.appendChild(modal);

            // Handle form submission
            document.getElementById('terra-config-form').addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveConfigFromForm(modal);
            });

            // Handle reset button
            document.getElementById('terra-config-reset').addEventListener('click', () => {
                this.resetConfigInForm();
            });

            // Handle modal overlay click
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    document.body.removeChild(modal);
                }
            });
        }

        saveConfigFromForm(modal) {
            try {
                const fullDayHours = parseFloat(document.getElementById('fullDayHours').value);
                const overtimeMin = parseInt(document.getElementById('overtimeMin').value);
                const roundInterval = parseInt(document.getElementById('roundInterval').value);

                const newConfig = {
                    WORK_HOURS: {
                        FULL_DAY: fullDayHours * 60
                    },
                    OVERTIME: {
                        MIN_MINUTES: overtimeMin,
                        ROUND_INTERVAL: roundInterval
                    }
                };

                if (!this.validateConfig(newConfig)) {
                    throw new Error('Giá trị cấu hình không hợp lệ');
                }

                USER_CONFIG = CONFIG_MANAGER.mergeConfig(USER_CONFIG, newConfig);
                
                const saved = CONFIG_MANAGER.saveConfig(USER_CONFIG);
                if (!saved) {
                    throw new Error('Không thể lưu cấu hình');
                }

                document.body.removeChild(modal);
                this.showConfigSuccessMessage('Cập nhật cấu hình thành công!');

            } catch (error) {
                this.showConfigErrorMessage(error.message);
            }
        }

        resetConfigInForm() {
            const defaultConfig = CONFIG_MANAGER.getDefaultConfig();
            
            document.getElementById('fullDayHours').value = (defaultConfig.WORK_HOURS.FULL_DAY / 60).toFixed(1);
            document.getElementById('overtimeMin').value = defaultConfig.OVERTIME.MIN_MINUTES;
            document.getElementById('roundInterval').value = defaultConfig.OVERTIME.ROUND_INTERVAL;
        }

        showConfigSuccessMessage(message) {
            this.showConfigMessage(message, 'success');
        }

        showConfigErrorMessage(message) {
            this.showConfigMessage(message, 'error');
        }

        showConfigMessage(message, type) {
            const toast = document.createElement('div');
            toast.className = `terra-config-toast terra-config-toast-${type}`;
            toast.textContent = message;
            
            document.body.appendChild(toast);
            
            setTimeout(() => {
                if (document.body.contains(toast)) {
                    document.body.removeChild(toast);
                }
            }, 3000);
        }
    }

    window.terraAnalyzer = new TerraTimeAnalyzer();
}
