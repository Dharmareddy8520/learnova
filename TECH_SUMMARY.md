# Learnova Tech Stack - Complete Summary

## 📚 Documentation Files Created

I've created comprehensive documentation about all technologies used in your project:

1. **TECH_STACK.md** (11KB) - Detailed reference of every library and tool
2. **TECH_STACK_QUICK.md** (2.2KB) - Quick visual reference
3. **ARCHITECTURE.md** (23KB) - System design and data flows

---

## 🎯 Quick Overview

### Core Technologies (9)
- **React 18** - UI library
- **TypeScript** - Type safety
- **Node.js + Express** - Backend
- **MongoDB** - Database
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Passport.js** - Authentication
- **Google Gemini** - Primary AI
- **Stripe** - Payments

### Supporting Libraries (50+)
- **AI/ML**: LangChain, HuggingFace, OpenAI, Tesseract.js
- **Document**: pdf-parse, mammoth, pdfjs-dist
- **State**: React Query, React Router
- **Auth**: OAuth 2.0, JWT, bcryptjs
- **Database**: Mongoose, GridFS
- **File Upload**: Multer
- **Testing**: Jest, Vitest, React Testing Library
- **Security**: Helmet, CORS
- **Job Queue**: Agenda
- **Validation**: Zod

---

## 📊 By Layer

### Frontend Stack
```
React 18 (UI) + TypeScript (Types)
└─ Vite (Build) + Tailwind (CSS)
   └─ React Router (Navigation)
      └─ React Query (State)
         └─ Axios (HTTP)
```
**Total**: 8 core dependencies + 12 dev dependencies

### Backend Stack
```
Node.js + Express (Server) + TypeScript (Types)
└─ MongoDB + Mongoose (Database)
   ├─ Passport.js (Auth)
   │  ├─ Google OAuth 2.0
   │  ├─ GitHub OAuth 2.0
   │  └─ Local Strategy
   ├─ AI Services
   │  ├─ Google Gemini (Primary)
   │  ├─ HuggingFace (Fallback)
   │  └─ OpenAI (Alternative)
   ├─ Document Processing
   │  ├─ pdf-parse
   │  ├─ mammoth
   │  └─ Tesseract.js
   ├─ Job Queue
   │  └─ Agenda
   └─ Payments
      └─ Stripe
```
**Total**: 30 core dependencies + 8 dev dependencies

---

## 🔗 Integration Map

```
Frontend                           Backend                          External
──────────────────────────────────────────────────────────────────────────────
React Components ────────────────► Express Routes ───────────────► Databases
  │                                  │                             (MongoDB)
  ├─ FileUpload ───────Multer───► File Storage ─────GridFS─────► MongoDB
  ├─ Summary Form ──────Axios───► Gemini Service ──Google Gem───► Gemini API
  ├─ Flashcards ─────React Query─ HF Service ──── HuggingFace ─► HF API
  ├─ Quiz ─────────────────────► OpenAI Service ────OpenAI────► OpenAI API
  ├─ Q&A ──────────────────────► LangChain ────────────────────► AI APIs
  ├─ Auth ────────Passport.js──► OAuth Routes ──── OAuth ───────► Google
  │                              │                               ► GitHub
  └─ Dashboard ────React Router─► Dashboard Route ───────────────► User Data
                                  │
                                  ├─ Session Store ──connect-mongo► MongoDB
                                  ├─ Security ────────Helmet/CORS
                                  └─ Validation ───────Zod
```

---

## 📈 Usage Statistics

| Category | Count | Examples |
|----------|-------|----------|
| **Programming Languages** | 2 | TypeScript, JavaScript |
| **Frontend Frameworks** | 1 | React 18 |
| **Backend Frameworks** | 1 | Express |
| **Build Tools** | 2 | Vite, TypeScript Compiler |
| **Testing Frameworks** | 2 | Jest, Vitest |
| **UI Libraries** | 3 | Tailwind, Lucide Icons, clsx |
| **State Management** | 2 | React Context, React Query |
| **Authentication Strategies** | 3 | Local, Google OAuth, GitHub OAuth |
| **AI Model Providers** | 3 | Gemini, HuggingFace, OpenAI |
| **Document Formats Supported** | 3 | PDF, DOCX, TXT |
| **Database Technologies** | 2 | MongoDB, GridFS |
| **API Security Methods** | 2 | JWT, Session Cookies |
| **Validation Libraries** | 1 | Zod |
| **HTTP Methods** | 1 | Axios |
| **Job Scheduling** | 1 | Agenda |
| **Payment Systems** | 1 | Stripe |
| **External APIs** | 3+ | Google, GitHub, Stripe |

---

## 💾 File Structure Insights

```
/apps/backend/src/
├── index.ts                  # Entry point (Express setup)
├── services/
│   ├── gemini.ts            # Gemini API client (multi-key)
│   ├── geminiSummarizer.ts  # Chunked summarization
│   ├── hf.ts                # HuggingFace + Gemini fallback
│   └── ml.ts                # ML utilities
├── routes/
│   ├── analyze.ts           # Document analysis orchestration
│   ├── ml.ts                # ML endpoints (summary, quiz, flashcards, QA)
│   ├── auth.ts              # Authentication routes
│   ├── user.ts              # User profile
│   ├── dashboard.ts         # Dashboard data
│   ├── billing.ts           # Stripe integration
│   └── ...
├── middleware/
│   └── auth.ts              # Auth middleware
├── models/
│   ├── User.ts              # User schema
│   └── UsageEvent.ts        # Analytics schema
└── config/
    ├── database.ts          # MongoDB connection
    └── passport.ts          # Passport strategies

/apps/frontend/src/
├── main.tsx                 # Entry point
├── App.tsx                  # Root component
├── pages/
│   ├── Dashboard.tsx
│   ├── DocumentAnalyzerPage.tsx
│   ├── LandingPage.tsx
│   └── ...
├── components/
│   ├── FileUploadSummary.tsx    # Dual input UI
│   ├── FlashcardsView.tsx
│   ├── QuizRunner.tsx
│   └── ...
├── hooks/
│   ├── usePageMeta.tsx
│   └── useUsageLimits.tsx
├── contexts/
│   └── AuthContext.tsx
└── services/
    └── ml.ts                # API client
```

---

## 🔐 Security Features

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Network** | CORS, Helmet | Prevent cross-origin attacks, set security headers |
| **Authentication** | Passport.js | OAuth 2.0 + Local strategy |
| **Passwords** | bcryptjs | Secure hashing with salt |
| **Sessions** | express-session + connect-mongo | Secure session management |
| **Tokens** | JWT | Token-based auth for APIs |
| **Data Validation** | Zod | Runtime type validation |
| **File Upload** | Multer | Secure file handling |
| **Environment** | dotenv | Secure config management |

---

## 🚀 Performance Optimizations

| Optimization | Technology | Benefit |
|---|---|---|
| **Fast Dev Server** | Vite | Hot module reload (HMR) |
| **Code Splitting** | Vite | Lazy loading routes |
| **Caching** | React Query | Avoid redundant API calls |
| **Type Checking** | TypeScript | Catch errors at compile time |
| **Chunked Processing** | LangChain | Handle large documents |
| **API Retry Logic** | Gemini Service | Automatic failover on errors |
| **Session Caching** | connect-mongo | Reduced database queries |
| **Icon Optimization** | Lucide React | Tree-shakeable icons |

---

## 📚 Key Design Patterns

| Pattern | Implementation | Location |
|---------|---|---|
| **MVC** | Models (Mongoose) + Views (React) + Controllers (Routes) | Backend + Frontend |
| **Service Layer** | Business logic separation | `src/services/` |
| **Middleware Chain** | Auth, CORS, Helmet | Express middleware |
| **Repository Pattern** | Mongoose models | `src/models/` |
| **Context API** | Global state | React contexts |
| **Custom Hooks** | Reusable logic | `src/hooks/` |
| **Protected Routes** | Route guards | React Router |
| **Factory Pattern** | Model/service creation | Throughout codebase |
| **Observer Pattern** | React Query subscriptions | Frontend state |
| **Strategy Pattern** | Auth strategies | Passport.js |

---

## 🧪 Testing Coverage

| Type | Framework | Usage |
|------|-----------|-------|
| **Unit Tests** | Jest (Backend), Vitest (Frontend) | Individual functions |
| **Component Tests** | React Testing Library | UI components |
| **Integration Tests** | Supertest | API endpoints |
| **E2E Tests** | (Not configured) | Full user flows |
| **Type Tests** | TypeScript compiler | Type safety |

---

## 🎓 Technology Learning Path

To understand Learnova fully, learn in this order:

1. **Basics**: JavaScript, Node.js, Express fundamentals
2. **Frontend**: React hooks, React Router, Tailwind CSS
3. **Type Safety**: TypeScript, Zod validation
4. **State Management**: React Context, React Query
5. **Backend**: Mongoose, Passport.js, middleware
6. **AI Integration**: LangChain, Gemini API, HuggingFace
7. **Document Processing**: PDF parsing, OCR
8. **DevOps**: Docker, deployment, environment config
9. **Testing**: Jest, Vitest, React Testing Library

---

## 🔄 Architecture Decision Record

### Why These Technologies?

| Decision | Reasoning |
|----------|-----------|
| **React + Vite** | Fast, modern, great DX, large ecosystem |
| **TypeScript** | Catches bugs early, excellent IDE support |
| **MongoDB** | Flexible schema for evolving features, GridFS for files |
| **Express** | Lightweight, flexible, large middleware ecosystem |
| **Google Gemini** | State-of-the-art multimodal AI, cost-effective |
| **Passport.js** | Industry standard, supports multiple strategies |
| **Tailwind CSS** | Rapid UI development, highly customizable |
| **LangChain** | Abstract away LLM complexity, structured outputs |
| **React Query** | Better than Redux for async state, automatic caching |
| **Stripe** | Industry standard payment processor |
| **Agenda** | Job queue in MongoDB, no external dependencies |

---

## 📝 Documentation Structure

```
📁 learnova/
├─ README.md                  # Project overview
├─ TECH_STACK.md              # Detailed tech reference
├─ TECH_STACK_QUICK.md        # Quick visual reference ← START HERE
├─ ARCHITECTURE.md            # System design & flows
├─ .env.example               # Environment config
└─ apps/
   ├─ backend/package.json    # Backend dependencies
   └─ frontend/package.json   # Frontend dependencies
```

---

## ✅ Quick Verification

Check your setup is complete:

```bash
# Frontend
npm run dev:frontend          # Should start on :5174
npm run lint                  # Should pass linting

# Backend  
npm run dev:backend          # Should start on :3001
npm run build                # Should compile TS → JS
npm test                     # Should run Jest tests

# Full Stack
npm run dev                  # Should start both servers
```

---

## 🎯 Next Steps

1. **Review Documentation**
   - Read `TECH_STACK_QUICK.md` first (2 min)
   - Then `TECH_STACK.md` for details (10 min)
   - Study `ARCHITECTURE.md` for system design (15 min)

2. **Explore Code**
   - Start with `apps/frontend/src/App.tsx`
   - Understand routing in `pages/`
   - Check API integration in `services/ml.ts`

3. **Understand Flows**
   - Trace document upload → AI processing
   - Follow authentication → dashboard flow
   - Review error handling in services

4. **Build Features**
   - Use existing patterns as templates
   - Keep TypeScript strict mode enabled
   - Write tests for new functionality

---

## 📞 Technology Support Resources

| Technology | Resource |
|-----------|----------|
| React | https://react.dev |
| TypeScript | https://www.typescriptlang.org |
| Express | https://expressjs.com |
| MongoDB | https://www.mongodb.com/docs |
| Tailwind | https://tailwindcss.com/docs |
| Google Gemini | https://ai.google.dev |
| LangChain | https://python.langchain.com |
| Passport.js | http://www.passportjs.org |

---

## 🎓 Key Takeaway

**Learnova uses a modern, type-safe, scalable architecture combining:**
- **Frontend**: React + TypeScript + Vite (fast, responsive UI)
- **Backend**: Node.js + Express + TypeScript (robust API)
- **Database**: MongoDB + GridFS (flexible, file storage)
- **AI**: Google Gemini + HuggingFace + OpenAI (best-in-class models)
- **Auth**: Passport.js with OAuth 2.0 (industry standard)
- **Payments**: Stripe (secure transactions)
- **DevOps**: Docker-ready, CI/CD compatible

This combination ensures **production-ready quality** with **excellent developer experience**.

---

*Generated: November 18, 2025*
*For complete details, see TECH_STACK.md and ARCHITECTURE.md*
