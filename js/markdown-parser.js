// Markdown解析器 - 简化版
class MarkdownParser {
    constructor() {
        this.rules = {
            heading: /^(#{1,6})\s+(.+)$/gm,
            bold: /\*\*(.*?)\*\*/g,
            italic: /\*(.*?)\*/g,
            code: /`(.*?)`/g,
            link: /\[(.*?)\]\((.*?)\)/g,
            list: /^[-*]\s+(.+)$/gm,
            blockquote: /^>\s+(.+)$/gm,
            horizontal: /^---$/gm
        };
    }

    parse(markdown) {
        let html = markdown;
        
        // 处理标题
        html = html.replace(this.rules.heading, (match, hashes, text) => {
            const level = hashes.length;
            return `<h${level}>${text}</h${level}>`;
        });
        
        // 处理粗体
        html = html.replace(this.rules.bold, '<strong>$1</strong>');
        
        // 处理斜体
        html = html.replace(this.rules.italic, '<em>$1</em>');
        
        // 处理行内代码
        html = html.replace(this.rules.code, '<code>$1</code>');
        
        // 处理链接
        html = html.replace(this.rules.link, '<a href="$2" target="_blank">$1</a>');
        
        // 处理列表
        html = html.replace(this.rules.list, '<li>$1</li>');
        html = html.replace(/<li>.*<\/li>/g, (match) => {
            return `<ul>${match}</ul>`;
        });
        
        // 处理引用
        html = html.replace(this.rules.blockquote, '<blockquote>$1</blockquote>');
        
        // 处理水平线
        html = html.replace(this.rules.horizontal, '<hr>');
        
        // 处理段落（将连续文本包装在p标签中）
        html = html.split('\n\n').map(paragraph => {
            if (paragraph.trim() && 
                !paragraph.startsWith('<h') && 
                !paragraph.startsWith('<ul') && 
                !paragraph.startsWith('<blockquote') && 
                !paragraph.startsWith('<hr')) {
                return `<p>${paragraph}</p>`;
            }
            return paragraph;
        }).join('\n');
        
        return html;
    }
}

// 文件管理系统
class FileManager {
    constructor() {
        this.articlePath = 'article/';  // 修正路径，避免重复的article目录
        this.filePath = 'file/';        // 修正路径，避免重复的file目录
    }

    // 动态检查文件是否存在 - 增强错误处理
    async checkFileExists(filePath) {
        try {
            const response = await fetch(filePath, { 
                method: 'HEAD',
                cache: 'no-cache'
            });
            
            if (!response.ok) {
                console.warn(`文件不存在或无法访问: ${filePath} (状态码: ${response.status})`);
                return false;
            }
            
            return true;
        } catch (error) {
            console.warn(`检查文件是否存在失败: ${filePath}`, error);
            return false;
        }
    }

    // 动态读取文件内容 - 增强错误处理
    async readFileContent(filePath) {
        try {
            const response = await fetch(filePath, {
                cache: 'no-cache'
            });
            
            if (response.ok) {
                return await response.text();
            } else {
                throw new Error(`文件不存在或无法访问: ${filePath} (状态码: ${response.status})`);
            }
        } catch (error) {
            console.error(`读取文件内容失败: ${filePath}`, error);
            throw error;
        }
    }

    // 获取文章列表 - 动态扫描目录（增强错误处理）
    async getArticleList() {
        try {
            // 预定义的Markdown文件列表（根据实际文件创建）
            const potentialFiles = [
                '现代Web开发技术概述.md',
                '响应式设计最佳实践.md', 
                'JavaScript ES6+新特性详解.md'
            ];
            
            const articles = [];
            
            // 动态检查每个文件是否存在 - 使用Promise.all提高效率
            const fileChecks = potentialFiles.map(async (filename) => {
                try {
                    // 对中文文件名进行URL编码
                    const encodedFilename = encodeURIComponent(filename);
                    const filePath = `${this.articlePath}${encodedFilename}`;
                    
                    console.log(`检查文件: ${filePath}`);
                    const exists = await this.checkFileExists(filePath);
                    
                    if (exists) {
                        // 从文件名提取基本信息
                        const title = filename.replace('.md', '');
                        const category = this.getCategoryFromTitle(title);
                        
                        return {
                            filename: filename,
                            encodedFilename: encodedFilename,
                            title: title,
                            date: this.getFileDate(filename),
                            category: category,
                            filePath: filePath,
                            status: 'success'
                        };
                    } else {
                        console.warn(`文件不存在: ${filePath}`);
                        return { filename, status: 'not_found' };
                    }
                } catch (error) {
                    console.error(`检查文件失败: ${filename}`, error);
                    return { filename, status: 'error', error: error.message };
                }
            });
            
            // 等待所有文件检查完成
            const results = await Promise.all(fileChecks);
            
            // 只添加成功的文件
            for (const result of results) {
                if (result.status === 'success') {
                    articles.push(result);
                }
            }
            
            console.log(`成功加载 ${articles.length} 篇文章`);
            return articles;
            
        } catch (error) {
            console.error('获取文章列表失败:', error);
            // 即使出错也返回空数组，而不是中断流程
            return [];
        }
    }

    // 获取文章内容 - 动态读取实际文件
    async getArticleContent(filename) {
        try {
            // 对中文文件名进行URL编码
            const encodedFilename = encodeURIComponent(filename);
            const filePath = `${this.articlePath}${encodedFilename}`;
            
            // 首先检查文件是否存在
            const exists = await this.checkFileExists(filePath);
            if (!exists) {
                return '无文件';
            }
            
            // 读取文件内容
            const content = await this.readFileContent(filePath);
            return content;
            
        } catch (error) {
            console.error(`获取文章内容失败: ${filename}`, error);
            
            if (error.message.includes('文件不存在')) {
                return '无文件';
            }
            
            return '文章内容加载失败';
        }
    }

    // 根据标题判断分类
    getCategoryFromTitle(title) {
        if (title.includes('Web') || title.includes('开发')) {
            return '技术文章';
        } else if (title.includes('设计') || title.includes('响应式')) {
            return '设计文章';
        } else if (title.includes('JavaScript') || title.includes('编程')) {
            return '编程技术';
        }
        return '其他文章';
    }

    // 根据文件名生成日期（模拟）
    getFileDate(filename) {
        const dates = {
            '现代Web开发技术概述.md': '2025-01-01',
            '响应式设计最佳实践.md': '2025-01-02',
            'JavaScript ES6+新特性详解.md': '2025-01-03'
        };
        return dates[filename] || '2025-01-01';
    }

    // 获取文件资源列表 - 动态扫描目录
    async getFileList() {
        try {
            // 预定义的文件列表（根据实际文件创建）
            const potentialFiles = [
                '学习资料1.pdf',
                '工具软件.zip',
                '项目模板.rar'
            ];
            
            const files = [];
            
            // 动态检查每个文件是否存在
            for (const filename of potentialFiles) {
                const filePath = `${this.filePath}${filename}`;
                const exists = await this.checkFileExists(filePath);
                
                if (exists) {
                    files.push({
                        filename: filename,
                        name: filename,
                        size: this.getFileSize(filename),
                        date: this.getFileDate(filename),
                        description: this.getFileDescription(filename),
                        filePath: filePath
                    });
                }
            }
            
            return files;
        } catch (error) {
            console.error('获取文件列表失败:', error);
            return [];
        }
    }

    // 根据文件名获取文件大小（模拟）
    getFileSize(filename) {
        const sizes = {
            '学习资料1.pdf': '2.5MB',
            '工具软件.zip': '15.8MB',
            '项目模板.rar': '8.2MB'
        };
        return sizes[filename] || '1.0MB';
    }

    // 根据文件名获取描述（模拟）
    getFileDescription(filename) {
        const descriptions = {
            '学习资料1.pdf': 'Web开发入门指南',
            '工具软件.zip': '开发工具集合包',
            '项目模板.rar': '项目启动模板'
        };
        return descriptions[filename] || '资源文件';
    }

    // 下载文件 - 动态检查文件存在性
    async downloadFile(filename) {
        try {
            const filePath = `${this.filePath}${filename}`;
            
            // 首先检查文件是否存在
            const exists = await this.checkFileExists(filePath);
            if (!exists) {
                this.showDownloadMessage(filename, false, '文件不存在');
                return;
            }
            
            // 创建临时下载链接
            const link = document.createElement('a');
            link.href = filePath;
            link.download = filename;
            link.target = '_blank';
            
            // 触发下载
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // 显示下载成功提示
            this.showDownloadMessage(filename, true);
            
        } catch (error) {
            console.error(`下载文件失败: ${filename}`, error);
            this.showDownloadMessage(filename, false, '下载失败');
        }
    }

    // 显示下载提示
    showDownloadMessage(filename, success = true, message = '') {
        if (success) {
            const successMsg = `开始下载: ${filename}`;
            console.log(successMsg);
            alert(successMsg);
        } else {
            const errorMsg = message || `下载失败: ${filename}`;
            console.error(errorMsg);
            alert(errorMsg);
        }
    }

    // 通用文件读取函数 - 符合用户要求的动态检查功能
    async readFileDynamically(filePath) {
        try {
            // 1. 检查文件是否存在
            const exists = await this.checkFileExists(filePath);
            
            if (!exists) {
                // 2. 文件不存在时显示'无文件'提示
                return {
                    success: false,
                    content: '无文件',
                    message: `文件不存在: ${filePath}`
                };
            }
            
            // 3. 文件存在时读取并显示内容
            const content = await this.readFileContent(filePath);
            
            return {
                success: true,
                content: content,
                message: `文件读取成功: ${filePath}`
            };
            
        } catch (error) {
            console.error(`动态读取文件失败: ${filePath}`, error);
            
            return {
                success: false,
                content: '无文件',
                message: `文件读取失败: ${error.message}`
            };
        }
    }
}

// 初始化文件管理系统
window.fileManager = new FileManager();
window.markdownParser = new MarkdownParser();