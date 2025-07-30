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
        let author = '';

        // 提取書籍元資料
        try {
            const opfFile = await this.findOpfFile(zip);
            if (opfFile) {
                const opfContent = await zip.file(opfFile).async('text');

                // 提取標題
                const titleMatch = opfContent.match(/<dc:title[^>]*>([^<]+)<\/dc:title>/i);
                if (titleMatch) {
                    title = titleMatch[1].trim();
                }

                // 提取作者
                const authorMatch = opfContent.match(/<dc:creator[^>]*>([^<]+)<\/dc:creator>/i);
                if (authorMatch) {
                    author = authorMatch[1].trim();
                }
            }
        } catch (error) {
            console.warn('無法提取元資料:', error);
        }

        // 建立文件標頭
        markdownContent += `# ${title}\n\n`;

        if (author) {
            markdownContent += `**作者**: ${author}\n\n`;
        }

        markdownContent += `**轉換時間**: ${new Date().toLocaleString('zh-TW')}\n\n`;
        markdownContent += `**轉換工具**: EPUB 轉換器 - 網頁版\n\n`;
        markdownContent += `---\n\n`;

        // 添加目錄
        markdownContent += `## 📚 目錄\n\n`;

        this.updateProgress(65, '正在分析章節結構...');

        // 處理所有 HTML/XHTML 檔案並提取章節資訊
        const htmlFiles = [];
        const chapterInfo = [];

        zip.forEach((relativePath, file) => {
            if (!file.dir && (relativePath.toLowerCase().endsWith('.html') || relativePath.toLowerCase().endsWith('.xhtml'))) {
                htmlFiles.push(relativePath);
            }
        });

        // 按檔案名排序
        htmlFiles.sort();

        // 預處理：提取章節標題
        for (let i = 0; i < htmlFiles.length; i++) {
            const filePath = htmlFiles[i];
            try {
                const htmlContent = await zip.file(filePath).async('text');
                const chapterTitle = this.extractChapterTitle(htmlContent) || `章節 ${i + 1}`;
                chapterInfo.push({
                    path: filePath,
                    title: chapterTitle,
                    index: i + 1
                });
            } catch (error) {
                console.warn(`分析檔案 ${filePath} 時發生錯誤:`, error);
                chapterInfo.push({
                    path: filePath,
                    title: `章節 ${i + 1}`,
                    index: i + 1
                });
            }
        }

        // 生成目錄
        chapterInfo.forEach((chapter, index) => {
            const anchor = this.generateAnchor(chapter.title);
            markdownContent += `${index + 1}. [${chapter.title}](#${anchor})\n`;
        });

        markdownContent += `\n---\n\n`;

        this.updateProgress(70, '正在處理章節內容...');

        // 處理每個章節
        for (let i = 0; i < chapterInfo.length; i++) {
            const chapter = chapterInfo[i];
            this.updateProgress(70 + (i / chapterInfo.length) * 25, `正在處理 ${chapter.title}...`);

            try {
                const htmlContent = await zip.file(chapter.path).async('text');
                const processedHtml = await this.processHtmlContent(htmlContent);
                const markdown = this.htmlToMarkdown(processedHtml);

                if (markdown.trim()) {
                    // 章節標題
                    markdownContent += `## ${chapter.title}\n\n`;

                    // 章節內容
                    const structuredContent = this.structureChapterContent(markdown);
                    markdownContent += structuredContent + '\n\n';

                    // 章節分隔
                    if (i < chapterInfo.length - 1) {
                        markdownContent += `---\n\n`;
                    }
                }
            } catch (error) {
                console.warn(`處理檔案 ${chapter.path} 時發生錯誤:`, error);
                markdownContent += `## ${chapter.title}\n\n`;
                markdownContent += `*此章節處理時發生錯誤*\n\n`;
                markdownContent += `---\n\n`;
            }
        }

        // 添加結尾
        markdownContent += `\n\n---\n\n`;
        markdownContent += `## 📄 轉換資訊\n\n`;
        markdownContent += `- **原始格式**: EPUB\n`;
        markdownContent += `- **轉換格式**: Markdown\n`;
        markdownContent += `- **章節數量**: ${chapterInfo.length}\n`;
        markdownContent += `- **轉換功能**: 直式→橫式 | 簡體→正體 | 字體→微軟正黑體\n`;
        markdownContent += `- **行距設定**: ${this.selectedLineHeight}\n`;
        markdownContent += `- **轉換完成**: ${new Date().toLocaleString('zh-TW')}\n\n`;
        markdownContent += `*由 [EPUB 轉換器](https://milk137592000.github.io/ebook-trans) 轉換*\n`;

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

    extractChapterTitle(html) {
        // 嘗試從 HTML 中提取章節標題
        const titlePatterns = [
            /<title[^>]*>([^<]+)<\/title>/i,
            /<h1[^>]*>([^<]+)<\/h1>/i,
            /<h2[^>]*>([^<]+)<\/h2>/i,
            /<h3[^>]*>([^<]+)<\/h3>/i,
            /<div[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)<\/div>/i,
            /<p[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)<\/p>/i
        ];

        for (const pattern of titlePatterns) {
            const match = html.match(pattern);
            if (match && match[1].trim()) {
                let title = match[1].trim();
                // 清理 HTML 標籤
                title = title.replace(/<[^>]+>/g, '');
                // 清理 HTML 實體
                title = this.decodeHtmlEntities(title);
                // 如果標題太長，截取前50個字符
                if (title.length > 50) {
                    title = title.substring(0, 50) + '...';
                }
                return title;
            }
        }

        return null;
    }

    generateAnchor(title) {
        // 生成 Markdown 錨點連結
        return title
            .toLowerCase()
            .replace(/[^\w\u4e00-\u9fff\s-]/g, '') // 保留中文、英文、數字、空格、連字號
            .replace(/\s+/g, '-') // 空格轉連字號
            .replace(/-+/g, '-') // 多個連字號合併
            .replace(/^-|-$/g, ''); // 移除開頭和結尾的連字號
    }

    structureChapterContent(markdown) {
        // 結構化章節內容，改善層級
        let content = markdown;

        // 將原本的 h1 降級為 h3，h2 降級為 h4，以此類推
        content = content.replace(/^######\s+(.+)$/gm, '######### $1'); // h6 -> h9
        content = content.replace(/^#####\s+(.+)$/gm, '######## $1');  // h5 -> h8
        content = content.replace(/^####\s+(.+)$/gm, '####### $1');   // h4 -> h7
        content = content.replace(/^###\s+(.+)$/gm, '###### $1');    // h3 -> h6
        content = content.replace(/^##\s+(.+)$/gm, '##### $1');     // h2 -> h5
        content = content.replace(/^#\s+(.+)$/gm, '#### $1');       // h1 -> h4

        // 然後將過深的標題調整回合理範圍
        content = content.replace(/^#{7,}\s+(.+)$/gm, '###### $1'); // h7+ -> h6

        // 改善段落結構
        const lines = content.split('\n');
        const structuredLines = [];
        let inList = false;
        let listLevel = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmedLine = line.trim();

            // 處理列表縮排
            if (trimmedLine.match(/^[-*+]\s+/) || trimmedLine.match(/^\d+\.\s+/)) {
                if (!inList) {
                    inList = true;
                    listLevel = 0;
                }
                structuredLines.push(line);
            } else if (trimmedLine === '' && inList) {
                // 列表中的空行
                structuredLines.push(line);
            } else {
                if (inList && trimmedLine !== '') {
                    inList = false;
                    structuredLines.push(''); // 列表後添加空行
                }
                structuredLines.push(line);
            }
        }

        return structuredLines.join('\n');
    }

    decodeHtmlEntities(text) {
        const entities = {
            '&nbsp;': ' ',
            '&amp;': '&',
            '&lt;': '<',
            '&gt;': '>',
            '&quot;': '"',
            '&#39;': "'",
            '&apos;': "'",
            '&hellip;': '…',
            '&mdash;': '—',
            '&ndash;': '–',
            '&ldquo;': '"',
            '&rdquo;': '"',
            '&lsquo;': ''',
            '&rsquo;': '''
        };

        let result = text;
        for (const [entity, char] of Object.entries(entities)) {
            result = result.replace(new RegExp(entity, 'g'), char);
        }

        // 處理數字實體
        result = result.replace(/&#(\d+);/g, (match, num) => {
            return String.fromCharCode(parseInt(num, 10));
        });

        return result;
    }

    htmlToMarkdown(html) {
        // 進階的 HTML 到 Markdown 轉換
        let markdown = html;

        // 移除不需要的標籤
        markdown = markdown.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
        markdown = markdown.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
        markdown = markdown.replace(/<!--[\s\S]*?-->/g, '');
        markdown = markdown.replace(/<meta[^>]*>/gi, '');
        markdown = markdown.replace(/<link[^>]*>/gi, '');

        // 處理特殊區塊（保留結構）
        markdown = markdown.replace(/<div[^>]*class="[^"]*chapter[^"]*"[^>]*>([\s\S]*?)<\/div>/gi, '\n\n$1\n\n');
        markdown = markdown.replace(/<section[^>]*>([\s\S]*?)<\/section>/gi, '\n\n$1\n\n');
        markdown = markdown.replace(/<article[^>]*>([\s\S]*?)<\/article>/gi, '\n\n$1\n\n');

        // 轉換標題（保持原有層級）
        markdown = markdown.replace(/<h1[^>]*>(.*?)<\/h1>/gi, (match, content) => {
            const cleanContent = content.replace(/<[^>]+>/g, '').trim();
            return cleanContent ? `# ${cleanContent}\n\n` : '';
        });
        markdown = markdown.replace(/<h2[^>]*>(.*?)<\/h2>/gi, (match, content) => {
            const cleanContent = content.replace(/<[^>]+>/g, '').trim();
            return cleanContent ? `## ${cleanContent}\n\n` : '';
        });
        markdown = markdown.replace(/<h3[^>]*>(.*?)<\/h3>/gi, (match, content) => {
            const cleanContent = content.replace(/<[^>]+>/g, '').trim();
            return cleanContent ? `### ${cleanContent}\n\n` : '';
        });
        markdown = markdown.replace(/<h4[^>]*>(.*?)<\/h4>/gi, (match, content) => {
            const cleanContent = content.replace(/<[^>]+>/g, '').trim();
            return cleanContent ? `#### ${cleanContent}\n\n` : '';
        });
        markdown = markdown.replace(/<h5[^>]*>(.*?)<\/h5>/gi, (match, content) => {
            const cleanContent = content.replace(/<[^>]+>/g, '').trim();
            return cleanContent ? `##### ${cleanContent}\n\n` : '';
        });
        markdown = markdown.replace(/<h6[^>]*>(.*?)<\/h6>/gi, (match, content) => {
            const cleanContent = content.replace(/<[^>]+>/g, '').trim();
            return cleanContent ? `###### ${cleanContent}\n\n` : '';
        });

        // 轉換段落（保持段落結構）
        markdown = markdown.replace(/<p[^>]*>(.*?)<\/p>/gi, (match, content) => {
            const cleanContent = content.replace(/<br\s*\/?>/gi, '\n').trim();
            return cleanContent ? `${cleanContent}\n\n` : '\n';
        });

        // 轉換換行
        markdown = markdown.replace(/<br\s*\/?>/gi, '  \n'); // Markdown 軟換行

        // 轉換格式化文字
        markdown = markdown.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
        markdown = markdown.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
        markdown = markdown.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
        markdown = markdown.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');
        markdown = markdown.replace(/<u[^>]*>(.*?)<\/u>/gi, '<u>$1</u>'); // 保留下劃線
        markdown = markdown.replace(/<mark[^>]*>(.*?)<\/mark>/gi, '==$1=='); // 高亮

        // 轉換連結
        markdown = markdown.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, (match, href, text) => {
            const cleanText = text.replace(/<[^>]+>/g, '').trim();
            return cleanText ? `[${cleanText}](${href})` : '';
        });

        // 轉換圖片
        markdown = markdown.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi, '![$2]($1)\n\n');
        markdown = markdown.replace(/<img[^>]*src="([^"]*)"[^>]*>/gi, '![]($1)\n\n');

        // 轉換列表（改善縮排）
        markdown = markdown.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (match, content) => {
            const items = content.match(/<li[^>]*>([\s\S]*?)<\/li>/gi);
            if (!items) return '';

            const listItems = items.map(item => {
                const cleanItem = item.replace(/<\/?li[^>]*>/gi, '').replace(/<[^>]+>/g, '').trim();
                return cleanItem ? `- ${cleanItem}` : '';
            }).filter(item => item);

            return listItems.length > 0 ? `\n${listItems.join('\n')}\n\n` : '';
        });

        markdown = markdown.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (match, content) => {
            const items = content.match(/<li[^>]*>([\s\S]*?)<\/li>/gi);
            if (!items) return '';

            const listItems = items.map((item, index) => {
                const cleanItem = item.replace(/<\/?li[^>]*>/gi, '').replace(/<[^>]+>/g, '').trim();
                return cleanItem ? `${index + 1}. ${cleanItem}` : '';
            }).filter(item => item);

            return listItems.length > 0 ? `\n${listItems.join('\n')}\n\n` : '';
        });

        // 轉換引用
        markdown = markdown.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, (match, content) => {
            const cleanContent = content.replace(/<[^>]+>/g, '').trim();
            const lines = cleanContent.split('\n').map(line => `> ${line.trim()}`).join('\n');
            return lines ? `\n${lines}\n\n` : '';
        });

        // 轉換代碼
        markdown = markdown.replace(/<code[^>]*>(.*?)<\/code>/gi, (match, content) => {
            const cleanContent = content.replace(/<[^>]+>/g, '');
            return `\`${cleanContent}\``;
        });
        markdown = markdown.replace(/<pre[^>]*>(.*?)<\/pre>/gi, (match, content) => {
            const cleanContent = content.replace(/<[^>]+>/g, '');
            return `\n\`\`\`\n${cleanContent}\n\`\`\`\n\n`;
        });

        // 轉換表格（基本支援）
        markdown = markdown.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (match, content) => {
            // 簡化的表格轉換
            const rows = content.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
            if (!rows) return '';

            const tableRows = rows.map(row => {
                const cells = row.match(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi);
                if (!cells) return '';

                const cellContents = cells.map(cell => {
                    return cell.replace(/<[^>]+>/g, '').trim();
                });

                return `| ${cellContents.join(' | ')} |`;
            });

            if (tableRows.length > 0) {
                // 添加表格分隔線
                const headerSeparator = `| ${tableRows[0].split('|').slice(1, -1).map(() => '---').join(' | ')} |`;
                return `\n${tableRows[0]}\n${headerSeparator}\n${tableRows.slice(1).join('\n')}\n\n`;
            }

            return '';
        });

        // 處理分隔線
        markdown = markdown.replace(/<hr[^>]*>/gi, '\n---\n\n');

        // 移除剩餘的 HTML 標籤
        markdown = markdown.replace(/<[^>]+>/g, '');

        // 解碼 HTML 實體
        markdown = this.decodeHtmlEntities(markdown);

        // 清理格式
        markdown = markdown.replace(/\n\s*\n\s*\n/g, '\n\n'); // 移除多餘空行
        markdown = markdown.replace(/^\s+|\s+$/gm, ''); // 移除行首行尾空格
        markdown = markdown.replace(/\n{3,}/g, '\n\n'); // 限制最多兩個連續換行
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
