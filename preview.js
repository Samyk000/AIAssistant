// Preview functionality for generated code
class CodePreview {
    constructor() {
        this.initializeElements();
        this.createPreviewModal();
    }

    initializeElements() {
        this.previewModal = null;
        this.previewFrame = null;
        this.closeBtn = null;
    }

    createPreviewModal() {
        // Create modal container if it doesn't exist
        if (!document.getElementById('previewModal')) {
            const modal = document.createElement('div');
            modal.id = 'previewModal';
            modal.className = 'preview-modal';
            modal.innerHTML = `
                <div class="preview-content">
                    <div class="preview-header">
                        <h3>Preview</h3>
                        <button class="close-preview" id="closePreviewBtn">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="preview-container">
                        <iframe id="previewFrame" sandbox="allow-scripts allow-same-origin"></iframe>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            // Store references
            this.previewModal = modal;
            this.previewFrame = document.getElementById('previewFrame');
            this.closeBtn = document.getElementById('closePreviewBtn');

            // Add event listener to close button
            this.closeBtn.addEventListener('click', () => this.closePreview());
        }
    }

    // Extract HTML, CSS, and JS from code blocks
    extractCode(messageContent) {
        const html = this.extractCodeByLanguage(messageContent, 'html');
        const css = this.extractCodeByLanguage(messageContent, 'css');
        const js = this.extractCodeByLanguage(messageContent, 'javascript');
        
        return { html, css, js };
    }

    extractCodeByLanguage(messageContent, language) {
        const codeBlocks = messageContent.querySelectorAll(`.code-block`);
        let code = '';
        
        codeBlocks.forEach(block => {
            const langLabel = block.querySelector('.code-header span');
            if (langLabel && langLabel.textContent.toLowerCase() === language) {
                const codeElement = block.querySelector('code');
                if (codeElement) {
                    code = codeElement.textContent;
                }
            }
        });
        
        return code;
    }

    // Generate a complete HTML document from the extracted code
    generatePreviewDocument(html, css, js) {
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Code Preview</title>
                <style>${css}</style>
            </head>
            <body>
                ${html || '<div class="empty-preview">No HTML content to preview</div>'}
                <script>${js}</script>
            </body>
            </html>
        `;
    }

    // Show preview with the generated code
    showPreview(messageContent) {
        const { html, css, js } = this.extractCode(messageContent);
        
        // Only show preview if we have at least one of HTML, CSS, or JS
        if (html || css || js) {
            const previewDoc = this.generatePreviewDocument(html, css, js);
            
            // Write to the iframe
            const iframe = this.previewFrame;
            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            iframeDoc.open();
            iframeDoc.write(previewDoc);
            iframeDoc.close();
            
            // Show the modal
            this.previewModal.classList.add('active');
            document.getElementById('overlay').classList.add('active');
        } else {
            alert('No previewable code found in this message.');
        }
    }

    // Close the preview
    closePreview() {
        this.previewModal.classList.remove('active');
        document.getElementById('overlay').classList.remove('active');
    }

    // Add preview buttons to all code blocks in a message
    addPreviewButtonToMessage(messageDiv) {
        const messageContent = messageDiv.querySelector('.message-content');
        const codeBlocks = messageContent.querySelectorAll('.code-block');
        
        // Only add a preview button if we have HTML, CSS, or JS code blocks
        let hasPreviewableCode = false;
        codeBlocks.forEach(block => {
            const langLabel = block.querySelector('.code-header span');
            if (langLabel) {
                const lang = langLabel.textContent.toLowerCase();
                if (lang === 'html' || lang === 'css' || lang === 'javascript') {
                    hasPreviewableCode = true;
                }
            }
        });
        
        if (hasPreviewableCode && !messageDiv.querySelector('.preview-btn-wrapper')) {
            const previewBtnWrapper = document.createElement('div');
            previewBtnWrapper.className = 'preview-btn-wrapper';
            previewBtnWrapper.innerHTML = `
                <button class="preview-btn">
                    <i class="fas fa-eye"></i> Preview Website
                </button>
            `;
            
            // Add click event to preview button
            previewBtnWrapper.querySelector('.preview-btn').addEventListener('click', () => {
                this.showPreview(messageContent);
            });
            
            // Add the button after the message content
            messageDiv.appendChild(previewBtnWrapper);
        }
    }
}

// Initialize the preview functionality
const codePreview = new CodePreview();