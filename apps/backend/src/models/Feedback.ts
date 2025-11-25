import mongoose, { Document, Schema } from 'mongoose';

export interface IFeedback extends Document {
  _id: string;
  name: string;
  email: string;
  rating: number; // 1-5 stars
  review: string;
  userId?: string; // Optional: if user is logged in
  isAnonymous: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const FeedbackSchema = new Schema<IFeedback>({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  review: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  userId: {
    type: String,
    default: null
  },
  isAnonymous: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for faster queries
FeedbackSchema.index({ createdAt: -1 });
FeedbackSchema.index({ rating: 1 });

export const Feedback = mongoose.model<IFeedback>('Feedback', FeedbackSchema);
