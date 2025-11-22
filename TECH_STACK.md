# Learnova - Complete Technology Stack

## Overview
Learnova is a full-stack AI-powered personal knowledge companion application built with modern web technologies. The project uses a monorepo architecture with separate frontend and backend applications.

---

## 🎯 Programming Languages

| Language | Purpose | Version |
|----------|---------|---------|
| **TypeScript** | Type-safe programming language for both frontend and backend | 5.2.2 (Frontend), 5.3.3 (Backend) |
| **JavaScript** | Configuration files, utilities | ES2020+ |
| **Python** | (Implied) ML/CLI tools | - |

---

## 🏗️ Core Technologies

### Frontend Stack
- **React** (v18.2.0) - UI library for building interactive user interfaces
- **Vite** (v5.0.8) - Lightning-fast build tool and dev server
- **TypeScript** (v5.2.2) - Type-safe JavaScript
- **Tailwind CSS** (v3.4.18) - Utility-first CSS framework for styling
- **React Router** (v6.20.1) - Client-side routing and navigation
- **React Query** (v5.8.4) - Server state management and data fetching

### Backend Stack
- **Node.js** (v18+) - JavaScript runtime
- **Express** (v4.18.2) - Web application framework
- **TypeScript** (v5.3.3) - Type-safe server code
- **MongoDB** (via Mongoose) - NoSQL database
- **Passport.js** (v0.7.0) - Authentication middleware
- **Agenda** (v5.0.0) - Background job scheduler

### Database
- **MongoDB** (via Mongoose v8.0.3) - Primary database for storing user data
- **GridFS** - File storage within MongoDB (implied from file upload features)

---

## 📦 Key Libraries & Dependencies

### Backend Dependencies

#### AI/ML Libraries
- **@google/generative-ai** (v0.24.1) - Google Gemini API client
- **@google-ai/generativelanguage** (v3.5.0) - Google's language model services
- **@huggingface/inference** (v4.12.0) - Hugging Face model inference API
- **langchain** (v1.0.1) - LLM orchestration and RAG framework
- **openai** (v4.20.1) - OpenAI API client
- **tesseract.js** (v6.0.1) - OCR (Optical Character Recognition)

#### Document Processing
- **pdf-parse** (v2.4.5) - Parse and extract text from PDF files
- **pdfjs-dist** (v5.4.394) - PDF rendering and text extraction
- **mammoth** (v1.11.0) - DOCX file parsing and conversion

#### Authentication & Security
- **passport** (v0.7.0) - Authentication middleware
- **passport-local** (v1.0.0) - Local username/password strategy
- **passport-google-oauth20** (v2.0.0) - Google OAuth 2.0 strategy
- **passport-github2** (v0.1.12) - GitHub OAuth 2.0 strategy
- **bcryptjs** (v2.4.3) - Password hashing library
- **jsonwebtoken** (v9.0.2) - JWT creation and verification
- **helmet** (v7.1.0) - HTTP headers security middleware

#### HTTP & Session Management
- **express-session** (v1.17.3) - Session middleware for Express
- **connect-mongo** (v5.1.0) - MongoDB session store
- **cors** (v2.8.5) - Cross-Origin Resource Sharing middleware
- **cookie-parser** (v1.4.7) - Cookie parsing middleware

#### Payment Processing
- **stripe** (v14.7.0) - Stripe payment processing API

#### Database & ODM
- **mongoose** (v8.0.3) - MongoDB object data modeling

#### File Upload & Handling
- **multer** (v1.4.5-lts.1) - Middleware for handling file uploads
- **fs-extra** (v11.3.2) - Extended file system utilities

#### Utilities
- **dotenv** (v16.3.1) - Environment variable management
- **uuid** (v13.0.0) - UUID generation
- **zod** (v3.22.4) - Runtime data validation library

#### Development Tools (Backend)
- **tsx** (v4.6.2) - TypeScript execution for Node.js
- **jest** (v29.7.0) - Testing framework
- **ts-jest** (v29.1.1) - Jest TypeScript preprocessor
- **supertest** (v6.3.3) - HTTP assertion library for testing
- **@types/** packages - TypeScript type definitions for various libraries

### Frontend Dependencies

#### UI & Styling
- **lucide-react** (v0.294.0) - Icon library with React components
- **clsx** (v2.0.0) - Utility for constructing className strings
- **tailwind-merge** (v2.0.0) - Merge Tailwind CSS classes intelligently

#### Data Fetching & State Management
- **axios** (v1.6.2) - HTTP client for API requests
- **@tanstack/react-query** (v5.8.4) - Server state management

#### Routing
- **react-router-dom** (v6.20.1) - Declarative routing for React SPA

#### Development Tools (Frontend)
- **vite** (v5.0.8) - Build tool and dev server
- **@vitejs/plugin-react** (v4.2.1) - React Fast Refresh plugin for Vite
- **tailwindcss** (v3.4.18) - CSS framework
- **autoprefixer** (v10.4.21) - PostCSS plugin for vendor prefixes
- **postcss** (v8.5.6) - CSS transformations

#### Testing (Frontend)
- **vitest** (v1.0.4) - Unit testing framework
- **@testing-library/react** (v14.1.2) - React component testing utilities
- **@testing-library/jest-dom** (v6.1.5) - Jest DOM matchers
- **@testing-library/user-event** (v14.5.1) - User interaction simulation
- **jsdom** (v23.0.1) - JavaScript implementation of web standards

#### Code Quality
- **eslint** (v8.55.0) - JavaScript linter
- **@typescript-eslint/eslint-plugin** (v6.14.0) - TypeScript ESLint rules
- **@typescript-eslint/parser** (v6.14.0) - TypeScript parser for ESLint

---

## 🔧 Development Tools & Build Systems

| Tool | Purpose | Version |
|------|---------|---------|
| **TypeScript** | Static type checking | 5.2.2 - 5.3.3 |
| **Vite** | Frontend build tool & dev server | 5.0.8 |
| **Jest** | Backend unit testing | 29.7.0 |
| **Vitest** | Frontend unit testing | 1.0.4 |
| **ESLint** | Code linting | 8.55.0 |
| **tsx** | TypeScript execution | 4.6.2 |
| **Tailwind CSS** | CSS framework | 3.4.18 |
| **PostCSS** | CSS transformations | 8.5.6 |

---

## 🔐 API Services & External Integrations

### AI/ML Services
1. **Google Gemini API** (`@google/generative-ai`)
   - Multi-key support with automatic key rotation
   - Used for: Summarization, quiz generation, flashcard creation, Q&A
   - Model: `gemini-2.5-flash` (configurable)

2. **Hugging Face Inference API** (`@huggingface/inference`)
   - Fallback LLM service
   - Used when Gemini is unavailable

3. **OpenAI API** (`openai`)
   - Alternative/legacy AI model access
   - Can be configured in environment

4. **Tesseract.js**
   - Client-side OCR for scanned documents
   - Text extraction from images

### Authentication Services
- **Google OAuth 2.0** - Sign in with Google
- **GitHub OAuth 2.0** - Sign in with GitHub

### Payment Services
- **Stripe** (v14.7.0)
  - Premium feature payments
  - Webhook integration for billing events

---

## 📊 Architecture Patterns

### Frontend
- **Component-based architecture** - Reusable React components
- **Context API** - Global state management (AuthContext)
- **Custom Hooks** - Reusable logic (usePageMeta, useUsageLimits)
- **React Router** - SPA routing with protected routes
- **React Query** - Server state management and caching

### Backend
- **REST API** - Standard HTTP endpoints
- **Route-based organization** - Separate route files by feature
- **Middleware pattern** - Express middleware for cross-cutting concerns
- **Service layer** - Business logic separation (gemini.ts, hf.ts)
- **Model-based data layer** - Mongoose ODM for MongoDB
- **Job queue** - Agenda for background processing

---

## 🗄️ Data Storage

### Primary Database
- **MongoDB** - NoSQL database for:
  - User accounts and authentication
  - Document metadata
  - Usage analytics
  - Session storage (via connect-mongo)
  - Streak tracking and progress data

### File Storage
- **GridFS** - MongoDB's file storage system for:
  - Uploaded PDFs and DOCX files
  - User documents

---

## 📝 Configuration Files

| File | Purpose |
|------|---------|
| `tsconfig.json` | TypeScript compiler configuration |
| `vite.config.ts` | Vite build and dev server configuration |
| `jest.config.js` | Jest testing framework configuration |
| `tailwind.config.js` | Tailwind CSS customization |
| `postcss.config.cjs` | PostCSS plugin configuration |
| `.env` | Environment variables (credentials, API keys) |
| `package.json` | Project dependencies and scripts |

---

## 🎯 Key Features Built With These Technologies

| Feature | Technologies Used |
|---------|-------------------|
| **Document Upload** | Multer, PDF-parse, Mammoth, GridFS |
| **Text Summarization** | Google Gemini, Hugging Face, LangChain |
| **Flashcard Generation** | Google Gemini, LangChain, Zod validation |
| **Quiz Generation** | Google Gemini, OpenAI fallback |
| **Q&A System** | Google Gemini, LangChain |
| **OCR Support** | Tesseract.js |
| **User Authentication** | Passport.js, OAuth 2.0, JWT, bcryptjs |
| **Session Management** | Express-session, MongoDB |
| **Real-time Updates** | React Query, Axios |
| **Payment Processing** | Stripe |
| **Background Jobs** | Agenda, MongoDB |
| **UI Components** | React, Tailwind CSS, Lucide Icons |
| **Type Safety** | TypeScript, Zod |

---

## 🚀 Development Workflow

### Commands
```bash
# Frontend
npm run dev:frontend      # Start dev server on :5174
npm run build            # Build for production
npm run lint             # Run ESLint

# Backend
npm run dev:backend      # Start with hot reload via tsx
npm run build            # Compile TypeScript
npm run test             # Run Jest tests
npm run test:watch      # Watch mode testing

# Both
npm run dev              # Start both frontend and backend
npm test                 # Run all tests
```

### Development Servers
- **Frontend**: Vite dev server on `http://localhost:5174`
- **Backend**: Express on `http://localhost:3001`
- **Frontend proxies API calls to backend** via Vite proxy

---

## 📦 Project Statistics

| Category | Count |
|----------|-------|
| **Total Dependencies** | 50+ |
| **Backend Dependencies** | 30+ |
| **Frontend Dependencies** | 8+ |
| **Dev Dependencies** | 20+ |
| **Source Files** | 20+ TypeScript/React files |
| **Supported Auth Methods** | 3 (Local, Google, GitHub) |
| **AI Model Providers** | 2 (Gemini, Hugging Face) |

---

## 🔄 Technology Flow

```
User Request
    ↓
Vite Dev Server (5174)
    ↓
React Components + TypeScript
    ↓
Axios HTTP Request
    ↓
Express Server (3001)
    ↓
Route Handler
    ↓
Service Layer (Gemini/HuggingFace/OpenAI)
    ↓
Mongoose Models
    ↓
MongoDB
    ↓
Response back to Frontend
    ↓
React Query + Component Update
    ↓
Tailwind CSS Styled UI
```

---

## 📚 Notable Libraries by Function

### Document Processing Pipeline
1. **File Upload**: Multer → File storage in GridFS
2. **PDF Extraction**: pdf-parse → Text extraction
3. **DOCX Extraction**: mammoth → Text extraction
4. **OCR**: Tesseract.js → Text from images

### AI Processing Pipeline
1. **Text Input**: User pastes or uploads document
2. **Chunking**: LangChain document splitter
3. **Processing**: Google Gemini (primary) or Hugging Face (fallback)
4. **Output**: Summaries, flashcards, quizzes, Q&A responses

### Authentication Flow
1. **Local Auth**: Passport-local + bcryptjs
2. **OAuth**: Passport-google-oauth20 + Passport-github2
3. **Session**: Express-session + connect-mongo
4. **JWT**: jsonwebtoken for API tokens

### Data Validation
- **Zod** - Runtime validation of API payloads
- **TypeScript** - Compile-time type safety

---

This comprehensive stack enables Learnova to deliver a full-featured, type-safe, scalable AI-powered learning platform with modern development practices and robust security measures.
