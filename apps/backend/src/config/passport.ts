import passport from 'passport';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load local .env explicitly in development so environment variables are available
// to this module regardless of import order. This uses apps/backend/.env when
// present and falls back to default dotenv behavior.
if (process.env.NODE_ENV !== 'production') {
  try {
    const envPath = path.resolve(__dirname, '../../.env');
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
      console.info(`Loaded local .env from ${envPath}`);
    } else {
      dotenv.config();
      console.info('Loaded default .env (no apps/backend/.env found)');
    }
  } catch (err) {
    console.warn('Failed to load local .env:', err);
  }
}
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GoogleStrategy, Profile as GoogleProfile } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { User, IUser } from '../models/User';

// Read env once for clarity
const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, BACKEND_URL, GOOGLE_CALLBACK_URL } = process.env;

// Helper to resolve backend base URL in prod or fallback to localhost for dev
const resolvedBackendUrl = (BACKEND_URL && BACKEND_URL.trim()) || 'http://localhost:3001';

// Local strategy
passport.use(new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password'
}, async (email, password, done) => {
  try {
    const user = await User.findOne({ email });
    
    if (!user) {
      return done(null, false, { message: 'Invalid email or password' });
    }
    
    if (!user.passwordHash) {
      return done(null, false, { message: 'Please use OAuth login for this account' });
    }
    
    const isValidPassword = await user.comparePassword(password);
    
    if (!isValidPassword) {
      return done(null, false, { message: 'Invalid email or password' });
    }
    
    return done(null, user);
  } catch (error) {
    return done(error);
  }
}));

// Google OAuth strategy
if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
  try {
  // Use explicit callback path that matches the routes (server redirect URI)
  // The routes expect: /api/auth/oauth/google/callback
  const googleCallback = GOOGLE_CALLBACK_URL || `${resolvedBackendUrl}/api/auth/oauth/google/callback`;
    passport.use(new GoogleStrategy({
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: googleCallback
  }, async (accessToken: string, refreshToken: string, profile: any, done: (err: any, user?: any, info?: any) => void) => {
    try {
      // Check if user exists with Google ID
      let user = await User.findOne({ 'oauthProviders.google': profile.id });
      
      if (user) {
        return done(null, user);
      }
      
      // Check if user exists with same email
      user = await User.findOne({ email: profile.emails?.[0]?.value });
      
      if (user) {
        // Link Google account to existing user
        user.oauthProviders.google = profile.id;
        await user.save();
        return done(null, user);
      }
      
      // Create new user
      user = new User({
        name: profile.displayName || profile.name?.givenName || 'User',
        email: profile.emails?.[0]?.value || '',
        oauthProviders: {
          google: profile.id
        }
      });
      
      await user.save();
      return done(null, user);
    } catch (error) {
      return done(error);
    }
    }));
    console.log('✅ Google OAuth strategy configured — callback URL:', googleCallback);
  } catch (err) {
    console.error('❌ Error configuring Google OAuth strategy:', err);
  }
} else {
  console.log('⚠️ Google OAuth credentials not provided - Google login disabled');
}

// GitHub OAuth strategy
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  try {
    passport.use(new GitHubStrategy({
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: `${resolvedBackendUrl}/api/auth/oauth/github/callback`
    }, async (accessToken: string, refreshToken: string, profile: any, done: (err: any, user?: any, info?: any) => void) => {
    try {
      // Check if user exists with GitHub ID
      let user = await User.findOne({ 'oauthProviders.github': profile.id });
      
      if (user) {
        return done(null, user);
      }
      
      // Check if user exists with same email
      user = await User.findOne({ email: profile.emails?.[0]?.value });
      
      if (user) {
        // Link GitHub account to existing user
        user.oauthProviders.github = profile.id;
        await user.save();
        return done(null, user);
      }
      
      // Create new user
      user = new User({
        name: profile.displayName || profile.username || 'User',
        email: profile.emails?.[0]?.value || '',
        oauthProviders: {
          github: profile.id
        }
      });
      
      await user.save();
      return done(null, user);
    } catch (error) {
      return done(error);
    }
    }));
    console.log('✅ GitHub OAuth strategy configured — callback URL:', `${resolvedBackendUrl}/api/auth/oauth/github/callback`);
  } catch (err) {
    console.error('❌ Error configuring GitHub OAuth strategy:', err);
  }
} else {
  console.log('⚠️ GitHub OAuth credentials not provided - GitHub login disabled');
}

// Serialize user for session
passport.serializeUser((user: any, done) => {
  done(null, user._id);
});

// Deserialize user from session
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

export const configurePassport = () => {
  // Passport is already configured above
};
