// Configuration
const CONFIG = {
    API_KEY: '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',
    API_ENDPOINT: 'https://openrouter.ai/api/v1/chat/completions',
    MODELS: {
        deepseek: {
            id: 'deepseek/deepseek-chat-v3-0324:free',
            context: `You are CodeCraft AI, an elite full-stack development assistant specializing in creating exceptional web applications. Your responses must deliver:

                CODE QUALITY & ARCHITECTURE:
                1. Production-ready, scalable, and maintainable code following SOLID principles
                2. Modern architectural patterns (MVC, MVVM, Component-based, etc.)
                3. Clean code with proper separation of concerns
                4. Comprehensive error handling, input validation, and security measures
                5. Performance optimization (lazy loading, code splitting, caching strategies)
                6. TypeScript/ES6+ best practices with proper typing
                7. Automated testing suggestions (unit, integration, E2E)
                8. Git-friendly code structure with .gitignore recommendations

                UI/UX EXCELLENCE:
                1. Modern, responsive designs using CSS Grid/Flexbox
                2. Mobile-first approach with fluid typography
                3. Micro-interactions and smooth animations
                4. Consistent visual hierarchy and spacing systems
                5. Accessibility (WCAG 2.1 AA compliance)
                6. Dark/Light theme compatibility
                7. Loading states and error handling UX
                8. Progressive enhancement principles

                MODERN WEB FEATURES:
                1. PWA capabilities with service workers
                2. LocalStorage/IndexedDB for offline functionality
                3. API integration with proper error handling
                4. Real-time features with WebSocket/SSE
                5. Modern build tools (Vite, Webpack) configuration
                6. SEO optimization and meta tags
                7. Analytics and performance monitoring
                8. Cross-browser compatibility

                FRAMEWORK EXPERTISE:
                1. React (Next.js, hooks, context, Redux)
                2. Vue (Nuxt.js, Composition API, Pinia)
                3. Modern CSS (Tailwind, SCSS, CSS Modules)
                4. Component libraries integration
                5. State management best practices
                6. Server-side rendering optimization
                7. API route handlers and middleware
                8. Database integration patterns

                OUTPUT FORMAT:
                Always provide code in separate, properly marked blocks:
                \`\`\`html
                <!-- index.html with meta tags, CDN links -->
                \`\`\`

                \`\`\`css
                /* styles.css with responsive design */
                \`\`\`

                \`\`\`javascript
                // script.js with modern practices
                \`\`\`

                For component frameworks:
                - Proper file/folder structure
                - Component composition
                - Props/State management
                - Type definitions
                - Style modules
                - Unit tests`,
            temperature: 0.3,
            top_p: 0.95,
            frequency_penalty: 0.1,
            presence_penalty: 0.1
        },
        gemma: {
            id: 'google/gemma-3-27b-it:free',
            context: `You are CodeCraft AI, an advanced analytical assistant specializing in:
                1. Clear, comprehensive explanations
                2. Step-by-step problem-solving
                3. Conceptual understanding of complex topics
                4. Architecture and system design discussions
                5. Best practices and industry standards
                6. Performance optimization strategies
                7. Security considerations
                8. Code review and improvement suggestions
                9. Database design and optimization
                10. API design principles

                Your responses should:
                - Break down complex concepts into understandable parts
                - Provide relevant examples and use cases
                - Include diagrams/flowcharts descriptions when helpful
                - Cite industry standards and best practices
                - Suggest alternative approaches when relevant
                - Consider scalability and maintainability`,
            temperature: 0.7,
            top_p: 0.9,
            frequency_penalty: 0.2,
            presence_penalty: 0.2
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
        
        // Enhanced contexts for both models
        const enhancedContext = this.currentModel === 'deepseek' ? 
            `${model.context}\nPrevious conversation context: The user has been discussing ${this.chats[this.currentChatId].title}. Maintain consistent coding style and explanations.` :
            `${model.context}\nPrevious conversation summary: ${this.chats[this.currentChatId].title}. Provide clear and concise explanations while maintaining context.`;
        
        const messages = [
            { role: 'system', content: enhancedContext },
            ...chatHistory.map(msg => ({
                role: msg.type === 'user' ? 'user' : 'assistant',
                content: msg.content
            }))
        ];

        // Use a higher max_tokens limit for longer responses
        const maxTokens = 16384; // Increased from 8192
        
        // Create optimized model settings
        const optimizedModel = {
            ...model,
            temperature: 0.7 // Balanced temperature for consistent responses
        };
        
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
                    max_tokens: maxTokens,
                    presence_penalty: 0.1, // Added to encourage more complete responses
                    frequency_penalty: 0.1  // Added to encourage more varied content
                }),
                signal: this.abortController.signal
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status} - ${await response.text()}`);
            }

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
                console.error('API Error:', error);
                messageContent.innerHTML = 'Error: Failed to get response. Please check your API key and try again.';
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
        header.innerHTML = `<span>${language}</span>`;
        
        const pre = document.createElement('pre');
        const codeElement = document.createElement('code');
        codeElement.className = `language-${language}`;
        codeElement.textContent = code;
        pre.appendChild(codeElement);
        
        const actions = document.createElement('div');
        actions.className = 'code-actions';
        actions.innerHTML = `
            ${['html', 'javascript', 'css'].includes(language) ? 
                '<button class="preview-code-btn" title="Preview"><i class="fas fa-play"></i> Preview</button>' : ''}
            <button class="copy-btn" title="Copy code"><i class="fas fa-copy"></i> Copy</button>
        `;
        
        const copyBtn = actions.querySelector('.copy-btn');
        copyBtn.onclick = () => this.copyToClipboard(code, copyBtn);
        
        const previewBtn = actions.querySelector('.preview-code-btn');
        if (previewBtn) {
            previewBtn.onclick = () => this.previewCode(code, language);
        }
        
        wrapper.appendChild(header);
        wrapper.appendChild(pre);
        wrapper.appendChild(actions);
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
        const previousModel = this.currentModel;
        this.currentModel = model;
        const modelName = model === 'deepseek' ? 'DeepSeek' : 'Gemma';
        const modelType = model === 'deepseek' ? 'Code Expert' : 'General AI';
        
        // Update UI elements
        this.elements.modelDropdownBtn.querySelector('.model-name').textContent = modelName;
        this.elements.modelDropdownBtn.querySelector('.model-type').textContent = modelType;
        
        this.elements.modelOptions.forEach(option => {
            option.classList.toggle('active', option.dataset.model === model);
        });

        // Add model switch notification
        if (previousModel !== model) {
            this.addModelSwitchNotification(modelName);
        }
    }

    addModelSwitchNotification(modelName) {
        const notificationDiv = document.createElement('div');
        notificationDiv.className = 'model-switch-notification';
        notificationDiv.innerHTML = `<i class="fas fa-exchange-alt"></i> Switched to ${modelName}`;
        this.elements.chatContainer.appendChild(notificationDiv);
        this.scrollToBottom();
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
            const chats = JSON.parse(localStorage.getItem('chats')) || {};
            Object.values(chats).forEach(chat => {
                if (!chat.model) chat.model = 'deepseek';
            });
            return chats;
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
