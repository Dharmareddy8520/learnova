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
    required: function() {
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

// Calculate consecutive days
UserSchema.methods.calculateConsecutiveDays = async function(): Promise<number> {
  await this.updateLastActive();
  return this.consecutiveDays;
};

export const User = mongoose.model<IUser>('User', UserSchema);
