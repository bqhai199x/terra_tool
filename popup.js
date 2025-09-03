// Popup script đơn giản để tương tác với Terra extension
class TerraPopup {
    constructor() {
        this.currentTab = null;
        this.init();
    }

    async init() {
        try {
            // Lấy tab hiện tại
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            this.currentTab = tab;
            
            // Thiết lập event listeners
            this.setupEventListeners();
            
            // Kiểm tra trang Terra
            await this.checkTerraPage();
            
        } catch (error) {
            console.error('Lỗi khởi tạo popup:', error);
            this.showError('Không thể khởi tạo extension');
        }
    }

    setupEventListeners() {
        // Event delegation để xử lý các nút được tạo động
        document.addEventListener('click', async (e) => {
            const target = e.target;
            
            if (target.id === 'analyzeBtn') {
                await this.analyzeTimesheet();
            } else if (target.id === 'refreshBtn') {
                await this.checkTerraPage();
            } else if (target.id === 'rescanBtn') {
                await this.rescanPage();
            } else if (target.id === 'detailBtn') {
                await this.showDetails();
            }
        });
    }

    async checkTerraPage() {
        try {
            // Hiển thị loading
            const content = document.getElementById('content');
            content.innerHTML = `
                <div class="loading">
                    Đang kiểm tra trang Terra...
                </div>
            `;

            // Inject content script
            await chrome.scripting.executeScript({
                target: { tabId: this.currentTab.id },
                files: ['content.js']
            });

            // Đợi một chút để script khởi tạo
            await new Promise(resolve => setTimeout(resolve, 300));

            // Kiểm tra bảng Terra với timeout
            const result = await Promise.race([
                chrome.tabs.sendMessage(this.currentTab.id, { action: 'checkTerraTable' }),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
            ]);

            if (result && result.found) {
                this.showTerraInterface(result.data);
            } else {
                this.showNotTerraPage();
            }
        } catch (error) {
            console.log('Lỗi kiểm tra trang:', error.message);
            this.showNotTerraPage();
        }
    }

    showTerraInterface(data) {
        const content = document.getElementById('content');
        content.innerHTML = `
            <div class="status">
                <div class="status-item">
                    <span>Trạng thái:</span>
                    <span class="value">✅ Đã tìm thấy bảng Terra</span>
                </div>
                <div class="status-item">
                    <span>Số bản ghi:</span>
                    <span class="value">${data?.recordCount || 0} dòng</span>
                </div>
            </div>
            
            <div class="buttons">
                <button class="btn-secondary" id="refreshBtn">
                    🔄 Làm mới
                </button>
            </div>
            
            <div id="results" style="margin-top: 15px;"></div>
        `;
        
        // Tự động phân tích sau khi tìm thấy bảng
        this.analyzeTimesheet();
    }

    showNotTerraPage() {
        const content = document.getElementById('content');
        content.innerHTML = `
            <div class="status">
                <div class="status-item">
                    <span>Trạng thái:</span>
                    <span class="value">⚠️ Chưa tìm thấy bảng Terra</span>
                </div>
            </div>
            
            <div style="font-size: 12px; margin: 15px 0; opacity: 0.9;">
                <p><strong>💡 Hướng dẫn:</strong></p>
                <p>• Mở trang chấm công Terra</p>
                <p>• Click "🔍 Quét lại" để tìm bảng</p>
            </div>
            
            <div class="buttons">
                <button class="btn-primary" id="rescanBtn">
                    🔍 Quét lại
                </button>
            </div>
        `;
    }

    showError(message) {
        const content = document.getElementById('content');
        content.innerHTML = `
            <div class="error">
                ❌ ${message}
            </div>
            
            <div class="buttons">
                <button class="btn-secondary" id="refreshBtn">
                    🔄 Thử lại
                </button>
            </div>
        `;
    }

    async analyzeTimesheet() {
        try {
            // Hiển thị loading
            const resultsDiv = document.getElementById('results');
            if (resultsDiv) {
                resultsDiv.innerHTML = `
                    <div class="loading">
                        Đang phân tích dữ liệu...
                    </div>
                `;
            }

            // Gửi lệnh phân tích
            const result = await chrome.tabs.sendMessage(this.currentTab.id, { 
                action: 'analyzeTable' 
            });

            if (result && result.success) {
                this.displayAnalysisResults(result.analysis);
            } else {
                throw new Error(result?.error || 'Không thể phân tích dữ liệu');
            }
        } catch (error) {
            console.error('Lỗi phân tích:', error);
            const resultsDiv = document.getElementById('results');
            if (resultsDiv) {
                resultsDiv.innerHTML = `
                    <div class="error">
                        ❌ Lỗi: ${error.message}
                    </div>
                `;
            }
        }
    }

    displayAnalysisResults(analysis) {
        const resultsDiv = document.getElementById('results');
        if (!resultsDiv) return;

        const shortageMinutes = parseFloat(analysis.phutConThieu) || 0;
        const shortageColor = shortageMinutes > 0 ? '#ff5252' : '#4caf50';
        const shortageIcon = shortageMinutes > 0 ? '⚠️' : '✅';
        const shortageText = shortageMinutes > 0 ? 'Còn thiếu' : 'Đã đủ/thừa';
        const shortageValue = Math.abs(shortageMinutes);
        const shortageUnit = shortageValue >= 60 ? `${(shortageValue/60).toFixed(1)}h` : `${shortageValue}p`;

        resultsDiv.innerHTML = `
            <div class="status">
                <div class="status-item">
                    <span>Ngày làm việc:</span>
                    <span class="value">${analysis.soNgayLamViec} ngày</span>
                </div>
                <div class="status-item">
                    <span>Phút thiếu:</span>
                    <span class="value" style="color: #ff5252;">${analysis.tongPhutThieu}p</span>
                </div>
                <div class="status-item">
                    <span>Phút thừa:</span>
                    <span class="value" style="color: #4caf50;">${analysis.tongPhutThua}p</span>
                </div>
                <div class="status-item" style="border-top: 1px solid rgba(255,255,255,0.2); padding-top: 8px; margin-top: 8px;">
                    <span>${shortageIcon} ${shortageText}:</span>
                    <span class="value" style="color: ${shortageColor}; font-size: 16px;">
                        ${shortageUnit}
                    </span>
                </div>
            </div>
            
            <div class="buttons" style="margin-top: 15px;">
                <button class="btn-primary" id="detailBtn">📋 Chi tiết</button>
            </div>
        `;
    }

    async rescanPage() {
        try {
            // Hiển thị loading
            const content = document.getElementById('content');
            content.innerHTML = `
                <div class="loading">
                    🔍 Đang quét lại trang...
                </div>
            `;

            // Gửi lệnh quét lại
            const result = await chrome.tabs.sendMessage(this.currentTab.id, { 
                action: 'rescanPage' 
            });

            if (result && result.found) {
                // Tìm thấy bảng
                const tableInfo = await chrome.tabs.sendMessage(this.currentTab.id, { 
                    action: 'checkTerraTable' 
                });
                this.showTerraInterface(tableInfo.data);
            } else {
                // Vẫn không tìm thấy
                this.showNotTerraPage();
            }
        } catch (error) {
            console.error('Lỗi quét lại:', error);
            this.showError('Lỗi khi quét lại trang');
        }
    }

    async showDetails() {
        try {
            // Gửi lệnh hiển thị chi tiết với analysis data
            const result = await chrome.tabs.sendMessage(this.currentTab.id, { 
                action: 'showDetails'
            });
            
            if (result && result.success) {
                window.close(); // Đóng popup sau khi mở chi tiết thành công
            } else {
                console.error('Lỗi hiển thị chi tiết:', result?.error);
                // Hiển thị thông báo lỗi trong popup
                const resultsDiv = document.getElementById('results');
                if (resultsDiv) {
                    const errorDiv = document.createElement('div');
                    errorDiv.className = 'error';
                    errorDiv.textContent = '❌ Lỗi hiển thị chi tiết: ' + (result?.error || 'Không xác định');
                    errorDiv.style.marginTop = '10px';
                    resultsDiv.appendChild(errorDiv);
                    
                    // Xóa thông báo sau 5 giây
                    setTimeout(() => errorDiv.remove(), 5000);
                }
            }
        } catch (error) {
            console.error('Lỗi hiển thị chi tiết:', error);
        }
    }
}

// Khởi tạo popup khi DOM được tải
document.addEventListener('DOMContentLoaded', () => {
    new TerraPopup();
});
