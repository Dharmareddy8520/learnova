import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  _id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'free' | 'premium';
  oauthProviders: {
    google?: string;
    github?: string;
  };
  avatarUrl?: string;
  startedAt: Date;
  lastActiveAt: Date;
  consecutiveDays: number;
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  updateLastActive(): Promise<void>;
  calculateConsecutiveDays(): Promise<number>;
  // Billing fields
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  subscriptionStatus?: string;
  currentPeriodEnd?: Date | null;
}

const UserSchema = new Schema<IUser>({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  passwordHash: {
    type: String,
    required: function(this: IUser) {
      return !this.oauthProviders?.google && !this.oauthProviders?.github;
    }
  },
  role: {
    type: String,
    enum: ['free', 'premium'],
    default: 'free'
  },
  oauthProviders: {
    google: String,
    github: String
  },
  avatarUrl: {
    type: String,
    default: ''
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  lastActiveAt: {
    type: Date,
    default: Date.now
  },
  consecutiveDays: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Billing-related fields
(UserSchema as any).add({
  stripeCustomerId: { type: String, default: '' },
  stripeSubscriptionId: { type: String, default: '' },
  subscriptionStatus: { type: String, default: 'inactive' },
  currentPeriodEnd: { type: Date, default: null }
});

// Per-feature usage counts for daily limits
// Stored as an object mapping featureName -> number, and a usageDate string (YYYY-MM-DD)
(UserSchema as any).add({
  usage: {
    type: Schema.Types.Mixed,
    default: {}
  },
  usageDate: {
    type: String,
    default: ''
  }
});

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('passwordHash')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Compare password method
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Update last active timestamp
UserSchema.methods.updateLastActive = async function(): Promise<void> {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  // If last active was more than 24 hours ago, reset consecutive days
  if (this.lastActiveAt < yesterday) {
    this.consecutiveDays = 1;
  } else {
    // If last active was yesterday, increment consecutive days
    const lastActiveDate = new Date(this.lastActiveAt);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastActiveDay = new Date(lastActiveDate.getFullYear(), lastActiveDate.getMonth(), lastActiveDate.getDate());
    
    if (lastActiveDay.getTime() === today.getTime() - 24 * 60 * 60 * 1000) {
      this.consecutiveDays += 1;
    } else if (lastActiveDay.getTime() < today.getTime() - 24 * 60 * 60 * 1000) {
      this.consecutiveDays = 1;
    }
  }
  
  this.lastActiveAt = now;
  await this.save();
};

// Increment usage for a feature with daily reset.
UserSchema.methods.incrementUsage = async function(feature: string): Promise<{ used: number; usage: Record<string, number>; usageDate: string }> {
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  if (this.usageDate !== today) {
    this.usage = {}
    this.usageDate = today
  }
  const prev = (this.usage && typeof this.usage[feature] === 'number') ? Number(this.usage[feature]) : 0
  const next = prev + 1
  this.usage = { ...(this.usage || {}), [feature]: next }
  await this.save()
  // Log to server terminal for visibility during development
  try {
    // eslint-disable-next-line no-console
    console.log(`USAGE_INCREMENT user:${this._id} feature:${feature} used:${next} usageDate:${this.usageDate}`)
  } catch (e) {
    // ignore
  }
  return { used: next, usage: this.usage as Record<string, number>, usageDate: this.usageDate }
}

// Calculate consecutive days
UserSchema.methods.calculateConsecutiveDays = async function(): Promise<number> {
  await this.updateLastActive();
  return this.consecutiveDays;
};

export const User = mongoose.model<IUser>('User', UserSchema);
