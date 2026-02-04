// Popup script đơn giản để tương tác với Terra extension
class TerraPopup {
    constructor() {
        this.currentTab = null;
        this.contentScriptInjected = false;
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
            } else if (target.id === 'configBtn') {
                await this.showConfigModal();
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

            // Inject content script với error handling
            try {
                await this.injectContentScript();
            } catch (injectError) {
                console.error('Không thể inject content script:', injectError);
                this.showError('Không thể kết nối với trang. Vui lòng:<br>1. Tải lại trang<br>2. Mở extension sau khi trang đã load xong');
                return;
            }

            // Đợi một chút để script khởi tạo
            await new Promise(resolve => setTimeout(resolve, 500));

            // Kiểm tra bảng Terra với timeout
            const result = await Promise.race([
                this.sendMessageToContent({ action: 'checkTerraTable' }),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
            ]);
            
            if (result && result.error) {
                // Handle errors from content script or sendMessage
                this.showError(result.error);
            } else if (result && result.found) {
                this.showTerraInterface(result.data);
            } else {
                this.showError('Không tìm thấy bảng Terra trên trang này');
            }
        } catch (error) {
            console.error('Lỗi kiểm tra trang:', error);
            if (error.message === 'Timeout') {
                this.showError('Hết thời gian chờ. Vui lòng thử lại.');
            } else {
                this.showError('Lỗi khi quét trang. Vui lòng tải lại trang và thử lại.');
            }
        }
    }

    async injectContentScript() {
        try {
            // Skip if already confirmed injected in this session
            if (this.contentScriptInjected) {
                return;
            }
            
            // Kiểm tra xem content script đã được inject chưa
            try {
                const testResult = await Promise.race([
                    chrome.tabs.sendMessage(this.currentTab.id, { action: 'ping' }),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('No response')), 1000))
                ]);
                
                if (testResult && testResult.pong) {
                    console.log('Content script đã có sẵn');
                    this.contentScriptInjected = true;
                    return;
                }
            } catch (error) {
                console.log('Content script chưa có, cần inject...');
            }

            // Content script chưa được inject hoặc không phản hồi
            try {
                // Sử dụng chrome.scripting API (Manifest V3)
                if (chrome.scripting && chrome.scripting.executeScript) {
                    await chrome.scripting.executeScript({
                        target: { tabId: this.currentTab.id },
                        files: ['content.js']
                    });
                    console.log('✅ Inject content script thành công (Manifest V3)');
                    this.contentScriptInjected = true;
                } else {
                    throw new Error('Scripting API not available');
                }
            } catch (error) {
                console.error('Lỗi inject content script:', error);
                // Fallback: sử dụng chrome.tabs.executeScript (Manifest V2 legacy)
                try {
                    await new Promise((resolve, reject) => {
                        chrome.tabs.executeScript(this.currentTab.id, {
                            file: 'content.js'
                        }, (result) => {
                            if (chrome.runtime.lastError) {
                                reject(new Error(chrome.runtime.lastError.message));
                            } else {
                                resolve(result);
                            }
                        });
                    });
                    console.log('✅ Inject content script thành công (Fallback)');
                    this.contentScriptInjected = true;
                } catch (fallbackError) {
                    console.error('Fallback inject cũng thất bại:', fallbackError);
                    throw new Error('Không thể inject content script');
                }
            }
            
            // Đợi content script khởi tạo
            await new Promise(resolve => setTimeout(resolve, 300));
            
        } catch (error) {
            console.error('Lỗi trong injectContentScript:', error);
            throw error;
        }
    }

    async sendMessageToContent(message) {
        try {
            const response = await chrome.tabs.sendMessage(this.currentTab.id, message);
            return response;
        } catch (error) {
            // If content script is not loaded, try to inject it first
            if (error.message.includes('Receiving end does not exist')) {
                console.log('Content script chưa load, đang thử inject...');
                try {
                    await this.injectContentScript();
                    // Retry the message
                    const retryResponse = await chrome.tabs.sendMessage(this.currentTab.id, message);
                    return retryResponse;
                } catch (retryError) {
                    console.error('Không thể kết nối với content script:', retryError.message);
                    return { error: 'Không thể kết nối với trang. Vui lòng tải lại trang và thử lại.' };
                }
            }
            console.error('Lỗi gửi message:', error.message);
            return { error: error.message };
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
                <button class="btn-config" id="configBtn">
                    ⚙️ Cấu hình
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

            // Đảm bảo content script đã được inject
            await this.injectContentScript();

            // Gửi lệnh phân tích
            const result = await this.sendMessageToContent({ 
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

        // Tính toán đúng: Net = Thiếu - Thừa - Làm bù
        const shortageMinutes = parseFloat(analysis.phutConThieu) || 0;
        const shortageColor = shortageMinutes > 0 ? '#ff5252' : '#4caf50';
        const shortageIcon = shortageMinutes > 0 ? '⚠️' : '✅';
        
        // Tách thành Dự kiến và Thực tế
        // Dự kiến = overtimeSurplus (thừa - thiếu)
        // Thực tế (trong ngoặc) = needMoreCompensation (thiếu - làm bù)
        const overtimeSurplus = (analysis.tongPhutThua || 0) - analysis.tongPhutThieu;
        const needMoreCompensation = analysis.tongPhutThieu - (analysis.tongPhutLamBu || 0);
        
        // Hiển thị Dự kiến
        const duKienUnit = `${overtimeSurplus}p`;
        
        // Hiển thị Thực tế (trong ngoặc)
        let thucTeUnit = '';
        if (needMoreCompensation !== 0) {
            const compensationStyle = needMoreCompensation > 0 ? 'color: #ff5252;' : 'color: #4caf50;';
            const compensationValue = Math.abs(needMoreCompensation);
            thucTeUnit = `<span style="${compensationStyle}">${compensationValue}p</span>`;
        } else {
            thucTeUnit = '<span style="color: #4caf50;">0p</span>';
        }

        // Hiển thị thông tin làm bù
        const lamBuHtml = analysis.tongPhutLamBu > 0 ? `
            <div class="status-item">
                <span>Giờ làm bù:</span>
                <span class="value" style="color: #2196f3;">${analysis.tongPhutLamBu}p</span>
            </div>
        ` : '';

        // Hiển thị thông tin nghỉ phép năm
        const nghiPhepHtml = analysis.soNgayNghiPhep > 0 ? `
            <div class="status-item">
                <span>Nghỉ phép</span>
                <span class="value" style="color: #ff9800;">${analysis.soNgayNghiPhep} ngày</span>
            </div>
        ` : '';

        resultsDiv.innerHTML = `
            <div class="status">
                <div class="status-item">
                    <span>Ngày làm việc:</span>
                    <span class="value">${analysis.soNgayLamViec} ngày</span>
                </div>
                ${nghiPhepHtml}
                <div class="status-item">
                    <span>Phút thiếu:</span>
                    <span class="value" style="color: #ff5252;">${analysis.tongPhutThieu}p</span>
                </div>
                <div class="status-item">
                    <span>Phút thừa:</span>
                    <span class="value" style="color: #4caf50;">${analysis.tongPhutThua}p</span>
                </div>
                ${lamBuHtml}
                <div class="status-item" style="border-top: 1px solid rgba(255,255,255,0.2); padding-top: 8px; margin-top: 8px;">
                    <span>${shortageIcon} Dự kiến:</span>
                    <span class="value" style="color: ${shortageColor}; font-size: 16px;">
                        ${duKienUnit}
                    </span>
                </div>
                <div class="status-item">
                    <span>📊 Thực tế:</span>
                    <span class="value" style="font-size: 16px;">
                        ${thucTeUnit}
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

            // Reset content script injection flag và inject lại
            this.contentScriptInjected = false;
            await this.injectContentScript();

            // Gửi lệnh quét lại
            const result = await this.sendMessageToContent({ 
                action: 'rescanPage' 
            });

            if (result && result.found) {
                // Tìm thấy bảng
                const tableInfo = await this.sendMessageToContent({ 
                    action: 'checkTerraTable' 
                });
                
                if (tableInfo && tableInfo.found) {
                    this.showTerraInterface(tableInfo.data);
                } else if (tableInfo && tableInfo.error) {
                    // Handle URL validation error
                    this.showError(tableInfo.error);
                } else {
                    this.showNotTerraPage();
                }
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
            // Đảm bảo content script đã được inject
            await this.injectContentScript();
            
            // Gửi lệnh hiển thị chi tiết với analysis data
            const result = await this.sendMessageToContent({ 
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

    async showConfigModal() {
        try {
            const result = await this.sendMessageToContent({ action: 'showConfigModal' });
            if (result && result.success) {
                // Modal sẽ được hiển thị trên trang web
                // Đóng popup để người dùng thấy modal rõ hơn
                window.close();
            } else {
                this.showError('Không thể mở cấu hình: ' + (result?.error || 'Lỗi không xác định'));
            }
        } catch (error) {
            console.error('Lỗi mở cấu hình:', error);
            this.showError('Lỗi kết nối khi mở cấu hình');
        }
    }
}

// Khởi tạo popup khi DOM được tải
document.addEventListener('DOMContentLoaded', () => {
    new TerraPopup();
});
