# Learnova Architecture & Data Flow

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Port 5174)                 │
│  React 18 + TypeScript + Vite + Tailwind CSS + React Query │
│                                                              │
│  ┌──────────────┬──────────────┬──────────────┐            │
│  │ Components   │ Pages        │ Contexts     │            │
│  │ - Form UI    │ - Dashboard  │ - AuthCtx    │            │
│  │ - FileUpload │ - Profile    │ - UserData   │            │
│  │ - QuizView   │ - LandingPg  │              │            │
│  └──────────────┴──────────────┴──────────────┘            │
│                      ↓                                       │
│              React Router v6                                │
│              Protected Routes                               │
│                      ↓                                       │
│              React Query (State)                            │
│                      ↓                                       │
│              Axios HTTP Client                              │
└─────────────────────────────────────────────────────────────┘
                         │
                    /api proxy
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                     Backend (Port 3001)                     │
│        Node.js + Express + TypeScript                       │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           Express Routes                            │   │
│  │  ├── /auth    → Passport.js (Local, OAuth)        │   │
│  │  ├── /api/analyze    → Document processing        │   │
│  │  ├── /api/ml/summarize → Gemini/HF               │   │
│  │  ├── /api/ml/flashcards → LangChain             │   │
│  │  ├── /api/ml/quiz → Quiz generation             │   │
│  │  ├── /api/ml/qa → Q&A system                     │   │
│  │  ├── /api/billing → Stripe integration           │   │
│  │  └── /api/user → User profile                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                      ↓                                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           Middleware & Services                      │   │
│  │  ├── Auth Middleware → JWT/Session validation      │   │
│  │  ├── CORS & Helmet → Security headers             │   │
│  │  ├── Multer → File upload handling                │   │
│  │  ├── Agenda → Background job queue                │   │
│  │  └── Document Processors                          │   │
│  │      ├── pdf-parse (PDF extraction)              │   │
│  │      ├── mammoth (DOCX extraction)               │   │
│  │      └── Tesseract.js (OCR)                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                      ↓                                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           AI Service Layer                          │   │
│  │  ┌─────────────────────────────────────────────┐  │   │
│  │  │ Gemini Service (Primary)                    │  │   │
│  │  │ - Multi-key rotation                        │  │   │
│  │  │ - Exponential backoff retry                │  │   │
│  │  │ - Chunked processing (geminiSummarizer)    │  │   │
│  │  │ - Models: gemini-2.5-flash/pro             │  │   │
│  │  └─────────────────────────────────────────────┘  │   │
│  │  ┌─────────────────────────────────────────────┐  │   │
│  │  │ HuggingFace Service (Fallback)              │  │   │
│  │  │ - Meta-llama/Llama-2-70b-hf                │  │   │
│  │  │ - Used when Gemini unavailable             │  │   │
│  │  └─────────────────────────────────────────────┘  │   │
│  │  ┌─────────────────────────────────────────────┐  │   │
│  │  │ OpenAI Service (Alternative)                │  │   │
│  │  │ - gpt-3.5-turbo configurable                │  │   │
│  │  └─────────────────────────────────────────────┘  │   │
│  │  ┌─────────────────────────────────────────────┐  │   │
│  │  │ LangChain Integration                       │  │   │
│  │  │ - Document splitting & chunking            │  │   │
│  │  │ - Prompt templates                         │  │   │
│  │  │ - Structured output parsing                │  │   │
│  │  └─────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
│                      ↓                                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           Data Access Layer                         │   │
│  │  Mongoose ODM (MongoDB object modeling)            │   │
│  │  ├── User Model (auth, profile, preferences)      │   │
│  │  ├── UsageEvent Model (analytics, tracking)       │   │
│  │  ├── Session Store (via connect-mongo)            │   │
│  │  └── Document Metadata                            │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                      Data & Storage                         │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  MongoDB (Primary Database)                        │   │
│  │  ├── User Documents                               │   │
│  │  ├── Sessions                                     │   │
│  │  ├── Usage Analytics                              │   │
│  │  ├── Preferences & Settings                       │   │
│  │  └── GridFS (File Storage)                        │   │
│  │      ├── Uploaded PDFs                            │   │
│  │      ├── DOCX Files                               │   │
│  │      └── Processed Documents                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## User Authentication Flow

```
┌─────────────────────────────────────────┐
│  User Opens App                         │
└──────────────────┬──────────────────────┘
                   ↓
        ┌──────────────────────┐
        │ Check Auth State     │
        │ (React Context)      │
        └──────────┬───────────┘
                   ↓
        ┌──────────────────────────────┐
        │ Need to Login?               │
        └──────────┬──────────┬────────┘
                   ↓          ↓
            ┌──────────┐ ┌──────────────┐
            │ OAuth    │ │ Email/Pass   │
            │ (G/GH)   │ │ (Local)      │
            └────┬─────┘ └──────┬───────┘
                 ↓              ↓
         ┌─────────────────────────────┐
         │ Passport.js Strategy        │
         │ passport-google-oauth20     │
         │ passport-github2            │
         │ passport-local              │
         └────────────┬────────────────┘
                      ↓
         ┌──────────────────────────────┐
         │ Verify/Hash Credentials      │
         │ (bcryptjs for local)         │
         └────────────┬─────────────────┘
                      ↓
         ┌──────────────────────────────┐
         │ Create Session/Token         │
         │ (JWT + express-session)      │
         └────────────┬─────────────────┘
                      ↓
         ┌──────────────────────────────┐
         │ Store in MongoDB             │
         │ (connect-mongo session store)│
         └────────────┬─────────────────┘
                      ↓
         ┌──────────────────────────────┐
         │ Update React Context         │
         │ Set User State               │
         └────────────┬─────────────────┘
                      ↓
         ┌──────────────────────────────┐
         │ Redirect to Dashboard        │
         │ (React Router Protected)     │
         └──────────────────────────────┘
```

---

## Document Processing Pipeline

```
User uploads Document or Pastes Text
             │
             ↓
┌────────────────────────────────┐
│ Multer Middleware              │
│ - Validate file type           │
│ - Store in GridFS              │
│ - Generate metadata            │
└────────────┬───────────────────┘
             ↓
┌────────────────────────────────┐
│ Document Type Detection        │
├─────────┬──────────┬──────────┐│
│   PDF   │   DOCX   │   Text   ││
└─────────┴──────────┴──────────┘│
             ↓
     ┌───────┴───────┬─────────┐
     ↓               ↓         ↓
 ┌────────┐   ┌──────────┐ ┌──────┐
 │pdf-    │   │mammoth   │ │Text  │
 │parse   │   │(DOCX)    │ │Paste │
 └────┬───┘   └─────┬────┘ └──┬───┘
      └──────────────┴─────────┘
             ↓
┌────────────────────────────────┐
│ Text Extraction Complete       │
│ Clean & Normalize              │
└────────────┬───────────────────┘
             ↓
┌────────────────────────────────┐
│ Agenda Job Queue               │
│ - Schedule background job      │
│ - Store job metadata           │
└────────────┬───────────────────┘
             ↓
┌────────────────────────────────┐
│ User Selects Analysis Tasks    │
│ ☑ Summarize                    │
│ ☑ Flashcards                   │
│ ☑ Quiz                         │
│ ☑ Q&A                          │
└────────────┬───────────────────┘
             ↓
   ┌─────────┴─────────┐
   ↓ (Per Task)        ↓
 Process via AI Services
```

---

## AI Processing Pipeline

```
Input: Document Text + Task Type
             │
             ↓
┌──────────────────────────────────────┐
│ Check Gemini Configuration           │
│ process.env.GEMINI_API_KEYS || KEY   │
└──────────┬──────────────────┬────────┘
           │ Configured       │ Not Configured
           ↓                  ↓
    ┌─────────────┐   ┌──────────────────┐
    │ Gemini Path │   │ HuggingFace Path │
    └─────┬───────┘   └────────┬─────────┘
          ↓                     ↓
  ┌──────────────────┐  ┌─────────────────┐
  │ LangChain        │  │ HF Inference    │
  │ - Chunk text     │  │ - Format prompt │
  │ - Create prompts │  │ - Call API      │
  │ - Parse output   │  │ - Parse results │
  └────────┬─────────┘  └────────┬────────┘
           ↓                     ↓
  ┌──────────────────────────────────────┐
  │ Gemini 2.5-flash/pro API             │
  │ - Multi-key rotation                 │
  │ - Exponential backoff retry (3x)     │
  │ - Timeout: 1000-2000ms base delay    │
  └──────────┬──────────────────┬────────┘
             │ Success          │ Failure
             ↓                  ↓
    ┌──────────────┐    ┌──────────────┐
    │ Parse Output │    │ Retry with   │
    │ - JSON if    │    │ next key or  │
    │ - Structured │    │ HF fallback  │
    │ - Validate   │    │              │
    └────────┬─────┘    └──────┬───────┘
             └────────┬────────┘
                      ↓
         ┌────────────────────────────┐
         │ Format Response            │
         │ - Summaries (word count)   │
         │ - Flashcards (Term/Def)   │
         │ - Quizzes (Q&A format)     │
         │ - QA (context + answer)    │
         └────────────┬───────────────┘
                      ↓
         ┌────────────────────────────┐
         │ Store in MongoDB           │
         │ Update Usage Stats         │
         └────────────┬───────────────┘
                      ↓
         ┌────────────────────────────┐
         │ Return to Frontend         │
         │ via HTTP Response          │
         └────────────────────────────┘
```

---

## Data Models (Mongoose)

```
User
├── _id (ObjectId)
├── email (String, unique)
├── passwordHash (String, optional)
├── name (String)
├── role (String: 'free' | 'pro' | 'admin')
├── streakDays (Number)
├── lastActiveDate (Date)
├── createdAt (Date)
├── oauthProviders
│   ├── google { id, email }
│   └── github { id, login }
└── preferences
    ├── theme (String)
    └── notifications (Boolean)

UsageEvent
├── _id (ObjectId)
├── userId (ObjectId → User)
├── feature (String: 'summary' | 'flashcard' | 'quiz' | 'qa')
├── tokensUsed (Number)
├── createdAt (Date)
└── metadata
    └── documentId (optional)
```

---

## State Management Flow

```
Redux-like but using React Context + React Query

┌──────────────────────────────┐
│ Global Auth State            │
│ (React Context)              │
├──────────────────────────────┤
│ - currentUser                │
│ - isAuthenticated            │
│ - loading                    │
│ - error                      │
└──────────────┬───────────────┘
               ↓
       ┌───────────────┐
       │ React Query   │
       │ Cache Layer   │
       ├───────────────┤
       │ - User data   │
       │ - Dashboard   │
       │ - Documents   │
       │ - Usage stats │
       └───────────────┘
               ↓
       ┌───────────────┐
       │ Component     │
       │ Local State   │
       │ (useState)    │
       └───────────────┘
```

---

## Testing Architecture

```
Frontend Tests
├── Unit Tests (Vitest)
│   ├── Component tests (React Testing Library)
│   ├── Hook tests
│   └── Utility tests
├── Integration Tests
│   └── Page-level tests
└── Setup (jsdom environment)

Backend Tests
├── Unit Tests (Jest)
│   ├── Service layer tests
│   ├── Utility tests
│   └── Model tests
├── Integration Tests (Supertest)
│   ├── Route tests
│   ├── Auth middleware tests
│   └── API endpoint tests
└── Setup (Node environment)
```

---

## Development Environment

```
Local Machine
├── Node.js v18+
├── npm/yarn
├── MongoDB (local or cloud)
└── Environment Variables (.env)
    ├── MONGO_URI
    ├── SESSION_SECRET
    ├── GEMINI_API_KEYS
    ├── STRIPE_SECRET_KEY
    ├── OAUTH credentials
    └── ... other config

Dev Servers
├── Frontend: http://localhost:5174
│   └── Vite dev server (hot reload)
├── Backend: http://localhost:3001
│   └── tsx watch (hot reload)
└── Proxy: /api → localhost:3001
```

---

## Deployment Flow

```
Code → Git Commit → Push to Beta/Main
            ↓
    GitHub Actions (CI/CD)
            ↓
    ┌───────┴────────┐
    ↓                ↓
Frontend Build    Backend Build
├── tsc            ├── tsc
├── vite build     ├── npm install
└── Output: dist   └── Output: dist
    ↓                  ↓
    Test               Test
    ↓                  ↓
Deploy to           Deploy to
Production          Production
    ↓                  ↓
Vercel/Netlify      Heroku/Railway/
                    DigitalOcean
```

This architecture ensures scalability, maintainability, and type safety across the entire application.
