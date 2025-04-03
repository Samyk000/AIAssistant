class ModelShowcase {
    constructor() {
        this.modelExamples = {
            deepseek: {
                title: "Create Something Amazing",
                description: "👾",
                examples: [
                    {
                        icon: 'fas fa-cube',
                        title: '3D Product Card',
                        description: 'Interactive product showcase with stunning effects',
                        prompt: `Create a stunning 3D product card with these features:

- Floating product with realistic 3D transform
- Interactive rotation on mouse move
- Beautiful gradient glass-card design
- Feature list with animated icons
- Price tag with purchase button
- Product image with reflection
- Particle effects on hover
- Color switcher with smooth transitions
- Responsive design that works on mobile

Use vanilla JavaScript and modern CSS only.
Focus on smooth animations and 3D effects.
Keep it clean, beautiful, and highly interactive.
Deliver a single HTML file that works instantly.`
                    },
                    {
                        icon: 'fas fa-wand-magic-sparkles',
                        title: 'Magic Portfolio',
                        description: 'Stunning single-page portfolio',
                        prompt: `Create a stunning single-page portfolio with:

- Hero section with particle text animation
- Floating project cards with 3D hover effect
- Smooth scroll animations
- Skills section with animated progress bars
- Contact form with floating labels
- Beautiful gradient backgrounds
- Modern glassmorphism design
- Responsive layout with clean grid

Style Requirements:
- Use modern CSS (Grid, Flexbox)
- Implement smooth animations
- Include light/dark mode toggle
- Mobile-first approach

Keep everything in a single HTML file using internal CSS/JS.
Focus on visual impact and smooth interactions.
Use minimal external resources (only Font Awesome CDN).`
                    },
                    {
                        icon: 'fas fa-wand-sparkles',
                        title: 'Interactive Clock',
                        description: 'Stunning animated clock with particle effects',
                        prompt: `Create a beautiful interactive clock with these features:

- Elegant analog clock with smooth movement
- Floating numbers with gradient glow
- Particle trails following clock hands
- Interactive ripple effects on click/touch
- Real-time digital display with fade animations
- Beautiful gradient background that shifts with time
- Animated date display
- Subtle shadow and depth effects
- Dark/light mode support
- Mobile responsive design

Use vanilla JavaScript and CSS only.
Focus on smooth animations and visual polish.
Keep it minimal but extremely beautiful.
Make it work instantly in a single HTML file.

Extra requirements:
- Custom CSS variables for all colors
- 60fps smooth animations
- Clean modern typography
- Perfect center alignment
- Hover effects on interactive elements
- Subtle ambient background animation`
                    }
                ]
            },
            gemma: {
                title: "Personal Growth & Insights",
                description: "Your companion for self-discovery and transformation",
                examples: [
                    {
                        icon: 'fas fa-mask',
                        title: 'Self Discovery Journey',
                        description: 'Uncover your authentic self through guided reflection and deep insights.',
                        prompt: 'I want to uncover the masks and roles I\'m playing, the illusions I\'m believing. Please guide me through the process by asking reflective questions one at a time. After our discussion, analyze my responses and provide actionable steps for authentic growth.'
                    },
                    {
                        icon: 'fas fa-seedling',
                        title: 'Inner Growth Work',
                        description: 'Transform limiting beliefs and develop empowering mindsets.',
                        prompt: 'Help me identify and transform my limiting beliefs. Guide me through a process of understanding where these beliefs come from, how they\'re affecting my life, and what new empowering beliefs I can cultivate.'
                    },
                    {
                        icon: 'fas fa-compass',
                        title: 'Life Purpose Clarity',
                        description: 'Find clarity in your life direction and authentic path.',
                        prompt: 'I feel disconnected from my true purpose. Help me explore my values, passions, and fears through reflective questions. Guide me to understand what truly matters to me and how to align my life with my authentic self.'
                    }
                ]
            }
        };
    }

    createShowcase(model) {
        const existingShowcase = document.querySelector('.model-showcase');
        if (existingShowcase) {
            existingShowcase.classList.add('exit');
            setTimeout(() => existingShowcase.remove(), 300);
        }

        const modelData = this.modelExamples[model];
        if (!modelData) return;

        const showcase = document.createElement('div');
        showcase.className = 'model-showcase';
        showcase.innerHTML = `
            <div class="model-showcase-grid">
                ${modelData.examples.map(example => `
                    <div class="showcase-card" data-prompt="${example.prompt}">
                        <div class="showcase-icon">
                            <i class="${example.icon}"></i>
                        </div>
                        <div class="showcase-content">
                            <div class="showcase-title">${example.title}</div>
                            <div class="showcase-description">${example.description}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        // Add click handlers to cards
        showcase.querySelectorAll('.showcase-card').forEach(card => {
            card.addEventListener('click', () => {
                const prompt = card.dataset.prompt;
                if (window.chatInterface) {
                    window.chatInterface.handleExampleClick(prompt);
                }
            });
        });

        const chatContainer = document.getElementById('chatContainer');
        chatContainer.appendChild(showcase);
    }
}

// Initialize showcase immediately after page load
window.addEventListener('load', () => {
    if (!window.modelShowcase) {
        window.modelShowcase = new ModelShowcase();
        // Show initial showcase if chat is empty
        if (window.chatInterface?.isChatEmpty()) {
            window.modelShowcase.createShowcase(window.chatInterface.currentModel);
        }
    }
});
