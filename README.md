# Learnova - AI Personal Knowledge Companion

Learnova is an AI-powered personal knowledge companion that helps you transform any text or document into interactive learning materials. Get instant summaries, generate flashcards, and master your knowledge with AI-powered insights.

## Features

- **Instant Summaries**: Paste any text and get AI-generated summaries in seconds
- **Smart Flashcards**: Auto-generate flashcards from your documents for effective memorization
- **AI Q&A**: Ask questions about your content and get intelligent answers
- **Progress Tracking**: Track your learning streak and monitor your knowledge growth
- **Document Upload**: Upload PDFs and DOCX files for processing
- **OAuth Integration**: Sign in with Google or GitHub
- **Premium Features**: Stripe-powered premium features for advanced AI processing

## Tech Stack

### Frontend
- React 18 + TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- React Router for navigation
- React Query for data fetching
- Lucide React for icons

### Backend
- Node.js + Express + TypeScript
- MongoDB with Mongoose
- GridFS for file storage
- Passport.js for authentication
- Agenda for background job processing
- OpenAI for AI features
- Stripe for payments

## Getting Started

### Prerequisites

- Node.js >= 18
- MongoDB (local or cloud)
- OpenAI API key
- Stripe account (for payments)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd learnova
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
MONGO_URI=mongodb://localhost:27017/learnova
SESSION_SECRET=your-super-secret-session-key-here
OPENAI_API_KEY=your-openai-api-key-here
STRIPE_SECRET_KEY=sk_test_your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:3001
NODE_ENV=development
```

4. Start the development servers:
```bash
npm run dev
```

This will start both the frontend (http://localhost:5173) and backend (http://localhost:3001) servers.

### Running Individual Services

- Frontend only: `npm run dev:frontend`
- Backend only: `npm run dev:backend`

## Project Structure

```
learnova/
├── apps/
│   ├── frontend/          # React frontend
│   │   ├── src/
│   │   │   ├── components/    # Reusable components
│   │   │   ├── pages/         # Page components
│   │   │   ├── contexts/      # React contexts
│   │   │   └── __tests__/     # Frontend tests
│   │   └── package.json
│   └── backend/           # Express backend
│       ├── src/
│       │   ├── models/        # Mongoose models
│       │   ├── routes/        # API routes
│       │   ├── middleware/    # Express middleware
│       │   ├── config/        # Configuration files
│       │   └── __tests__/     # Backend tests
│       └── package.json
├── package.json           # Root package.json
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/logout` - Logout user
- `GET /api/auth/oauth/google` - Google OAuth
- `GET /api/auth/oauth/github` - GitHub OAuth

### User
- `GET /api/user/me` - Get current user info
- `PUT /api/user/preferences` - Update user preferences

### Dashboard
- `GET /api/dashboard` - Get dashboard data

## Testing

Run tests for both frontend and backend:
```bash
npm test
```

Run tests for specific service:
```bash
npm run test:backend
npm run test:frontend
```

## Development Status

This project is currently in **Step 1** of development:

✅ **Step 1 Complete**: Project skeleton + Landing + Auth
- Monorepo structure with frontend and backend
- Landing page with feature showcase
- Signup/Login pages with email and OAuth
- Protected Dashboard route
- Consecutive days streak tracking
- Basic authentication with sessions

🔄 **Next Steps**:
- Step 2: Dashboard internals + streak logic
- Step 3: Paste-text summarizer (sync)
- Step 4: Document upload + Agenda job enqueue
- Step 5: Embeddings + vector search
- Step 6: Summaries, flashcards, quizzes generation
- Step 7: Stripe integration
- Step 8: Study mode & spaced repetition
- Step 9: Tests & QA
- Step 10: Polish & Documentation

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

This project is licensed under the MIT License.
