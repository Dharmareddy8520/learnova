import dotenv from 'dotenv';
// Load .env into process.env before importing any modules that depend on environment variables
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import passport from 'passport';
import { connectDB } from './config/database';
import { configurePassport } from './config/passport';
import authRoutes from './routes/auth';
import userRoutes from './routes/user';
import dashboardRoutes from './routes/dashboard';
import mlRoutes from './routes/ml';
import { isAuthenticated } from './middleware/auth';

const app = express();
const PORT = process.env.PORT || 3001;

// Connect to MongoDB
connectDB();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// When running behind Render/Cloudflare in production we must trust the proxy
// so that secure cookies and x-forwarded-* headers work correctly.
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret-key',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI || 'mongodb://localhost:27017/learnova',
    touchAfter: 24 * 3600, // lazy session update
    // Set TTL for sessions in seconds (e.g., 30 days)
    ttl: Number(process.env.SESSION_TTL_SECONDS || String(60 * 60 * 24 * 30)),
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    // In production we need cross-site cookies (SameSite=None) because
    // the frontend is hosted on a separate origin (Vercel) and we rely on
    // cookies to be sent for authentication. Locally use 'lax' for safety.
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    // Make sessions last longer by default (30 days)
    maxAge: Number(process.env.SESSION_MAX_AGE_MS || String(1000 * 60 * 60 * 24 * 30)),
    // Refresh the session expiration on each response
    // Note: express-session's 'rolling' option is set below
  }
  ,
  rolling: true,
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Configure Passport strategies
configurePassport();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', isAuthenticated, userRoutes);
app.use('/api/dashboard', isAuthenticated, dashboardRoutes);
// Mount ML routes at /api so endpoints are available as /api/summarize, /api/quiz/generate, etc.
app.use('/api', mlRoutes);
// Backwards-compatible mount: some deployments or older builds expect /api/ml/*
// Keep this alias so both /api/summarize and /api/ml/summarize will work
app.use('/api/ml', mlRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});
