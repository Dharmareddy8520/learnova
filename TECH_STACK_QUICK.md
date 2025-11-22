# Technologies Quick Reference

## 🎯 At a Glance

### Languages
- **TypeScript** (Primary)
- **JavaScript** (Config)
- **Python** (CLI/ML tools)

### Frontend
```
React 18 → Vite → Tailwind CSS
     ↓        ↓
  TypeScript  SPA Routing
     ↓
React Query (State)
     ↓
Axios (HTTP)
```

### Backend
```
Node.js → Express → MongoDB
   ↓        ↓
TypeScript  Session
   ↓        ↓
Passport  Agenda
   ↓
AI Services: Gemini, HuggingFace, OpenAI
```

---

## 📋 By Category

### Framework & Build Tools
- React 18
- Vite
- Express
- Node.js

### Language & Types
- TypeScript
- Zod (validation)

### UI & Styling
- Tailwind CSS
- Lucide React Icons
- clsx

### State & Data
- React Query
- Axios
- Mongoose

### AI & ML
- Google Gemini API
- Hugging Face Inference
- OpenAI API
- LangChain
- Tesseract.js (OCR)

### Document Processing
- pdf-parse
- pdfjs-dist
- mammoth

### Authentication
- Passport.js
- Google OAuth 2.0
- GitHub OAuth 2.0
- bcryptjs
- JWT

### Database & Storage
- MongoDB
- GridFS
- connect-mongo

### Utilities
- dotenv
- uuid
- fs-extra
- cookie-parser
- cors
- helmet

### Testing
- Jest (Backend)
- Vitest (Frontend)
- Testing Library
- Supertest

### Development Tools
- tsx
- ESLint
- TypeScript compiler
- PostCSS

### Payment
- Stripe

### Job Processing
- Agenda

### Frontend Routing
- React Router v6

---

## 📊 Dependency Breakdown

**Backend**: 30+ direct dependencies
- 5 AI/ML services
- 3 Auth strategies
- 5 Document processing
- 8 Security & middleware
- 4 Database & storage
- 5+ Utilities

**Frontend**: 8 direct dependencies
- 1 HTTP client (Axios)
- 1 State manager (React Query)
- 1 Router (React Router)
- 1 Icon library (Lucide)
- 1 CSS framework (Tailwind)

---

## 🔌 External APIs

1. **Google Gemini** - Primary AI model
2. **Hugging Face** - Fallback AI model
3. **OpenAI** - Alternative AI model
4. **Google OAuth** - Authentication
5. **GitHub OAuth** - Authentication
6. **Stripe** - Payments

---

## ✅ Check It Out

Run this to verify your setup:
```bash
# Frontend
npm run dev         # Start Vite on :5174

# Backend
npm run dev         # Start Express on :3001

# Test
npm test            # Run all tests
```

All detailed info is in `TECH_STACK.md` 📖
