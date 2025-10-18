# AI Tutor - Intelligent Learning Assistant

A sophisticated Progressive Web Application (PWA) that provides personalized AI-powered tutoring experiences with multiple learning modes, interactive features, and visual learning tools.

---

## 🎯 Core Features

### 1. **Multi-Model AI Support**
The application integrates with multiple AI providers, allowing users to choose their preferred model:
- **Gemma** (Google AI) - General-purpose conversational AI
- **ZhipuAI** - Advanced Chinese-English bilingual model
- **Mistral Small** - Fast, efficient general-purpose model
- **Codestral** (Mistral) - Specialized for coding and technical content

### 2. **Adaptive Tutor Modes**
Four distinct teaching personalities tailored to different learning scenarios:

#### **Standard Tutor** 📘
- Socratic method teaching approach
- Step-by-step explanations with guiding questions
- Clear, patient, and encouraging tone
- Breaks down complex concepts systematically

#### **Exam Coach** 🎓
- Direct, efficient, results-focused approach
- Emphasis on key formulas and definitions
- Practice problem generation
- Quick feedback with concise explanations

#### **Friendly Mentor** 🧑‍🏫
- Casual, relatable conversational style
- Real-world analogies and examples
- Constant encouragement and motivation
- Growth mindset reinforcement

#### **Creative Guide** ✍️
- Brainstorming and ideation support
- Open-ended questioning approach
- Sensory detail guidance
- Constructive feedback with creative constraints

### 3. **Smart Mode Detection**
The application automatically analyzes the user's first message to suggest the most appropriate tutor mode:
- Keyword pattern matching across mode-specific vocabularies
- Confidence scoring system (0-1 scale)
- Non-intrusive suggestion banner with one-click mode switching
- Auto-regeneration of responses when mode is changed

**Detection Categories:**
- **Exam preparation** keywords: "exam", "test", "quiz", "prepare"
- **Help-seeking** keywords: "stuck", "confused", "struggling"
- **Creative** keywords: "write", "story", "essay", "brainstorm"
- **General learning** keywords: "learn", "explain", "understand"

---

## 🏗️ Application Architecture

### **Technology Stack**
- **Frontend Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with custom design system
- **State Management**: React Hooks (useState, useEffect, useMemo, useRef)
- **Markdown Rendering**: react-markdown with remark-gfm
- **Code Highlighting**: react-syntax-highlighter with Prism
- **PWA Features**: Service Worker with offline support
- **Build Tool**: Vite

### **Project Structure**

```
src/
├── components/          # React components
│   ├── ChatArea.tsx           # Main chat interface
│   ├── ChatInput.tsx          # Message input with file upload
│   ├── MessageBubble.tsx      # Individual message rendering
│   ├── Sidebar.tsx            # Navigation and conversation list
│   ├── SettingsModal.tsx      # API keys and preferences
│   ├── QuizModal.tsx          # Interactive quiz interface
│   ├── FlowchartCanvas.tsx    # Interactive flowchart editor
│   ├── FlowchartView.tsx      # Flowchart viewer wrapper
│   ├── NoteView.tsx           # Note display component
│   ├── ModeSuggestionBanner.tsx  # Smart mode suggestions
│   ├── Notification.tsx       # Toast notifications
│   ├── InstallPrompt.tsx      # PWA install prompt
│   └── ErrorBoundary.tsx      # Error handling
│
├── services/           # Business logic and API integration
│   ├── aiService.ts           # AI provider abstraction layer
│   ├── flowchartGenerator.ts  # Flowchart generation logic
│   └── modeDetection.ts       # Smart mode detection
│
├── hooks/             # Custom React hooks
│   └── usePWA.ts              # PWA installation detection
│
├── utils/             # Helper functions
│   ├── helpers.ts             # General utilities
│   └── storage.ts             # LocalStorage management
│
├── types/             # TypeScript definitions
│   ├── index.ts               # Core types
│   └── flowchart.ts           # Flowchart-specific types
│
└── index.css          # Global styles and CSS variables
```

---

## 🔄 Data Flow Architecture

### **1. Conversation Management**

```
User Input → ChatArea → App State → AI Service → Streaming Response → Message Bubble
                ↓
         LocalStorage (Debounced)
```

**Key Features:**
- Debounced auto-saving (500ms) to prevent excessive writes
- Streaming response handling with real-time UI updates
- Abort controller for request cancellation
- Message editing and regeneration support

### **2. State Management**

The application uses React's built-in state management with these key states:

```typescript
// Core States
conversations: Conversation[]     // All chat histories
notes: Note[]                     // Saved notes
flowcharts: Flowchart[]          // Generated flowcharts
settings: APISettings             // API keys and preferences

// UI States
currentConversationId: string | null
activeView: 'chat' | 'note' | 'flowchart'
isChatLoading: boolean
streamingMessage: Message | null

// Mode Detection
modeSuggestion: {
  mode: TutorMode
  show: boolean
} | null
```

### **3. AI Service Layer**

The `aiService` provides a unified interface for multiple AI providers:

```typescript
class AiService {
  // Core Methods
  async *generateStreamingResponse()  // Main chat streaming
  async *generateFlowchartResponse()  // Flowchart generation (Gemini only)
  async generateQuiz()                 // Quiz generation
  
  // Provider-Specific Implementations
  - Google Gemma: Custom streaming with SSE
  - ZhipuAI: OpenAI-compatible API
  - Mistral: OpenAI-compatible API
}
```

**Streaming Protocol:**
1. User sends message
2. Service creates streaming generator
3. Chunks are yielded as they arrive
4. UI updates in real-time
5. Final message is saved to state

---

## 🎨 User Interface Components

### **1. Sidebar Component**

**Responsibilities:**
- Conversation list with search and filtering
- Notes and flowcharts navigation
- Model selector (4 AI models)
- Pinned conversations
- Inline conversation renaming
- Settings and PWA installation

**Features:**
- Collapsible sidebar (desktop)
- Slide-in drawer (mobile)
- Real-time search across all items
- Drag-to-reorder (via manual sorting)

### **2. Chat Area**

**Three Display States:**

```
State 1: No conversation selected
  └── Welcome screen with logo

State 2: Empty conversation selected
  └── Conversation title + prompt to ask first question

State 3: Active conversation
  └── Message stream + input area
```

**Message Rendering:**
- Markdown support (tables, lists, code blocks)
- Syntax highlighting for 20+ languages
- Inline LaTeX rendering (future feature)
- Copy, edit, regenerate actions
- Save as note functionality
- Export as markdown

### **3. Quiz System**

**Generation Process:**
1. User triggers quiz from conversation
2. AI analyzes conversation (last 6000 chars)
3. Generates 5 multiple-choice questions
4. Each question has:
   - Question text
   - 4 options
   - Correct answer index
   - Explanation

**Quiz Interface:**
- Progress bar (visual feedback)
- Option selection with A/B/C/D labels
- Immediate feedback (green/red highlighting)
- Explanation display after answer
- Final score with confetti animation (≥75%)
- Completion statistics

### **4. Flowchart Generator**

**Architecture:**

```
Conversation → AI Analysis → JSON Structure → Visual Canvas
                    ↓
              Fallback Logic (if AI fails)
```

**Node Types:**
- **Start**: Main topic/question (green circular)
- **Topic**: Major subject areas (dark rectangular)
- **Concept**: Specific concepts (standard rectangular)
- **Decision**: Conditional logic (diamond shaped)
- **End**: Conclusions (green circular)

**Canvas Features:**
- Pan and zoom controls
- Node drag-and-drop
- Edge creation and labeling
- Double-click to edit labels
- Auto-centering on load
- Export to JSON
- Undo/redo support (planned)

**Layout Algorithm:**
- Hierarchical top-to-bottom flow
- Vertical spacing: 140px minimum
- Horizontal spacing: 200px minimum
- Smart branch distribution
- Automatic curve generation for edges

---

## 💾 Data Persistence

### **LocalStorage Schema**

```typescript
// Keys
'ai-tutor-conversations'  // Conversation[]
'ai-tutor-notes'          // Note[]
'ai-tutor-flowcharts'     // Flowchart[]
'ai-tutor-settings'       // APISettings
'ai-tutor-sidebar-folded' // boolean
'pwa-install-dismissed'   // timestamp

// Storage Management
- Automatic quota checking
- Error recovery on corruption
- Debounced writes (500ms)
- Date serialization handling
```

### **Data Export/Import**

Users can export all data as JSON:
```json
{
  "conversations": [...],
  "notes": [...],
  "settings": {...},
  "exportDate": "ISO timestamp"
}
```

---

## 🎯 Advanced Features

### **1. Smart Caching**

Service Worker caches:
- Static assets (HTML, CSS, JS)
- Logo and icons
- Font files
- Offline fallback page

**Cache Strategy:**
- Network-first for API calls
- Cache-first for static assets
- Stale-while-revalidate for dynamic content

### **2. Progressive Enhancement**

- Works without JavaScript (basic HTML)
- Graceful degradation for older browsers
- Mobile-first responsive design
- Touch-optimized (44px minimum touch targets)
- Keyboard navigation support

### **3. Performance Optimizations**

**React Level:**
- Memoized markdown components
- Virtualized long message lists (planned)
- Code splitting by route (planned)
- Lazy loading for heavy components

**CSS Level:**
- Hardware-accelerated transforms
- Will-change hints for animations
- Reduced paint areas
- CSS containment

### **4. Accessibility**

- Semantic HTML structure
- ARIA labels on interactive elements
- Keyboard shortcuts (Ctrl+Enter to send)
- Focus management in modals
- Screen reader announcements
- High contrast mode support
- Reduced motion mode support

---

## 🔒 Security & Privacy

### **API Key Management**
- Client-side only (never sent to external servers)
- Stored in LocalStorage with no server transmission
- Masked input fields (password type)
- Optional toggle for visibility

### **Data Privacy**
- No analytics or tracking
- No third-party scripts
- All data stored locally
- User controls all exports and deletions

---

## 🌐 PWA Capabilities

### **Installation**
- Auto-detect install eligibility
- Custom install prompt with app info
- Remembers dismissal (24-hour cooldown)
- Standalone display mode

### **Offline Support**
- Cached UI and assets
- Graceful error messages
- Background sync queue (planned)
- Offline indicator

### **Native Features**
- File picker integration
- Share API support
- Notifications (optional)
- Shortcuts (app menu)

---

## 🎨 Design System

### **Color Palette**
```css
--color-bg: #0A0A0A           /* Main background */
--color-sidebar: #141414       /* Sidebar background */
--color-card: #1F1F1F          /* Card background */
--color-border: #2A2A2A        /* Borders */
--color-text-primary: #FFFFFF  /* Primary text */
--color-text-secondary: #A0A0A0 /* Secondary text */
--color-accent: #FFFFFF        /* Accent color */
```

### **Typography**
- Font Family: Inter (Google Fonts)
- Base Font Weight: 500
- Font Weights: 400, 500, 600, 700, 800, 900

### **Animations**
- Message slide-in: 300ms ease-out
- Button hover: 200ms cubic-bezier
- Modal: 300ms ease-in-out
- Shimmer effect: 1.5s infinite

---

## 📊 Performance Metrics

**Target Metrics:**
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3s
- Largest Contentful Paint: < 2.5s
- Cumulative Layout Shift: < 0.1

**Optimization Techniques:**
- Code splitting
- Tree shaking
- Minification
- Compression (Gzip/Brotli)
- Image optimization
- Lazy loading

---

## 🔄 Update Mechanism

**Service Worker Updates:**
1. New version detected
2. Install new service worker
3. Wait for activation
4. Show update notification
5. Refresh on user action

**Data Migration:**
- Version checking in LocalStorage
- Automatic schema upgrades
- Backward compatibility
- Safe fallbacks

---

## 🎯 Future Enhancements

### **Planned Features**
- [ ] Voice input/output
- [ ] Image analysis (vision models)
- [ ] Collaborative learning rooms
- [ ] Spaced repetition system
- [ ] LaTeX equation rendering
- [ ] Mind map generator
- [ ] Study timer with Pomodoro
- [ ] Progress tracking dashboard
- [ ] Cloud sync (optional)
- [ ] Mobile apps (iOS/Android)

### **Technical Improvements**
- [ ] WebAssembly for heavy computations
- [ ] IndexedDB for large conversations
- [ ] WebRTC for peer learning
- [ ] Web Workers for background tasks
- [ ] Virtual scrolling for performance
- [ ] E2E encryption option

---

## 📝 Development Notes

### **Code Quality**
- TypeScript strict mode enabled
- ESLint with React hooks rules
- Consistent naming conventions
- Comprehensive error handling
- Defensive programming practices

### **Browser Support**
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Progressive enhancement for older versions
- Polyfills for missing features
- Graceful degradation

### **Testing Strategy** (Planned)
- Unit tests for utilities
- Integration tests for services
- Component tests with React Testing Library
- E2E tests with Playwright
- Visual regression tests

---

## 🙏 Acknowledgments

Developed by **Tanmay Kalbande**

This application demonstrates modern web development practices with React, TypeScript, and Progressive Web App technologies, showcasing how AI can be integrated into educational tools with a focus on user experience, performance, and accessibility.
