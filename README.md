# Learnova - AI Personal Knowledge Companion

Learnova is a comprehensive AI-powered learning platform that transforms documents, text, and conversations into interactive study materials. Powered by Google Gemini AI, Learnova helps students and professionals learn more effectively through intelligent summaries, interactive quizzes, dynamic flashcards, and conversational Q&A.

## 🌟 Features

### Core AI Features
- **📄 Document Analysis**: Upload PDF and DOCX files for AI-powered processing (up to 10MB)
- **✨ Instant Summaries**: Get comprehensive summaries with key points and main ideas
- **🎯 Smart Quizzes**: Auto-generate multiple-choice quizzes with configurable difficulty
- **🎴 Interactive Flashcards**: Create flashcards with 3D flip animations and mastery tracking
- **💬 AI Q&A**: Ask contextual questions and get intelligent answers about your content
- **🤖 ML Tools**: Access text classification, sentiment analysis, and named entity recognition

### Learning Experience
- **📚 Save & Organize**: Save all generated content (summaries, quizzes, flashcards, Q&A) to your library
- **🔍 Search & Filter**: Full-text search and filter by content type
- **📊 Progress Tracking**: Monitor your learning streak and track completed content
- **📥 Download Options**: Export content as TXT or JSON files
- **🎨 Interactive UI**: Beautiful animations, 3D effects, and responsive design
- **📱 Mobile Responsive**: Optimized experience across all devices

### User Management
- **🔐 Secure Authentication**: Email/password with express-session
- **👤 User Profiles**: Personal settings and preferences
- **📈 Usage Limits**: Free tier with 50 requests/day, premium tier with 500 requests/day
- **🔥 Streak Tracking**: Consecutive days tracking to maintain learning momentum

## 🚀 Tech Stack

### Frontend
- **React 18** with TypeScript for type safety
- **Vite** for lightning-fast builds and HMR
- **Tailwind CSS** for modern, responsive styling
- **React Router v6** for client-side routing
- **Lucide React** for beautiful icons
- **CSS Animations** with 3D transforms and keyframes

### Backend
- **Node.js** + **Express** with TypeScript
- **MongoDB** with Mongoose ODM
- **GridFS** for efficient file storage
- **Passport.js** for authentication middleware
- **express-session** with MongoDB session store
- **Google Gemini 2.5 Flash** (1M token context window)
- **Hugging Face Transformers** for ML tools

### Database Models
- **User**: Authentication, preferences, streak tracking
- **SavedContent**: Summaries, quizzes, flashcards, Q&A storage
- **UsageEvent**: Request tracking and rate limiting

## 📦 Installation

### Prerequisites

- **Node.js** >= 18.x
- **MongoDB** >= 5.x (local or Atlas)
- **Google Gemini API Key**
- **Hugging Face API Token** (optional, for ML tools)

### Quick Start

1. **Clone the repository**:
```bash
git clone https://github.com/Dharmareddy8520/learnova.git
cd learnova
```

2. **Install dependencies**:
```bash
npm install
```

3. **Configure environment variables**:

Create `.env` in the root directory:

```env
# MongoDB
MONGO_URI=mongodb://localhost:27017/learnova

# Session
SESSION_SECRET=your-super-secret-session-key-change-in-production

# Google Gemini AI
GEMINI_API_KEY=your-gemini-api-key-here

# Hugging Face (Optional - for ML Tools)
HF_API_TOKEN=your-huggingface-token-here

# Server URLs
FRONTEND_URL=http://localhost:5174
BACKEND_URL=http://localhost:3001

# Environment
NODE_ENV=development
```

4. **Start development servers**:
```bash
npm run dev
```

This starts:
- **Frontend**: http://localhost:5174
- **Backend**: http://localhost:3001

### Individual Services

```bash
# Frontend only
npm run dev:frontend

# Backend only
npm run dev:backend
```

## 📁 Project Structure

```
FINAL_LEARNOVA/
├── apps/
│   ├── frontend/                 # React frontend application
│   │   ├── src/
│   │   │   ├── components/       # Reusable React components
│   │   │   │   ├── AppSidebar.tsx           # Navigation sidebar
│   │   │   │   ├── FileUploadSummary.tsx    # Document analyzer UI
│   │   │   │   ├── FlashcardsView.tsx       # 3D flashcard viewer
│   │   │   │   ├── QuizRunner.tsx           # Quiz player component
│   │   │   │   ├── SaveContentModal.tsx     # Save dialog
│   │   │   │   ├── UsageLimitModal.tsx      # Usage tracking modal
│   │   │   │   └── ProtectedRoute.tsx       # Auth guard
│   │   │   ├── pages/            # Page components
│   │   │   │   ├── LandingPage.tsx          # Marketing page
│   │   │   │   ├── LoginPage.tsx            # Login form
│   │   │   │   ├── SignupPage.tsx           # Registration form
│   │   │   │   ├── Dashboard.tsx            # User dashboard
│   │   │   │   ├── DocumentAnalyzerPage.tsx # File upload
│   │   │   │   ├── FileSummarizerPage.tsx   # Text summarizer
│   │   │   │   ├── QuizGenerator.tsx        # Quiz creation
│   │   │   │   ├── FlashcardsPage.tsx       # Flashcard generator
│   │   │   │   ├── QAPage.tsx               # Q&A interface
│   │   │   │   ├── SavedContentPage.tsx     # Content library
│   │   │   │   ├── MLTools.tsx              # ML utilities
│   │   │   │   └── ProfilePage.tsx          # User settings
│   │   │   ├── contexts/         # React context providers
│   │   │   │   └── AuthContext.tsx          # Auth state
│   │   │   ├── hooks/            # Custom React hooks
│   │   │   │   ├── usePageMeta.tsx          # SEO metadata
│   │   │   │   └── useUsageLimits.tsx       # Usage tracking
│   │   │   ├── services/         # API clients
│   │   │   │   └── ml.ts                    # ML tools API
│   │   │   ├── utils/            # Helper functions
│   │   │   │   └── downloadUtils.ts         # File downloads
│   │   │   └── __tests__/        # Frontend tests
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.js
│   │   └── package.json
│   │
│   └── backend/                  # Express backend application
│       ├── src/
│       │   ├── models/           # Mongoose schemas
│       │   │   ├── User.ts                  # User model
│       │   │   ├── SavedContent.ts          # Saved content model
│       │   │   └── UsageEvent.ts            # Usage tracking model
│       │   ├── routes/           # API endpoints
│       │   │   ├── auth.ts                  # Authentication
│       │   │   ├── user.ts                  # User management
│       │   │   ├── dashboard.ts             # Dashboard stats
│       │   │   ├── upload.ts                # File upload
│       │   │   ├── analyze.ts               # Document analysis
│       │   │   ├── summary.ts               # Text summarization
│       │   │   ├── challenge.ts             # Quiz generation
│       │   │   ├── saved-content.ts         # Content library
│       │   │   ├── ml.ts                    # ML tools
│       │   │   ├── usage.ts                 # Usage tracking
│       │   │   ├── billing.ts               # Premium features
│       │   │   └── log.ts                   # Activity logging
│       │   ├── services/         # Business logic
│       │   │   ├── gemini.ts                # Gemini AI service
│       │   │   ├── gemini-document.ts       # Document processing
│       │   │   └── hf.ts                    # Hugging Face ML
│       │   ├── middleware/       # Express middleware
│       │   │   └── auth.ts                  # Auth guards
│       │   ├── config/           # Configuration
│       │   │   ├── database.ts              # MongoDB setup
│       │   │   └── passport.ts              # Auth config
│       │   ├── types/            # TypeScript types
│       │   │   ├── express.d.ts             # Express types
│       │   │   └── ambient.d.ts             # Global types
│       │   ├── __tests__/        # Backend tests
│       │   └── index.ts          # Entry point
│       ├── uploads/              # Temporary file storage
│       ├── jest.config.js
│       ├── tsconfig.json
│       └── package.json
│
├── package.json                  # Root package.json
├── README.md                     # This file
└── .env                          # Environment variables (create this)
```

## 🔌 API Reference

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user account |
| POST | `/api/auth/login` | Login with email/password |
| GET | `/api/auth/logout` | Logout current session |
| GET | `/api/auth/check` | Check authentication status |

### User Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/user/me` | Get current user profile |
| PUT | `/api/user/preferences` | Update user preferences |
| GET | `/api/user/usage` | Get usage statistics |

### Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard` | Get dashboard stats (streak, counts) |

### Document Processing

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/upload` | Upload PDF/DOCX file (max 10MB) |
| POST | `/api/analyze` | Analyze uploaded document |
| POST | `/api/summary` | Generate text summary |
| POST | `/api/summary/qa` | Ask questions about content |
| POST | `/api/challenge` | Generate quiz from content |

### Saved Content

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/saved-content` | Save content (summary/quiz/flashcard/qa) |
| GET | `/api/saved-content` | List all saved content with filters |
| GET | `/api/saved-content/:id` | Get specific saved content |
| PUT | `/api/saved-content/:id` | Update saved content |
| DELETE | `/api/saved-content/:id` | Delete saved content |
| GET | `/api/saved-content-stats` | Get content statistics by type |

### ML Tools

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ml/classify` | Text classification |
| POST | `/api/ml/sentiment` | Sentiment analysis |
| POST | `/api/ml/ner` | Named entity recognition |

### Usage Tracking

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/usage/limits` | Get usage limits and current usage |
| POST | `/api/log` | Log usage event |

### Billing (Premium)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/billing/create-checkout` | Create Stripe checkout session |
| POST | `/api/billing/webhook` | Stripe webhook handler |

## 🎨 Key Features Breakdown

### 1. Document Analyzer
- Upload PDF/DOCX files up to 10MB
- Extract text using GridFS
- Generate comprehensive summaries with key points
- Create flashcards automatically
- Generate contextual quizzes
- Interactive Q&A interface
- Save all generated content

### 2. Interactive Flashcards
- **3D Flip Animation**: Cards flip with `rotateY(180deg)` transform
- **Mastery Tracking**: Mark cards as mastered to focus on challenging ones
- **Progress Indicator**: Visual progress bar showing study completion
- **Keyboard Navigation**: Space to flip, Arrow keys to navigate
- **Persistent Save**: Save button available throughout study session

### 3. Quiz System
- **Configurable Difficulty**: Easy, Medium, Hard
- **Adjustable Quantity**: 5-20 questions
- **Real-time Feedback**: Instant answer validation
- **Enhanced Results**: Emoji feedback (🎉/💪), animated progress bars
- **Save During Quiz**: Save button in header while taking quiz
- **Save After Completion**: Save results with scores

### 4. Q&A Interface
- **Contextual Questions**: Ask anything about uploaded content
- **Conversation History**: Track all Q&A interactions
- **Multiple Save Options**: Save from header or recent Q&A section
- **Item Counter**: Shows number of Q&A pairs

### 5. Saved Content Library
- **Full CRUD Operations**: Create, read, update, delete
- **Full-Text Search**: MongoDB text index on title and description
- **Type Filtering**: Filter by summary, quiz, flashcard, Q&A
- **Real-time Stats**: Automatic counter updates using React useEffect
- **Download Options**: Export as TXT or JSON
- **Responsive Grid**: Beautiful card layout with hover effects
- **AppSidebar Integration**: Seamless navigation

### 6. ML Tools
- **Text Classification**: Categorize content automatically
- **Sentiment Analysis**: Analyze emotional tone (positive/negative/neutral)
- **Named Entity Recognition**: Extract people, places, organizations

## 🎯 Usage Limits

### Free Tier
- **50 requests per day**
- All core features available
- Document uploads up to 10MB
- Save unlimited content

### Premium Tier
- **500 requests per day**
- Priority processing
- Advanced ML features
- Extended file size limits

## 🧪 Testing

Run the full test suite:
```bash
npm test
```

Run tests for specific services:
```bash
# Backend tests
npm run test:backend

# Frontend tests
npm run test:frontend
```

Test files are located in:
- Backend: `apps/backend/src/__tests__/`
- Frontend: `apps/frontend/src/__tests__/`

## 🚀 Deployment

### Frontend (Vercel)
```bash
cd apps/frontend
npm run build
# Deploy dist/ folder to Vercel
```

### Backend (Render/Railway)
```bash
cd apps/backend
npm run build
# Deploy with NODE_ENV=production
```

### Environment Variables for Production
```env
NODE_ENV=production
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/learnova
SESSION_SECRET=long-random-production-secret
GEMINI_API_KEY=your-production-gemini-key
FRONTEND_URL=https://your-frontend-domain.com
BACKEND_URL=https://your-backend-domain.com
```

## 🛠️ Development

### Code Style
- TypeScript with strict mode
- ESLint for code quality
- Prettier for formatting
- Consistent file naming conventions

### Git Workflow
1. Create feature branch from `main`
2. Make changes with descriptive commits
3. Run tests before pushing
4. Create pull request
5. Merge after review

### Adding New Features

**Backend Route Example**:
```typescript
import express from 'express';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

router.get('/api/new-feature', requireAuth, async (req, res) => {
  // Implementation
});

export default router;
```

**Frontend Page Example**:
```typescript
import React from 'react';
import { AppSidebar } from '../components/AppSidebar';

export default function NewPage() {
  return (
    <>
      <AppSidebar />
      <main className="pt-14 pb-14 md:pt-0 md:pb-0 md:ml-64">
        {/* Content */}
      </main>
    </>
  );
}
```

## 📊 Performance

- **First Load**: < 2s with code splitting
- **API Response**: < 500ms for most endpoints
- **Gemini Processing**: 2-10s depending on document size
- **File Upload**: Chunked upload for large files
- **MongoDB Indexes**: Optimized queries with compound indexes

## 🔒 Security

- **Session Management**: express-session with MongoDB store
- **Password Hashing**: Bcrypt with salt rounds
- **CORS**: Configured for frontend domain
- **Rate Limiting**: Usage tracking per user
- **File Validation**: MIME type and size checks
- **Input Sanitization**: MongoDB query sanitization

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Contribution Areas
- 🐛 Bug fixes
- ✨ New features
- 📝 Documentation improvements
- 🎨 UI/UX enhancements
- ⚡ Performance optimizations
- 🧪 Test coverage

## 📝 License

This project is licensed under the **MIT License** - see the LICENSE file for details.

## 👥 Authors

- **Dharma Reddy** - [@Dharmareddy8520](https://github.com/Dharmareddy8520)

## 🙏 Acknowledgments

- **Google Gemini AI** for powerful language models
- **Hugging Face** for ML infrastructure
- **MongoDB** for flexible data storage
- **React** and **Vite** communities for excellent tools
- **Tailwind CSS** for beautiful styling system

## 📞 Support

For support, email support@learnova.com or open an issue on GitHub.

## 🗺️ Roadmap

### Completed ✅
- ✅ User authentication and session management
- ✅ Document upload and processing
- ✅ AI-powered summarization
- ✅ Quiz generation and interactive player
- ✅ Flashcard system with 3D animations
- ✅ Q&A conversational interface
- ✅ Saved content library with search/filter
- ✅ Usage tracking and limits
- ✅ Dashboard with streak tracking
- ✅ ML tools integration
- ✅ Download utilities (TXT/JSON)
- ✅ Real-time statistics
- ✅ Mobile responsive design

### In Progress 🚧
- 🚧 Stripe payment integration
- 🚧 OAuth providers (Google, GitHub)
- 🚧 Advanced analytics dashboard

### Planned 📋
- 📋 Spaced repetition algorithm
- 📋 Collaborative study groups
- 📋 Content sharing features
- 📋 Mobile app (React Native)
- 📋 Offline mode with PWA
- 📋 Video content support
- 📋 Voice-to-text integration
- 📋 Multi-language support

---

**Built with ❤️ by the Learnova Team members**
