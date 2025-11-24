import mongoose, { Document, Schema } from 'mongoose';

/**
 * SavedContent Model
 * 
 * Stores user-generated summaries, quizzes, flashcards, and Q&A history for later retrieval.
 * Each document includes:
 * - title: Human-friendly name for the saved content
 * - description: Optional notes/context
 * - type: Content type (summary, quiz, flashcard, qa)
 * - content: The actual data (can be string, JSON, or structured data)
 * - userId: Reference to the user who created it
 * - metadata: Additional info like original filename, word count, etc.
 * - timestamps: Automatic createdAt/updatedAt
 */

export interface ISavedContent extends Document {
  _id: string;
  userId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  type: 'summary' | 'quiz' | 'flashcard' | 'qa';
  content: any; // Flexible: string for summary, array for quiz/flashcards/qa
  metadata?: {
    originalFileName?: string;
    wordCount?: number;
    itemCount?: number; // Number of quiz questions or flashcards
    tags?: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

const SavedContentSchema = new Schema<ISavedContent>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true, // Index for faster user-based queries
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    type: {
      type: String,
      enum: ['summary', 'quiz', 'flashcard', 'qa'],
      required: true,
      index: true, // Index for filtering by type
    },
    content: {
      type: Schema.Types.Mixed,
      required: true,
    },
    metadata: {
      originalFileName: String,
      wordCount: Number,
      itemCount: Number,
      tags: [String],
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

// Compound index for efficient user+type queries
SavedContentSchema.index({ userId: 1, type: 1 });

// Text index for search functionality
SavedContentSchema.index({ title: 'text', description: 'text' });

export default mongoose.model<ISavedContent>('SavedContent', SavedContentSchema);
