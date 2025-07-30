// EPUB 轉換器 - 網頁版 JavaScript
class EpubConverter {
    constructor() {
        this.selectedFile = null;
        this.selectedFormat = 'epub';
        this.selectedLineHeight = '1.2';
        this.convertedBlob = null;
        
        this.initializeElements();
        this.bindEvents();
        this.updateUI();
    }

    initializeElements() {
        // 檔案選擇相關
        this.dropZone = document.getElementById('dropZone');
        this.fileInput = document.getElementById('fileInput');
        this.fileSelectBtn = document.getElementById('fileSelectBtn');
        this.fileInfo = document.getElementById('fileInfo');
        this.fileName = document.getElementById('fileName');
        this.fileSize = document.getElementById('fileSize');
        this.changeFileBtn = document.getElementById('changeFileBtn');

        // 設定相關
        this.formatBtns = document.querySelectorAll('.format-btn');
        this.lineHeightSelect = document.getElementById('lineHeightSelect');

        // 轉換相關
        this.convertBtn = document.getElementById('convertBtn');
        this.progressSection = document.getElementById('progressSection');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');

        // 狀態和結果
        this.statusText = document.getElementById('statusText');
        this.resultSection = document.getElementById('resultSection');
        this.resultFileName = document.getElementById('resultFileName');
        this.resultInfo = document.getElementById('resultInfo');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.newConversionBtn = document.getElementById('newConversionBtn');
    }

    bindEvents() {
        // 檔案選擇事件
        this.fileSelectBtn.addEventListener('click', () => this.fileInput.click());
        this.changeFileBtn.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

        // 拖放事件
        this.dropZone.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.dropZone.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.dropZone.addEventListener('drop', (e) => this.handleDrop(e));

        // 格式選擇事件
        this.formatBtns.forEach(btn => {
            btn.addEventListener('click', () => this.handleFormatChange(btn));
        });

        // 行距選擇事件
        this.lineHeightSelect.addEventListener('change', () => this.handleLineHeightChange());

        // 轉換事件
        this.convertBtn.addEventListener('click', () => this.startConversion());

        // 結果事件
        this.downloadBtn.addEventListener('click', () => this.downloadFile());
        this.newConversionBtn.addEventListener('click', () => this.resetConverter());
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (file && file.name.toLowerCase().endsWith('.epub')) {
            this.selectedFile = file;
            this.showFileInfo();
            this.updateUI();
        } else {
            this.showAlert('錯誤', '請選擇 .epub 格式的檔案');
        }
    }

    handleDragOver(event) {
        event.preventDefault();
        this.dropZone.classList.add('dragover');
    }

    handleDragLeave(event) {
        event.preventDefault();
        this.dropZone.classList.remove('dragover');
    }

    handleDrop(event) {
        event.preventDefault();
        this.dropZone.classList.remove('dragover');
        
        const files = event.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            if (file.name.toLowerCase().endsWith('.epub')) {
                this.selectedFile = file;
                this.showFileInfo();
                this.updateUI();
            } else {
                this.showAlert('錯誤', '請選擇 .epub 格式的檔案');
            }
        }
    }

    handleFormatChange(clickedBtn) {
        this.formatBtns.forEach(btn => btn.classList.remove('active'));
        clickedBtn.classList.add('active');
        this.selectedFormat = clickedBtn.dataset.format;
        this.updateUI();
    }

    handleLineHeightChange() {
        this.selectedLineHeight = this.lineHeightSelect.value;
        this.updateUI();
    }

    showFileInfo() {
        this.fileName.textContent = this.selectedFile.name;
        this.fileSize.textContent = this.formatFileSize(this.selectedFile.size);
        this.dropZone.style.display = 'none';
        this.fileInfo.style.display = 'block';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    updateUI() {
        if (this.selectedFile) {
            this.statusText.textContent = `已選擇：${this.selectedFile.name} | 格式：${this.selectedFormat.toUpperCase()} | 行距：${this.selectedLineHeight}`;
            this.convertBtn.disabled = false;
        } else {
            this.statusText.textContent = '請先選擇 EPUB 檔案';
            this.convertBtn.disabled = true;
        }
    }

    async startConversion() {
        if (!this.selectedFile) {
            this.showAlert('錯誤', '請先選擇 EPUB 檔案');
            return;
        }

        try {
            this.showProgress(true);
            this.convertBtn.disabled = true;
            this.updateProgress(10, '正在讀取 EPUB 檔案...');

            // 讀取 EPUB 檔案
            const zip = new JSZip();
            const epubData = await zip.loadAsync(this.selectedFile);
            this.updateProgress(30, '正在解析檔案結構...');

            // 根據選擇的格式進行處理
            let convertedBlob;

            if (this.selectedFormat === 'md') {
                // Markdown 格式處理
                this.updateProgress(50, '正在轉換為 Markdown 格式...');
                convertedBlob = await this.convertToMarkdown(epubData);
            } else {
                // EPUB 格式處理
                const processedZip = await this.processEpubContent(epubData);
                this.updateProgress(80, '正在生成轉換後的檔案...');

                convertedBlob = await processedZip.generateAsync({
                    type: 'blob',
                    mimeType: 'application/epub+zip'
                });
            }

            this.convertedBlob = convertedBlob;
            this.updateProgress(100, '轉換完成！');

            setTimeout(() => {
                this.showResult();
            }, 1000);

        } catch (error) {
            console.error('轉換錯誤:', error);
            this.showAlert('轉換失敗', `轉換過程中發生錯誤：${error.message}`);
            this.showProgress(false);
            this.convertBtn.disabled = false;
        }
    }

    async processEpubContent(zip) {
        this.updateProgress(40, '正在處理 HTML 內容...');
        
        const processedZip = new JSZip();
        let htmlFileCount = 0;
        let processedCount = 0;

        // 複製所有檔案到新的 ZIP
        for (const [path, file] of Object.entries(zip.files)) {
            if (file.dir) continue;

            if (path.toLowerCase().endsWith('.html') || path.toLowerCase().endsWith('.xhtml')) {
                htmlFileCount++;
            }
        }

        // 處理每個檔案
        for (const [path, file] of Object.entries(zip.files)) {
            if (file.dir) continue;

            if (path.toLowerCase().endsWith('.html') || path.toLowerCase().endsWith('.xhtml')) {
                // 處理 HTML/XHTML 檔案
                const content = await file.async('text');
                const processedContent = await this.processHtmlContent(content);
                processedZip.file(path, processedContent);
                
                processedCount++;
                const progress = 40 + (processedCount / htmlFileCount) * 30;
                this.updateProgress(progress, `正在處理 HTML 檔案 ${processedCount}/${htmlFileCount}...`);
                
            } else if (path.toLowerCase().endsWith('.css')) {
                // 處理 CSS 檔案
                const content = await file.async('text');
                const processedContent = await this.processCssContent(content);
                processedZip.file(path, processedContent);
                
            } else {
                // 其他檔案直接複製
                const content = await file.async('arraybuffer');
                processedZip.file(path, content);
            }
        }

        return processedZip;
    }

    async processHtmlContent(htmlContent) {
        let processedContent = htmlContent;

        // 1. 簡繁轉換
        if (typeof OpenCC !== 'undefined') {
            try {
                const converter = OpenCC.Converter({ from: 'cn', to: 'tw' });
                processedContent = converter(processedContent);
            } catch (error) {
                console.warn('簡繁轉換失敗，使用基本轉換:', error);
                processedContent = this.basicSimplifiedToTraditional(processedContent);
            }
        } else {
            // 使用基本的簡繁轉換
            processedContent = this.basicSimplifiedToTraditional(processedContent);
        }

        // 2. 修改閱讀方向為橫式
        processedContent = this.convertToHorizontal(processedContent);

        // 3. 更改字體為微軟正黑體
        processedContent = this.changeFontFamily(processedContent);

        // 4. 應用行距設定
        processedContent = this.applyLineHeight(processedContent);

        return processedContent;
    }

    async processCssContent(cssContent) {
        let processedContent = cssContent;

        // 簡繁轉換 CSS 註解
        if (typeof OpenCC !== 'undefined') {
            try {
                const converter = OpenCC.Converter({ from: 'cn', to: 'tw' });
                processedContent = converter(processedContent);
            } catch (error) {
                processedContent = this.basicSimplifiedToTraditional(processedContent);
            }
        } else {
            processedContent = this.basicSimplifiedToTraditional(processedContent);
        }

        // 修改字體和行距
        processedContent = this.modifyCssStyles(processedContent);

        return processedContent;
    }

    basicSimplifiedToTraditional(text) {
        // 基本的簡繁轉換對照表
        const conversionMap = {
            '这': '這', '个': '個', '说': '說', '时': '時', '会': '會',
            '来': '來', '对': '對', '们': '們', '国': '國', '经': '經',
            '过': '過', '现': '現', '发': '發', '应': '應', '样': '樣',
            '还': '還', '没': '沒', '问': '問', '题': '題', '间': '間',
            '关': '關', '系': '係', '实': '實', '际': '際', '认': '認',
            '为': '為', '学': '學', '习': '習', '电': '電', '脑': '腦',
            '网': '網', '络': '絡', '计': '計', '算': '算', '机': '機',
            '数': '數', '据': '據', '库': '庫', '软': '軟', '件': '件',
            '开': '開', '发': '發', '程': '程', '序': '序', '设': '設',
            '计': '計', '语': '語', '言': '言', '技': '技', '术': '術'
        };

        let result = text;
        for (const [simplified, traditional] of Object.entries(conversionMap)) {
            result = result.replace(new RegExp(simplified, 'g'), traditional);
        }
        return result;
    }

    convertToHorizontal(htmlContent) {
        // 移除直式閱讀相關的 CSS 屬性
        let content = htmlContent;
        
        // 移除 writing-mode: vertical-*
        content = content.replace(/writing-mode\s*:\s*vertical[^;]*;?/gi, '');
        
        // 移除 -webkit-writing-mode: vertical-*
        content = content.replace(/-webkit-writing-mode\s*:\s*vertical[^;]*;?/gi, '');
        
        // 移除 text-orientation
        content = content.replace(/text-orientation\s*:[^;]*;?/gi, '');
        
        // 確保設定為橫式
        if (content.includes('<html')) {
            content = content.replace(/<html([^>]*)>/i, '<html$1 style="writing-mode: horizontal-tb;">');
        }
        
        if (content.includes('<body')) {
            content = content.replace(/<body([^>]*)>/i, '<body$1 style="writing-mode: horizontal-tb; direction: ltr;">');
        }

        return content;
    }

    changeFontFamily(htmlContent) {
        // 在 head 中添加字體設定
        const fontStyle = `
<style>
body, html {
    font-family: "Microsoft JhengHei", "微軟正黑體", "PingFang TC", "Helvetica Neue", Arial, sans-serif !important;
}
* {
    font-family: "Microsoft JhengHei", "微軟正黑體", "PingFang TC", "Helvetica Neue", Arial, sans-serif !important;
}
</style>`;

        if (htmlContent.includes('</head>')) {
            return htmlContent.replace('</head>', fontStyle + '</head>');
        } else if (htmlContent.includes('<html')) {
            return htmlContent.replace('<html', fontStyle + '<html');
        } else {
            return fontStyle + htmlContent;
        }
    }

    applyLineHeight(htmlContent) {
        const lineHeightStyle = `
<style>
body, html {
    line-height: ${this.selectedLineHeight} !important;
}
p, div, span, h1, h2, h3, h4, h5, h6, li, td, th {
    line-height: ${this.selectedLineHeight} !important;
}
p, div.text, .content, .chapter {
    line-height: ${this.selectedLineHeight} !important;
}
* {
    line-height: ${this.selectedLineHeight} !important;
}
</style>`;

        if (htmlContent.includes('</head>')) {
            return htmlContent.replace('</head>', lineHeightStyle + '</head>');
        } else if (htmlContent.includes('<html')) {
            return htmlContent.replace('<html', lineHeightStyle + '<html');
        } else {
            return lineHeightStyle + htmlContent;
        }
    }

    modifyCssStyles(cssContent) {
        let content = cssContent;
        
        // 移除直式閱讀相關屬性
        content = content.replace(/writing-mode\s*:\s*vertical[^;]*;?/gi, '');
        content = content.replace(/-webkit-writing-mode\s*:\s*vertical[^;]*;?/gi, '');
        content = content.replace(/text-orientation\s*:[^;]*;?/gi, '');
        
        // 添加橫式閱讀和字體設定
        content += `
/* 轉換器添加的樣式 */
body, html {
    writing-mode: horizontal-tb !important;
    direction: ltr !important;
    font-family: "Microsoft JhengHei", "微軟正黑體", "PingFang TC", "Helvetica Neue", Arial, sans-serif !important;
    line-height: ${this.selectedLineHeight} !important;
}

* {
    font-family: "Microsoft JhengHei", "微軟正黑體", "PingFang TC", "Helvetica Neue", Arial, sans-serif !important;
    line-height: ${this.selectedLineHeight} !important;
}

p, div, span, h1, h2, h3, h4, h5, h6, li, td, th {
    line-height: ${this.selectedLineHeight} !important;
}
`;

        return content;
    }

    async convertToMarkdown(zip) {
        this.updateProgress(60, '正在提取文字內容...');

        let markdownContent = '';
        let title = '轉換的電子書';

        // 提取書籍標題
        try {
            const opfFile = await this.findOpfFile(zip);
            if (opfFile) {
                const opfContent = await zip.file(opfFile).async('text');
                const titleMatch = opfContent.match(/<dc:title[^>]*>([^<]+)<\/dc:title>/i);
                if (titleMatch) {
                    title = titleMatch[1].trim();
                }
            }
        } catch (error) {
            console.warn('無法提取標題:', error);
        }

        // 添加標題
        markdownContent += `# ${title}\n\n`;
        markdownContent += `> 由 EPUB 轉換器轉換為 Markdown 格式\n\n`;
        markdownContent += `---\n\n`;

        this.updateProgress(70, '正在處理章節內容...');

        // 處理所有 HTML/XHTML 檔案
        const htmlFiles = [];
        zip.forEach((relativePath, file) => {
            if (!file.dir && (relativePath.toLowerCase().endsWith('.html') || relativePath.toLowerCase().endsWith('.xhtml'))) {
                htmlFiles.push(relativePath);
            }
        });

        // 按檔案名排序
        htmlFiles.sort();

        for (let i = 0; i < htmlFiles.length; i++) {
            const filePath = htmlFiles[i];
            this.updateProgress(70 + (i / htmlFiles.length) * 15, `正在處理章節 ${i + 1}/${htmlFiles.length}...`);

            try {
                const htmlContent = await zip.file(filePath).async('text');
                const processedHtml = await this.processHtmlContent(htmlContent);
                const markdown = this.htmlToMarkdown(processedHtml);

                if (markdown.trim()) {
                    markdownContent += `## 章節 ${i + 1}\n\n`;
                    markdownContent += markdown + '\n\n';
                    markdownContent += `---\n\n`;
                }
            } catch (error) {
                console.warn(`處理檔案 ${filePath} 時發生錯誤:`, error);
            }
        }

        // 添加結尾
        markdownContent += `\n\n*轉換完成時間: ${new Date().toLocaleString('zh-TW')}*\n`;

        // 建立 Markdown 檔案 Blob
        const blob = new Blob([markdownContent], { type: 'text/markdown; charset=utf-8' });
        return blob;
    }

    async findOpfFile(zip) {
        // 查找 container.xml 來找到 OPF 檔案
        try {
            const containerFile = zip.file('META-INF/container.xml');
            if (containerFile) {
                const containerContent = await containerFile.async('text');
                const opfMatch = containerContent.match(/full-path="([^"]+\.opf)"/i);
                if (opfMatch) {
                    return opfMatch[1];
                }
            }
        } catch (error) {
            console.warn('無法找到 OPF 檔案:', error);
        }

        // 備用方法：直接查找 .opf 檔案
        let opfFile = null;
        zip.forEach((relativePath, file) => {
            if (!file.dir && relativePath.toLowerCase().endsWith('.opf')) {
                opfFile = relativePath;
            }
        });

        return opfFile;
    }

    htmlToMarkdown(html) {
        // 簡單的 HTML 到 Markdown 轉換
        let markdown = html;

        // 移除 HTML 標籤但保留內容
        markdown = markdown.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
        markdown = markdown.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
        markdown = markdown.replace(/<!--[\s\S]*?-->/g, '');

        // 轉換標題
        markdown = markdown.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n');
        markdown = markdown.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n');
        markdown = markdown.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n');
        markdown = markdown.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n');
        markdown = markdown.replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n');
        markdown = markdown.replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n');

        // 轉換段落
        markdown = markdown.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n');

        // 轉換換行
        markdown = markdown.replace(/<br\s*\/?>/gi, '\n');

        // 轉換粗體和斜體
        markdown = markdown.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
        markdown = markdown.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
        markdown = markdown.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
        markdown = markdown.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');

        // 轉換連結
        markdown = markdown.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');

        // 轉換圖片
        markdown = markdown.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi, '![$2]($1)');
        markdown = markdown.replace(/<img[^>]*src="([^"]*)"[^>]*>/gi, '![]($1)');

        // 轉換列表
        markdown = markdown.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (match, content) => {
            return content.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');
        });

        markdown = markdown.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (match, content) => {
            let counter = 1;
            return content.replace(/<li[^>]*>(.*?)<\/li>/gi, () => {
                return `${counter++}. $1\n`;
            });
        });

        // 轉換引用
        markdown = markdown.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, '> $1\n\n');

        // 轉換代碼
        markdown = markdown.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');
        markdown = markdown.replace(/<pre[^>]*>(.*?)<\/pre>/gi, '```\n$1\n```\n\n');

        // 移除剩餘的 HTML 標籤
        markdown = markdown.replace(/<[^>]+>/g, '');

        // 解碼 HTML 實體
        markdown = markdown.replace(/&nbsp;/g, ' ');
        markdown = markdown.replace(/&amp;/g, '&');
        markdown = markdown.replace(/&lt;/g, '<');
        markdown = markdown.replace(/&gt;/g, '>');
        markdown = markdown.replace(/&quot;/g, '"');
        markdown = markdown.replace(/&#39;/g, "'");

        // 清理多餘的空行
        markdown = markdown.replace(/\n\s*\n\s*\n/g, '\n\n');
        markdown = markdown.trim();

        return markdown;
    }

    showProgress(show) {
        if (show) {
            this.progressSection.style.display = 'block';
            this.convertBtn.style.display = 'none';
        } else {
            this.progressSection.style.display = 'none';
            this.convertBtn.style.display = 'flex';
        }
    }

    updateProgress(percentage, text) {
        this.progressFill.style.width = percentage + '%';
        this.progressText.textContent = text;
    }

    showResult() {
        this.showProgress(false);
        this.resultSection.style.display = 'block';

        const originalName = this.selectedFile.name.replace('.epub', '');
        let newFileName, formatDisplay;

        switch (this.selectedFormat) {
            case 'md':
                newFileName = `${originalName}_轉換完成.md`;
                formatDisplay = 'Markdown';
                break;
            case 'epub':
                newFileName = `${originalName}_轉換完成.epub`;
                formatDisplay = 'EPUB';
                break;
            case 'mobi':
                newFileName = `${originalName}_轉換完成.mobi`;
                formatDisplay = 'MOBI';
                break;
            case 'pdf':
                newFileName = `${originalName}_轉換完成.pdf`;
                formatDisplay = 'PDF';
                break;
            default:
                newFileName = `${originalName}_轉換完成.${this.selectedFormat}`;
                formatDisplay = this.selectedFormat.toUpperCase();
        }

        this.resultFileName.textContent = newFileName;
        this.resultInfo.textContent = `格式：${formatDisplay} | 行距：${this.selectedLineHeight} | 大小：${this.formatFileSize(this.convertedBlob.size)}`;

        // 滾動到結果區域
        this.resultSection.scrollIntoView({ behavior: 'smooth' });
    }

    downloadFile() {
        if (!this.convertedBlob) {
            this.showAlert('錯誤', '沒有可下載的檔案');
            return;
        }

        const originalName = this.selectedFile.name.replace('.epub', '');
        let fileName;

        // 根據格式設定檔案名和副檔名
        switch (this.selectedFormat) {
            case 'md':
                fileName = `${originalName}_轉換完成.md`;
                break;
            case 'epub':
                fileName = `${originalName}_轉換完成.epub`;
                break;
            case 'mobi':
                fileName = `${originalName}_轉換完成.mobi`;
                break;
            case 'pdf':
                fileName = `${originalName}_轉換完成.pdf`;
                break;
            default:
                fileName = `${originalName}_轉換完成.${this.selectedFormat}`;
        }

        const url = URL.createObjectURL(this.convertedBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    resetConverter() {
        // 重置所有狀態
        this.selectedFile = null;
        this.convertedBlob = null;

        // 重置 UI
        this.dropZone.style.display = 'block';
        this.fileInfo.style.display = 'none';
        this.resultSection.style.display = 'none';
        this.showProgress(false);

        // 重置檔案輸入
        this.fileInput.value = '';

        // 重置格式選擇
        this.formatBtns.forEach(btn => btn.classList.remove('active'));
        this.formatBtns[0].classList.add('active');
        this.selectedFormat = 'epub';

        // 重置行距選擇
        this.lineHeightSelect.value = '1.2';
        this.selectedLineHeight = '1.2';

        this.updateUI();

        // 滾動到頂部
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    showAlert(title, message) {
        // 簡單的警告對話框
        alert(`${title}\n\n${message}`);
    }
}

// 當頁面載入完成時初始化轉換器
document.addEventListener('DOMContentLoaded', () => {
    new EpubConverter();
});

// 添加一些實用的全域函數
window.EpubConverterUtils = {
    // 檢查瀏覽器支援
    checkBrowserSupport() {
        const features = {
            fileAPI: !!(window.File && window.FileReader && window.FileList && window.Blob),
            jszip: typeof JSZip !== 'undefined',
            dragDrop: 'draggable' in document.createElement('span')
        };

        const unsupported = Object.entries(features)
            .filter(([key, supported]) => !supported)
            .map(([key]) => key);

        if (unsupported.length > 0) {
            console.warn('不支援的功能:', unsupported);
            return false;
        }

        return true;
    },

    // 顯示瀏覽器相容性訊息
    showCompatibilityMessage() {
        if (!this.checkBrowserSupport()) {
            const message = `
您的瀏覽器可能不完全支援此應用程式的所有功能。
建議使用以下瀏覽器的最新版本：
• Chrome 60+
• Firefox 55+
• Safari 11+
• Edge 79+
            `;
            alert(message);
        }
    }
};

// 檢查瀏覽器相容性
window.EpubConverterUtils.showCompatibilityMessage();
