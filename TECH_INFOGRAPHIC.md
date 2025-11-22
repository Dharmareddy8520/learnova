# Learnova Technology Stack - Visual Reference

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                         LEARNOVA TECH STACK                                   ║
║                    AI-Powered Knowledge Companion                             ║
╚═══════════════════════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────────────────────┐
│                           🎨 FRONTEND (Port 5174)                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │ React 18    │  │ TypeScript   │  │ Vite     │  │ Tailwind CSS     │   │
│  │ └─ Components│  │ 5.2.2        │  │ 5.0.8    │  │ 3.4.18           │   │
│  │ └─ Hooks     │  │ Type-safe    │  │ HMR Dev  │  │ Utility-first    │   │
│  │ └─ Context   │  │ Compile-time │  │ Server   │  │ Styling          │   │
│  └─────────────┘  └──────────────┘  └──────────┘  └──────────────────┘   │
│                                                                              │
│  ┌────────────────────┐  ┌──────────────┐  ┌────────────────────────┐    │
│  │ React Query 5.8.4  │  │ React Router │  │ Lucide React Icons     │    │
│  │ ├─ Server State    │  │ 6.20.1       │  │ ├─ 550+ Icons         │    │
│  │ ├─ Auto Caching    │  │ ├─ Routing   │  │ └─ Tree-shakeable      │    │
│  │ └─ Sync            │  │ └─ Protection│  └────────────────────────┘    │
│  └────────────────────┘  └──────────────┘                                 │
│                                                                              │
│  ┌────────────────────┐  ┌──────────────┐  ┌────────────────────────┐    │
│  │ Axios 1.6.2        │  │ Testing Lib  │  │ Vitest 1.0.4           │    │
│  │ ├─ HTTP Client     │  │ React 14.1   │  │ ├─ Unit Tests         │    │
│  │ ├─ Request/Response│  │ ├─ Jest-DOM  │  │ ├─ jsdom              │    │
│  │ └─ Interceptors    │  │ └─ User Event│  │ └─ Browser Testing    │    │
│  └────────────────────┘  └──────────────┘  └────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

                              🔗 API PROXY 🔗
                            /api → localhost:3001

┌─────────────────────────────────────────────────────────────────────────────┐
│                           🔧 BACKEND (Port 3001)                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │ Node.js 18+  │  │ Express      │  │ TypeScript  │ Mongoose 8.0.3   │  │
│  │ ├─ Runtime   │  │ 4.18.2       │  │ 5.3.3       │ ├─ ODM           │  │
│  │ ├─ Async/await  │ ├─ Routes     │  │ Type-safe   │ ├─ Schemas       │  │
│  │ └─ npm        │  │ ├─ Middleware│  │ Compilation │ └─ Validation    │  │
│  └──────────────┘  │ └─ REST API   │  └─────────────┘ └──────────────────┘  │
│                    └──────────────┘                                        │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐   │
│  │               🤖 AI/ML SERVICES LAYER                              │   │
│  ├────────────────────────────────────────────────────────────────────┤   │
│  │                                                                     │   │
│  │  PRIMARY: Google Gemini (@google/generative-ai 0.24.1)            │   │
│  │  ├─ Model: gemini-2.5-flash / pro                                │   │
│  │  ├─ Multi-key rotation                                            │   │
│  │  ├─ Exponential backoff retry (3x)                                │   │
│  │  └─ Tasks: Summary, Quiz, Flashcards, Q&A                        │   │
│  │                                                                     │   │
│  │  FALLBACK: HuggingFace (@huggingface/inference 4.12.0)           │   │
│  │  ├─ Model: Meta-Llama-2-70b-hf                                   │   │
│  │  ├─ Used when Gemini unavailable                                 │   │
│  │  └─ Tasks: All AI tasks                                          │   │
│  │                                                                     │   │
│  │  ALTERNATIVE: OpenAI (openai 4.20.1)                             │   │
│  │  ├─ Model: gpt-3.5-turbo                                         │   │
│  │  └─ Optional alternative provider                                │   │
│  │                                                                     │   │
│  │  ORCHESTRATION: LangChain 1.0.1                                  │   │
│  │  ├─ Document chunking                                            │   │
│  │  ├─ Prompt templates                                             │   │
│  │  ├─ Structured output parsing                                    │   │
│  │  └─ Chain of thought                                             │   │
│  └────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐   │
│  │            📄 DOCUMENT PROCESSING                                  │   │
│  ├────────────────────────────────────────────────────────────────────┤   │
│  │  pdf-parse 2.4.5 ←→ PDF files                                    │   │
│  │  pdfjs-dist 5.4.394 ←→ PDF rendering                             │   │
│  │  mammoth 1.11.0 ←→ DOCX files                                    │   │
│  │  tesseract.js 6.0.1 ←→ OCR / Image text                          │   │
│  └────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐   │
│  │            🔐 AUTHENTICATION & SECURITY                            │   │
│  ├────────────────────────────────────────────────────────────────────┤   │
│  │  Passport.js 0.7.0                                                │   │
│  │  ├─ Strategy: Local ──→ passport-local 1.0.0                     │   │
│  │  ├─ Strategy: Google ──→ passport-google-oauth20 2.0.0          │   │
│  │  └─ Strategy: GitHub ──→ passport-github2 0.1.12                 │   │
│  │  bcryptjs 2.4.3 ──→ Password hashing                             │   │
│  │  jsonwebtoken 9.0.2 ──→ JWT tokens                               │   │
│  │  express-session 1.17.3 ──→ Session management                   │   │
│  │  helmet 7.1.0 ──→ Security headers                               │   │
│  │  cors 2.8.5 ──→ CORS protection                                  │   │
│  └────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐   │
│  │            💾 DATA & FILE MANAGEMENT                               │   │
│  ├────────────────────────────────────────────────────────────────────┤   │
│  │  Multer 1.4.5 ──→ File upload middleware                          │   │
│  │  GridFS ──→ File storage in MongoDB                               │   │
│  │  fs-extra 11.3.2 ──→ File system utilities                        │   │
│  │  connect-mongo 5.1.0 ──→ MongoDB session store                    │   │
│  │  UUID 13.0.0 ──→ Unique identifiers                               │   │
│  └────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐   │
│  │            🔄 OTHER SERVICES                                       │   │
│  ├────────────────────────────────────────────────────────────────────┤   │
│  │  Agenda 5.0.0 ──→ Background job queue                            │   │
│  │  Stripe 14.7.0 ──→ Payment processing                             │   │
│  │  dotenv 16.3.1 ──→ Environment variables                          │   │
│  │  Zod 3.22.4 ──→ Runtime validation                                │   │
│  │  cookie-parser 1.4.7 ──→ Cookie handling                          │   │
│  └────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                        💾 DATA LAYER (MongoDB)                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────┐     │
│  │ User Collection                                                  │     │
│  │ ├─ _id (ObjectId)                                               │     │
│  │ ├─ email, passwordHash                                          │     │
│  │ ├─ name, role (free/pro/admin)                                 │     │
│  │ ├─ streakDays, lastActiveDate                                  │     │
│  │ ├─ oauthProviders (Google, GitHub)                             │     │
│  │ └─ preferences                                                  │     │
│  └──────────────────────────────────────────────────────────────────┘     │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────┐     │
│  │ UsageEvent Collection                                            │     │
│  │ ├─ userId → User._id                                            │     │
│  │ ├─ feature ('summary'|'flashcard'|'quiz'|'qa')                 │     │
│  │ ├─ tokensUsed, cost                                             │     │
│  │ └─ createdAt                                                    │     │
│  └──────────────────────────────────────────────────────────────────┘     │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────┐     │
│  │ GridFS (File Storage)                                            │     │
│  │ ├─ Uploaded PDFs                                                │     │
│  │ ├─ DOCX files                                                   │     │
│  │ └─ Document metadata                                            │     │
│  └──────────────────────────────────────────────────────────────────┘     │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────┐     │
│  │ Sessions (via connect-mongo)                                     │     │
│  │ └─ Encrypted session data                                       │     │
│  └──────────────────────────────────────────────────────────────────┘     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                      🔗 EXTERNAL SERVICES                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  🤖 AI APIs                          🔐 Authentication                     │
│  ├─ Google Gemini (Primary)          ├─ Google OAuth 2.0                 │
│  ├─ HuggingFace Inference            └─ GitHub OAuth 2.0                 │
│  └─ OpenAI (Optional)                                                     │
│                                      💳 Payments                           │
│  📊 Infrastructure                   └─ Stripe API                        │
│  └─ MongoDB Cloud (or local)                                              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                        🧪 DEVELOPMENT & TESTING                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Frontend Testing                    Backend Testing                       │
│  ├─ Vitest 1.0.4                    ├─ Jest 29.7.0                       │
│  ├─ React Testing Library 14.1.2    ├─ Supertest 6.3.3                   │
│  ├─ Testing Library/jest-dom        ├─ ts-jest 29.1.1                    │
│  ├─ Testing Library/user-event      └─ @types/* packages                 │
│  ├─ jsdom (browser environment)                                           │
│  └─ @vitejs/plugin-react 4.2.1      Code Quality                         │
│                                      ├─ ESLint 8.55.0                    │
│  Development                         ├─ @typescript-eslint/eslint-plugin │
│  ├─ tsx 4.6.2 (TS execution)        └─ @typescript-eslint/parser        │
│  ├─ TypeScript Compiler              Styling                             │
│  ├─ PostCSS 8.5.6                    ├─ Autoprefixer 10.4.21             │
│  └─ Tailwind CLI 3.4.18              └─ Tailwind CSS 3.4.18              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                         📊 DEPENDENCY SUMMARY                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Frontend:                          Backend:                               │
│  • 8 Production Dependencies         • 30 Production Dependencies           │
│  • 12 Dev Dependencies               • 8 Dev Dependencies                  │
│  • Total: 20+ Packages              • Total: 38+ Packages                 │
│                                                                              │
│  Overall: 50+ Total Dependencies                                           │
│  TypeScript Coverage: 100% (src/)                                          │
│  Test Coverage: ~40% (configurable)                                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                          🚀 KEY COMMANDS                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Frontend:                          Backend:                               │
│  npm run dev:frontend               npm run dev:backend                   │
│  npm run build                      npm run build                         │
│  npm run lint                       npm test                              │
│  npm run test:ui                    npm run test:watch                    │
│                                                                              │
│  Both:                                                                      │
│  npm run dev        (Start both servers)                                   │
│  npm test           (Run all tests)                                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

╔═══════════════════════════════════════════════════════════════════════════════╗
║  Documentation Files:                                                         ║
║  • TECH_STACK.md - Detailed reference (11KB)                                 ║
║  • TECH_STACK_QUICK.md - Quick visual reference (2.2KB)                      ║
║  • ARCHITECTURE.md - System design & data flows (23KB)                        ║
║  • TECH_SUMMARY.md - This comprehensive summary                              ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

---

## 📱 Data Flow Example: Document Upload → Summary

```
1. User Uploads PDF
   └─→ Frontend: <input type="file" /> or paste text
   
2. File Processing
   └─→ Multer middleware validates & stores file
   
3. Frontend Sends Request
   └─→ Axios POST /api/analyze
       { file: File, tasks: { summary: true } }
   
4. Backend Processing
   └─→ Route: /analyze
       ├─→ Middleware: Auth check, file validation
       ├─→ Service: Document extraction
       │   ├─→ If PDF: pdf-parse + pdfjs-dist
       │   ├─→ If DOCX: mammoth
       │   └─→ If Image: tesseract.js (OCR)
       ├─→ Store in GridFS + MongoDB
       └─→ Queue with Agenda
   
5. AI Processing
   └─→ Check GEMINI_API_KEYS config
       ├─→ YES: Use Gemini Service
       │   ├─→ LangChain chunks document
       │   ├─→ Prompt: "Summarize approximately 300 words"
       │   ├─→ Retry up to 3x with exponential backoff
       │   └─→ Parse structured response
       └─→ NO: Fall back to HuggingFace
   
6. Response to Frontend
   └─→ JSON: { summary: "...", wordCount: 298, model: "gemini-2.5-flash" }
   
7. Frontend Display
   └─→ React Query caches response
   └─→ Component renders summary
   └─→ User can copy, save, or regenerate
```

---

## 🎯 Technology Decision Matrix

```
Choice              | Why?                                    | Alternative
─────────────────────────────────────────────────────────────────────────────
React              │ Large ecosystem, great DX, JSX syntax   │ Vue, Svelte
TypeScript         │ Catches bugs early, better IDE support  │ Flow, Elm
MongoDB            │ Flexible schema for iterating features  │ PostgreSQL
Express            │ Lightweight, flexible, middleware focus │ Fastify
Gemini             │ State-of-the-art, cost-effective        │ GPT-4, Claude
Vite               │ Lightning fast HMR, modern bundler      │ Webpack, Parcel
Tailwind           │ Utility-first, rapid development        │ CSS-in-JS
Passport           │ Industry standard, many strategies      │ Auth0, Firebase
Jest + Vitest      │ Industry standard, excellent coverage   │ Mocha, Jasmine
LangChain          │ Abstracts LLM complexity, structured    │ Direct API calls
```

---

*Last Updated: November 18, 2025*
*For detailed documentation, see TECH_STACK.md and ARCHITECTURE.md*
