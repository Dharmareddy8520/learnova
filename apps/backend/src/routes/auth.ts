import express from 'express';
import passport from 'passport';
import { z } from 'zod';
import { User } from '../models/User';
import { AuthenticatedRequest } from '../middleware/auth';

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
router.get('/logout', (req: AuthenticatedRequest, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    
    req.session.destroy((sessionErr) => {
      if (sessionErr) {
        return res.status(500).json({ error: 'Session destruction failed' });
      }
      
      res.clearCookie('connect.sid');
      res.json({ success: true, message: 'Logged out successfully' });
    });
  });
});

// Google OAuth routes
router.get('/oauth/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

router.get('/oauth/google/callback', 
  passport.authenticate('google', { failureRedirect: `${process.env.FRONTEND_URL}/login?error=oauth_failed` }),
  async (req: AuthenticatedRequest, res) => {
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
router.get('/oauth/github', passport.authenticate('github', {
  scope: ['user:email']
}));

router.get('/oauth/github/callback',
  passport.authenticate('github', { failureRedirect: `${process.env.FRONTEND_URL}/login?error=oauth_failed` }),
  async (req: AuthenticatedRequest, res) => {
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
