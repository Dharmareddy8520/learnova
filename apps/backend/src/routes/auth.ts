import express from 'express';
import passport from 'passport';
import { z } from 'zod';
import { User } from '../models/User';

const router = express.Router();

// Validation schemas
const registerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
});

// Register endpoint
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = registerSchema.parse(req.body);
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }
    
    // Create new user
    const user = new User({
      name,
      email,
      passwordHash: password // Will be hashed by pre-save middleware
    });
    
    await user.save();
    
    // Return success without logging user in
    res.json({
      success: true,
      message: 'Registration successful! Please log in to continue.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        consecutiveDays: user.consecutiveDays
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.errors 
      });
    }
    
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login endpoint
router.post('/login', (req, res, next) => {
  const { email, password } = loginSchema.parse(req.body);
  
  passport.authenticate('local', (err: any, user: any, info: any) => {
    if (err) {
      return res.status(500).json({ error: 'Authentication error' });
    }
    
    if (!user) {
      return res.status(401).json({ error: info?.message || 'Invalid credentials' });
    }
    
    req.login(user, async (loginErr) => {
      if (loginErr) {
        return res.status(500).json({ error: 'Login failed' });
      }
      
      // Update last active timestamp
      await user.updateLastActive();
      
      res.json({
        success: true,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          consecutiveDays: user.consecutiveDays
        }
      });
    });
  })(req, res, next);
});

// Logout endpoint
router.get('/logout', (req, res) => {
  // req is the augmented Express Request (see src/types/express.d.ts)
  req.logout && req.logout((err: any) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    req.session && req.session.destroy((sessionErr: any) => {
      if (sessionErr) {
        return res.status(500).json({ error: 'Session destruction failed' });
      }

      res.clearCookie('connect.sid');
      res.json({ success: true, message: 'Logged out successfully' });
    });
  });
});

// Google OAuth routes
router.get('/oauth/google', (req, res, next) => {
  // Prefer an explicit BACKEND_URL if it's set to a non-localhost value.
  // Otherwise derive the public host from X-Forwarded headers (used by Render/Cloudflare) or the request host.
  const envBackend = (process.env.BACKEND_URL || '').trim();
  const forwardedHost = (req.get('x-forwarded-host') || req.get('host') || '').toString();
  const forwardedProto = (req.get('x-forwarded-proto') || req.protocol).toString();
  const derivedBase = `${forwardedProto}://${forwardedHost}`;
  const backendBase = (envBackend && !/localhost/i.test(envBackend)) ? envBackend : derivedBase;
  const callback = (process.env.GOOGLE_CALLBACK_URL && !/localhost/i.test(process.env.GOOGLE_CALLBACK_URL))
    ? process.env.GOOGLE_CALLBACK_URL
    : `${backendBase}/api/auth/oauth/google/callback`;

  console.info('[OAuth] Google auth initiation — env BACKEND_URL:', envBackend, 'derivedBase:', derivedBase, 'using callback:', callback);

  passport.authenticate('google', { scope: ['profile', 'email'], callbackURL: callback } as any)(req, res, next);
});

// Backwards-compatibility: some deployments/Google Console entries accidentally have a typo
// in the path ("oauh" instead of "oauth"). Accept that misspelled callback and forward
// it to the correct callback path preserving query parameters so the OAuth flow can complete.
router.get('/oauh/google/callback', (req, res) => {
  const qs = Object.keys(req.query).length ? `?${new URLSearchParams(req.query as any).toString()}` : '';
  // Redirect internally to the correct callback handler
  res.redirect(`${req.baseUrl}/oauth/google/callback${qs}`);
});

router.get('/oauth/google/callback',
  (req, res, next) => {
    const failureRedirect = `${process.env.FRONTEND_URL || 'http://localhost:5174'}/login?error=oauth_failed`;
    const envBackend = (process.env.BACKEND_URL || '').trim();
    const forwardedHost = (req.get('x-forwarded-host') || req.get('host') || '').toString();
    const forwardedProto = (req.get('x-forwarded-proto') || req.protocol).toString();
    const derivedBase = `${forwardedProto}://${forwardedHost}`;
    const backendBase = (envBackend && !/localhost/i.test(envBackend)) ? envBackend : derivedBase;
    const callback = (process.env.GOOGLE_CALLBACK_URL && !/localhost/i.test(process.env.GOOGLE_CALLBACK_URL))
      ? process.env.GOOGLE_CALLBACK_URL
      : `${backendBase}/api/auth/oauth/google/callback`;

    console.info('[OAuth] Google callback handling — env BACKEND_URL:', envBackend, 'derivedBase:', derivedBase, 'using callback:', callback);
    passport.authenticate('google', { failureRedirect, callbackURL: callback } as any)(req, res, next);
  },
  async (req, res) => {
    try {
      // Update last active timestamp
      await req.user?.updateLastActive();

      res.redirect(`${process.env.FRONTEND_URL}/dashboard`);
    } catch (error) {
      console.error('Google OAuth callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_callback_failed`);
    }
  }
);

// GitHub OAuth routes
router.get('/oauth/github', (req, res, next) => {
  const backendBase = (process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`).trim();
  const callback = process.env.GITHUB_CALLBACK_URL || `${backendBase}/api/auth/oauth/github/callback`;
  passport.authenticate('github', { scope: ['user:email'], callbackURL: callback } as any)(req, res, next);
});

router.get('/oauth/github/callback',
  (req, res, next) => {
    const failureRedirect = `${process.env.FRONTEND_URL || 'http://localhost:5174'}/login?error=oauth_failed`;
    const backendBase = (process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`).trim();
    const callback = process.env.GITHUB_CALLBACK_URL || `${backendBase}/api/auth/oauth/github/callback`;
  passport.authenticate('github', { failureRedirect, callbackURL: callback } as any)(req, res, next);
  },
  async (req, res) => {
    try {
      // Update last active timestamp
      await req.user?.updateLastActive();

      res.redirect(`${process.env.FRONTEND_URL}/dashboard`);
    } catch (error) {
      console.error('GitHub OAuth callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_callback_failed`);
    }
  }
);

export default router;
