// Configuration
const CONFIG = {
    API_KEY: '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',
    API_ENDPOINT: 'https://openrouter.ai/api/v1/chat/completions',
    MODELS: {
        deepseek: {
            id: 'deepseek/deepseek-chat-v3-0324:free',
            context: `You are CodeCraft AI, an expert coding assistant specializing in web development. Your responses should be:
                1. Clear, concise, and focused on practical solutions
                2. When asked for code, provide complete, working solutions
                3. For website or feature requests, provide separate HTML, CSS, and JavaScript files
                4. Include error handling and responsive design
                5. Follow modern best practices and standards
                6. Format code properly with appropriate comments
                7. Be friendly and conversational while maintaining professionalism
                8. When providing code, wrap it in proper code blocks with language specification
                9. Focus on performance, accessibility, and user experience
                10. Explain complex concepts in simple terms
                11. Always include necessary CDN libraries for frameworks and tools (Bootstrap, jQuery, React, Vue, etc.)
                12. Automatically add required dependencies to make code work immediately

                Important: When users ask for code files, provide them separately and clearly marked, like:
                \`\`\`html
                <!-- HTML code here with all necessary CDN links in the head -->
                \`\`\`

                \`\`\`css
                /* CSS code here */
                \`\`\`

                \`\`\`javascript
                // JavaScript code here
                \`\`\`
            `,
            temperature: 0.3
        },
        gemma: {
            id: 'google/gemma-3-27b-it:free',
            context: `You are CodeCraft AI, a helpful assistant with expertise in general knowledge and analysis. Your responses should be:
                1. Informative and accurate
                2. Well-structured and easy to understand
                3. Include relevant examples when needed
                4. Be conversational and engaging
                5. Provide balanced perspectives
                When discussing code or technical topics, focus on high-level understanding and practical applications.`,
            temperature: 0.7
        }
    }
};

class ChatInterface {
    constructor() {
        this.currentModel = 'deepseek';
        this.chats = this.loadChats() || {};
        this.currentChatId = null;
        this.isProcessing = false;
        this.isGenerating = false;
        this.abortController = null;
        this.settings = this.loadSettings();
        this.initializeElements();
        this.initializeEventListeners();
        this.createNewChat();
        this.applySettings();
    }

    initializeElements() {
        // Main elements
        this.elements = {
            overlay: document.getElementById('overlay'),
            sidebar: document.getElementById('sidebar'),
            chatList: document.getElementById('chatList'),
            chatContainer: document.getElementById('chatContainer'),
            messageInput: document.getElementById('messageInput'),
            sendBtn: document.getElementById('sendBtn'),
            
            // Model selector
            modelDropdownBtn: document.getElementById('modelDropdownBtn'),
            modelDropdown: document.getElementById('modelDropdown'),
            modelOptions: document.querySelectorAll('.model-option'),
            
            // Buttons
            menuBtn: document.getElementById('menuBtn'),
            closeSidebarBtn: document.getElementById('closeSidebarBtn'),
            newChatBtn: document.getElementById('newChatBtn'),
            clearChatBtn: document.getElementById('clearChatBtn'),
            settingsBtn: document.getElementById('settingsBtn'),
            
            // Settings modal
            settingsModal: document.getElementById('settingsModal'),
            closeModalBtn: document.getElementById('closeModalBtn'),
            clearHistoryBtn: document.getElementById('clearHistoryBtn'),
            
            // Loading spinner
            loadingSpinner: document.querySelector('.loading-spinner')
        };
        
        // Main content wrapper for adjusting when sidebar opens/closes
        this.mainContent = document.querySelector('.main-content');
    }

    initializeEventListeners() {
        // Message handling
        this.elements.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSendMessage();
            }
        });
        this.elements.messageInput.addEventListener('input', () => this.autoResizeTextarea());
        this.elements.sendBtn.addEventListener('click', () => this.handleSendMessage());

        // Model selection
        this.elements.modelDropdownBtn.addEventListener('click', () => {
            this.elements.modelDropdownBtn.classList.toggle('active');
            this.elements.modelDropdown.classList.toggle('active');
        });
        
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.model-selector-wrapper')) {
                this.elements.modelDropdownBtn.classList.remove('active');
                this.elements.modelDropdown.classList.remove('active');
            }
        });

        this.elements.modelOptions.forEach(option => {
            option.addEventListener('click', () => {
                const model = option.dataset.model;
                this.switchModel(model);
                this.elements.modelDropdown.classList.remove('active');
                this.elements.modelDropdownBtn.classList.remove('active');
            });
        });

        // Sidebar controls
        this.elements.menuBtn.addEventListener('click', () => this.toggleSidebar());
        this.elements.closeSidebarBtn.addEventListener('click', () => this.toggleSidebar());
        this.elements.overlay.addEventListener('click', () => this.toggleSidebar());
        this.elements.newChatBtn.addEventListener('click', () => this.createNewChat());
        this.elements.clearChatBtn.addEventListener('click', () => this.clearCurrentChat());

        // Settings
        this.elements.settingsBtn.addEventListener('click', () => this.toggleSettingsModal());
        this.elements.closeModalBtn.addEventListener('click', () => this.toggleSettingsModal());
        this.elements.clearHistoryBtn.addEventListener('click', () => this.clearAllHistory());
        
        // Theme and font size
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.addEventListener('click', () => this.handleThemeChange(btn.dataset.theme));
        });
        
        document.querySelectorAll('.font-size-btn').forEach(btn => {
            btn.addEventListener('click', () => this.handleFontSizeChange(btn.dataset.size));
        });

        // No response speed setting anymore
    }

    autoResizeTextarea() {
        const textarea = this.elements.messageInput;
        textarea.style.height = 'auto';
        textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }

    async handleSendMessage() {
        const message = this.elements.messageInput.value.trim();
        
        // If currently generating, stop the generation
        if (this.isGenerating) {
            this.stopGeneration();
            return;
        }
        
        if (!message || this.isProcessing) return;

        this.isProcessing = true;
        this.isGenerating = true;
        this.elements.messageInput.value = '';
        this.autoResizeTextarea();
        
        // Change send button to stop button
        this.updateSendButtonToStop(true);
        
        try {
            // Create user message element
            const userMessageDiv = this.createMessageElement('user', message);
            
            // Add message to chat history
            this.chats[this.currentChatId].messages.push({
                type: 'user',
                content: message
            });

            // Get AI response
            await this.getAIResponse(message);
            
        } catch (error) {
            console.error('Error:', error);
            if (error.name !== 'AbortError') {
                this.createMessageElement('system', 'Sorry, there was an error. Please try again.');
            }
        } finally {
            this.isProcessing = false;
            this.isGenerating = false;
            this.updateSendButtonToStop(false);
            this.saveChats();
        }
    }
    
    updateSendButtonToStop(isGenerating) {
        const sendBtn = this.elements.sendBtn;
        if (isGenerating) {
            sendBtn.innerHTML = '<i class="fas fa-stop"></i>';
            sendBtn.classList.add('stop-generating');
            sendBtn.title = 'Stop generating';
            this.elements.loadingSpinner.classList.remove('hidden');
        } else {
            sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
            sendBtn.classList.remove('stop-generating');
            sendBtn.title = 'Send message';
            this.elements.loadingSpinner.classList.add('hidden');
        }
    }
    
    stopGeneration() {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
    }

    createMessageElement(type, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        
        if (content) {
            if (type === 'user') {
                messageContent.textContent = content;
            } else {
                messageContent.innerHTML = this.formatText(content);
            }
        }
        
        messageDiv.appendChild(messageContent);
        this.elements.chatContainer.appendChild(messageDiv);
        this.scrollToBottom();
        
        return messageDiv;
    }

    formatText(text) {
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
            .replace(/\n/g, '<br>')
            .replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    }

    async getAIResponse(userMessage) {
        const model = CONFIG.MODELS[this.currentModel];
        const chatHistory = this.chats[this.currentChatId].messages;
        
        // Use a higher max_tokens limit for longer responses
        const maxTokens = 8192;
        
        // Create optimized model settings
        const optimizedModel = {
            ...model,
            temperature: 0.7 // Balanced temperature for consistent responses
        };
        
        const messages = [
            { role: 'system', content: optimizedModel.context },
            ...chatHistory.map(msg => ({
                role: msg.type === 'user' ? 'user' : 'assistant',
                content: msg.content
            }))
        ];

        // Create AI message element
        const messageDiv = this.createMessageElement('ai', '');
        const messageContent = messageDiv.querySelector('.message-content');
        messageContent.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';
        
        try {
            this.abortController = new AbortController();
            
            const response = await fetch(CONFIG.API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${CONFIG.API_KEY}`,
                    'HTTP-Referer': window.location.href
                },
                body: JSON.stringify({
                    model: model.id,
                    messages: messages,
                    temperature: optimizedModel.temperature,
                    stream: true,
                    max_tokens: maxTokens
                }),
                signal: this.abortController.signal
            });

            if (!response.ok) throw new Error(`API Error: ${response.status}`);

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let responseText = '';
            let buffer = '';
            let firstChunk = true;

            while (true) {
                const { done, value } = await reader.read();
                
                if (done) {
                    // Process any remaining buffer content
                    if (buffer) {
                        try {
                            const data = JSON.parse(buffer.slice(5));
                            if (data.choices[0].delta?.content) {
                                responseText += data.choices[0].delta.content;
                            }
                        } catch (e) {
                            console.warn('Error parsing final buffer:', e);
                        }
                    }
                    break;
                }

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.trim() === '' || line.trim() === 'data: [DONE]') continue;

                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(5));
                            if (data.choices[0].delta?.content) {
                                const content = data.choices[0].delta.content;
                                responseText += content;
                                
                                if (firstChunk) {
                                    messageContent.innerHTML = '';
                                    firstChunk = false;
                                }
                                
                                this.updateStreamingMessage(messageDiv, responseText);
                            }
                        } catch (e) {
                            console.warn('Error parsing chunk:', e);
                            continue;
                        }
                    }
                }
            }

            // Save the complete message
            if (responseText) {
                this.chats[this.currentChatId].messages.push({
                    type: 'ai',
                    content: responseText
                });

                // Update chat title if it's the first message
                if (this.chats[this.currentChatId].messages.length === 2) {
                    this.updateChatTitle(responseText);
                }
            }

        } catch (error) {
            if (error.name === 'AbortError') {
                messageContent.innerHTML = '<em>Generation stopped.</em>';
            } else {
                messageContent.innerHTML = 'Error: Failed to get response. Please try again.';
                console.error('API Error:', error);
            }
        } finally {
            this.abortController = null;
            this.saveChats();
        }
    }

    updateStreamingMessage(messageDiv, content) {
        const messageContent = messageDiv.querySelector('.message-content');
        
        // Check if content contains code blocks
        if (content.includes('```')) {
            // Split content into text and code blocks
            const parts = content.split(/(```[\s\S]*?(?:```|$))/g);
            messageContent.innerHTML = '';
            
            parts.forEach((part, index) => {
                // Handle complete code blocks
                if (part.startsWith('```') && part.endsWith('```')) {
                    const codeBlock = this.createCodeBlock(part);
                    messageContent.appendChild(codeBlock);
                } 
                // Handle incomplete code blocks (still being streamed)
                else if (part.startsWith('```') && !part.endsWith('```')) {
                    // Create a temporary code block for the incomplete code
                    const tempCodeBlock = this.createIncompleteCodeBlock(part);
                    tempCodeBlock.dataset.partIndex = index; // Store index for future updates
                    messageContent.appendChild(tempCodeBlock);
                } 
                // Handle regular text
                else if (part.trim() !== '') {
                    const textNode = document.createElement('div');
                    textNode.innerHTML = this.formatText(part);
                    messageContent.appendChild(textNode);
                }
            });
        } else {
            messageContent.innerHTML = this.formatText(content);
        }
        
        this.scrollToBottom();
    }

    // Helper method to create a code block for incomplete code that's still streaming
    createIncompleteCodeBlock(codeContent) {
        // Extract language if specified
        const langMatch = codeContent.match(/```([\w-]*)?\s*\n?/);
        let language = langMatch && langMatch[1] ? langMatch[1].trim() : 'plaintext';
        
        // Handle common language aliases
        if (language === 'js') language = 'javascript';
        if (language === 'py') language = 'python';
        if (language === 'ts') language = 'typescript';
        
        // Extract the code content without the opening ```language
        const codeWithoutOpening = codeContent.replace(/```([\w-]*)?\s*\n?/, '');
        
        const wrapper = document.createElement('div');
        wrapper.className = 'code-block streaming-code';
        
        const header = document.createElement('div');
        header.className = 'code-header';
        header.innerHTML = `
            <span>${language}</span>
            <button class="copy-btn">Copy</button>
        `;
        
        const pre = document.createElement('pre');
        const codeElement = document.createElement('code');
        codeElement.className = `language-${language}`;
        codeElement.textContent = codeWithoutOpening;
        pre.appendChild(codeElement);

        header.querySelector('.copy-btn').onclick = () => this.copyToClipboard(codeWithoutOpening, header.querySelector('.copy-btn'));

        wrapper.appendChild(header);
        wrapper.appendChild(pre);

        return wrapper;
    }

    createCodeBlock(codeContent) {
        const match = codeContent.match(/```([\w-]*)?\s*\n?([\s\S]*?)```/);
        if (!match) return document.createElement('div');

        let language = match[1] ? match[1].trim().toLowerCase() : 'plaintext';
        if (language === 'js') language = 'javascript';
        if (language === 'py') language = 'python';
        if (language === 'ts') language = 'typescript';
        
        const code = match[2].trim();
        const wrapper = document.createElement('div');
        wrapper.className = 'code-block';
        
        const header = document.createElement('div');
        header.className = 'code-header';
        header.innerHTML = `
            <span>${language}</span>
            <div class="code-actions">
                ${['html', 'javascript', 'css'].includes(language) ? 
                    '<button class="preview-code-btn" title="Preview"><i class="fas fa-play"></i> Preview</button>' : ''}
                <button class="copy-btn" title="Copy code"><i class="fas fa-copy"></i></button>
            </div>
        `;
        
        const pre = document.createElement('pre');
        const codeElement = document.createElement('code');
        codeElement.className = `language-${language}`;
        codeElement.textContent = code;
        pre.appendChild(codeElement);
        
        const copyBtn = header.querySelector('.copy-btn');
        copyBtn.onclick = () => this.copyToClipboard(code, copyBtn);
        
        const previewBtn = header.querySelector('.preview-code-btn');
        if (previewBtn) {
            previewBtn.onclick = () => this.previewCode(code, language);
        }
        
        wrapper.appendChild(header);
        wrapper.appendChild(pre);
        return wrapper;
    }

    previewCode(code, language) {
        if (window.previewManager) {
            window.previewManager.createPreviewModal(code, language);
        }
    }

    async copyToClipboard(text, button) {
        try {
            await navigator.clipboard.writeText(text);
            const originalText = button.textContent;
            button.textContent = 'Copied!';
            setTimeout(() => button.textContent = originalText, 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
            button.textContent = 'Failed';
            setTimeout(() => button.textContent = 'Copy', 2000);
        }
    }

    updateChatTitle(response) {
        const maxLength = 30;
        let title = response.split('\n')[0].trim();
        title = title.replace(/[`*_]/g, '').substring(0, maxLength);
        if (title.length === maxLength) title += '...';
        
        this.chats[this.currentChatId].title = title;
        this.updateChatList();
    }

    createNewChat() {
        const chatId = Date.now().toString();
        this.chats[chatId] = {
            id: chatId,
            title: 'New Chat',
            model: this.currentModel,
            messages: []
        };
        
        this.currentChatId = chatId;
        this.elements.chatContainer.innerHTML = '';
        this.updateChatList();
        this.saveChats();
        this.toggleSidebar(false);
    }

    updateChatList() {
        this.elements.chatList.innerHTML = '';
        Object.values(this.chats).reverse().forEach(chat => {
            const chatItem = document.createElement('div');
            chatItem.className = `chat-item ${chat.id === this.currentChatId ? 'active' : ''}`;
            chatItem.innerHTML = `
                <i class="fas fa-message"></i>
                <span class="chat-title">${chat.title}</span>
                <span class="chat-date">${this.formatDate(chat.id)}</span>
                <button class="delete-chat-btn" title="Delete chat">
                    <i class="fas fa-times"></i>
                </button>
            `;
            chatItem.querySelector('.delete-chat-btn').onclick = (e) => {
                e.stopPropagation();
                this.deleteChat(chat.id);
            };
            chatItem.onclick = () => this.loadChat(chat.id);
            this.elements.chatList.appendChild(chatItem);
        });
    }

    formatDate(timestamp) {
        const date = new Date(parseInt(timestamp));
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric'
        });
    }

    loadChat(chatId) {
        this.currentChatId = chatId;
        const chat = this.chats[chatId];
        this.elements.chatContainer.innerHTML = '';
        chat.messages.forEach(msg => this.createMessageElement(msg.type, msg.content));
        this.updateChatList();
        this.toggleSidebar(false);
    }

    switchModel(model) {
        this.currentModel = model;
        const modelName = model === 'deepseek' ? 'DeepSeek' : 'Gemma';
        const modelType = model === 'deepseek' ? 'Code Expert' : 'General AI';
        
        this.elements.modelDropdownBtn.querySelector('.model-name').textContent = modelName;
        this.elements.modelDropdownBtn.querySelector('.model-type').textContent = modelType;
        
        this.elements.modelOptions.forEach(option => {
            option.classList.toggle('active', option.dataset.model === model);
        });
    }

    clearCurrentChat() {
        if (confirm('Are you sure you want to clear this chat?')) {
            this.createNewChat();
        }
    }
    
    deleteChat(chatId) {
        if (confirm('Are you sure you want to delete this chat?')) {
            delete this.chats[chatId];
            this.saveChats();
            
            // If we deleted the current chat, create a new one
            if (chatId === this.currentChatId) {
                this.createNewChat();
            } else {
                this.updateChatList();
            }
        }
    }

    clearAllHistory() {
        if (confirm('Are you sure you want to clear all chat history? This cannot be undone.')) {
            this.chats = {};
            localStorage.removeItem('chats');
            this.createNewChat();
            this.toggleSettingsModal();
        }
    }

    toggleSidebar(show = null) {
        const isActive = show ?? !this.elements.sidebar.classList.contains('active');
        this.elements.sidebar.classList.toggle('active', isActive);
        this.elements.overlay.classList.toggle('active', isActive);
        
        // Adjust main content when sidebar is active
        if (isActive) {
            this.mainContent.style.marginLeft = '0';
            this.mainContent.style.width = 'calc(100% - var(--sidebar-width))';
        } else {
            this.mainContent.style.marginLeft = '0';
            this.mainContent.style.width = '100%';
        }
    }

    toggleSettingsModal() {
        this.elements.settingsModal.classList.toggle('active');
    }

    loadChats() {
        try {
            return JSON.parse(localStorage.getItem('chats')) || {};
        } catch {
            return {};
        }
    }

    saveChats() {
        localStorage.setItem('chats', JSON.stringify(this.chats));
    }

    loadSettings() {
        const defaultSettings = {
            theme: 'light',
            fontSize: 'medium'
        };
        try {
            return JSON.parse(localStorage.getItem('settings')) || defaultSettings;
        } catch {
            return defaultSettings;
        }
    }

    saveSettings() {
        const settings = {
            theme: document.documentElement.getAttribute('data-theme'),
            fontSize: document.documentElement.getAttribute('data-font-size')
        };
        localStorage.setItem('settings', JSON.stringify(settings));
    }

    applySettings() {
        document.documentElement.setAttribute('data-theme', this.settings.theme);
        document.documentElement.setAttribute('data-font-size', this.settings.fontSize);
        
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.theme === this.settings.theme);
        });
        
        document.querySelectorAll('.font-size-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.size === this.settings.fontSize);
        });
    }

    handleThemeChange(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.theme === theme);
        });
        this.settings.theme = theme;
        this.saveSettings();
    }

    handleFontSizeChange(size) {
        document.documentElement.setAttribute('data-font-size', size);
        document.querySelectorAll('.font-size-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.size === size);
        });
        this.settings.fontSize = size;
        this.saveSettings();
    }

    scrollToBottom() {
        // Only auto-scroll if user is already near the bottom
        const container = this.elements.chatContainer;
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
        
        if (isNearBottom) {
            requestAnimationFrame(() => {
                container.scrollTop = container.scrollHeight;
            });
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.chatInterface = new ChatInterface();
});

// Global error handler
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    if (window.chatInterface) {
        window.chatInterface.createMessageElement('system', 'An error occurred. Please try again.');
        window.chatInterface.isProcessing = false;
        window.chatInterface.elements.sendBtn.disabled = false;
        window.chatInterface.elements.loadingSpinner.classList.add('hidden');
    }
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    if (window.chatInterface) {
        window.chatInterface.createMessageElement('system', 'A network error occurred. Please check your connection and try again.');
    }
});
