import dotenv from 'dotenv';
// Load .env into process.env before importing any modules that depend on environment variables
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import passport from 'passport';
import { connectDB } from './config/database';
import { configurePassport } from './config/passport';
import authRoutes from './routes/auth';
import userRoutes from './routes/user';
import dashboardRoutes from './routes/dashboard';
import mlRoutes from './routes/ml';
import logRoutes from './routes/log';
import billingRoutes, { stripeWebhookHandler } from './routes/billing';
import usageRoutes from './routes/usage';
import analyzeRoutes from './routes/analyze';
import uploadRoutes from './routes/upload';
import summaryRoutes from './routes/summary';
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

// Body parsing middleware (capture raw body for debugging JSON parse errors)
app.use(express.json({
  limit: '100kb',
  // verify signature expects (req,res,buf,encoding: string)
  verify: (req: any, res: any, buf: Buffer, encoding: string) => {
    try {
      req.rawBody = buf.toString((encoding as BufferEncoding) || 'utf8');
    } catch (e) {
      req.rawBody = undefined;
    }
  }
}));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// JSON parse error handler (body-parser)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err && (err instanceof SyntaxError || err.type === 'entity.parse.failed')) {
    console.error('JSON parse error:', err.message);
    // log rawBody at debug level to avoid leaking in production logs
    console.debug('Raw request body (truncated):', (req as any).rawBody ? String((req as any).rawBody).slice(0, 1000) : undefined);
    return res.status(400).json({ error: 'Invalid JSON payload', details: err.message });
  }
  next(err);
});

// Session configuration
// Allow overriding cookie security and sameSite behavior via env vars so
// running locally while NODE_ENV=production (or testing with http) still works.
const isProduction = process.env.NODE_ENV === 'production';
const sessionCookieSecure = process.env.SESSION_COOKIE_SECURE
  ? process.env.SESSION_COOKIE_SECURE === 'true'
  : isProduction; // default: secure in production
const sessionCookieSameSite = process.env.SESSION_COOKIE_SAMESITE || (isProduction ? 'none' : 'lax');
const sessionMaxAge = Number(process.env.SESSION_MAX_AGE_MS || String(1000 * 60 * 60 * 24 * 30));
const sessionTtl = Number(process.env.SESSION_TTL_SECONDS || String(60 * 60 * 24 * 30));

app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret-key',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI || 'mongodb://localhost:27017/learnova',
    touchAfter: 24 * 3600, // lazy session update
    // Set TTL for sessions in seconds
    ttl: sessionTtl,
  }),
  cookie: {
    secure: sessionCookieSecure,
    httpOnly: true,
    sameSite: sessionCookieSameSite as any,
    maxAge: sessionMaxAge,
  },
  rolling: true,
}));

// Lightweight session debug logging (remove or lower verbosity in production)
app.use((req, res, next) => {
  try {
    // only log minimal info to avoid leaking sensitive data
    console.debug('Session debug:', {
      sessionID: (req as any).sessionID,
      hasSession: !!(req as any).session,
      cookie: ((req as any).session && (req as any).session.cookie) ? { maxAge: (req as any).session.cookie.maxAge } : undefined,
      path: req.path,
    });
  } catch (e) {
    // ignore
  }
  next();
});

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
// In-memory file analyze endpoints (upload + analyze + status)
app.use('/api', analyzeRoutes);
// File upload endpoints
app.use('/api', uploadRoutes);
// Summary processing endpoints  
app.use('/api', summaryRoutes);
// Logging endpoints (public, dev helper)
app.use('/api/log', logRoutes);
// Billing routes (checkout + portal)
app.use('/api/billing', billingRoutes);

// Stripe webhook (must use raw body)
app.post('/api/billing/stripe-webhook', express.raw({ type: 'application/json' }), (req, res) => stripeWebhookHandler(req, res))

// Usage meta endpoint
app.use('/api/usage', usageRoutes);

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
