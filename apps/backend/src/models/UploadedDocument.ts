import mongoose, { Schema, Document } from 'mongoose'

export interface ISummary extends Document {
  content: string
  wordCount?: number
  createdAt: Date
}

export interface IQuiz extends Document {
  questions: Array<{
    question: string
    options?: string[]
    answer?: string
    explanation?: string
  }>
  createdAt: Date
}

export interface IFlashcard extends Document {
  cards: Array<{
    front: string
    back: string
  }>
  createdAt: Date
}

export interface IUploadedDocument extends Document {
  userId: mongoose.Types.ObjectId
  filename: string
  originalText: string
  fileSize: number
  fileType: string
  summary?: mongoose.Types.ObjectId
  quiz?: mongoose.Types.ObjectId
  flashcards?: mongoose.Types.ObjectId
  folderId?: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const SummarySchema = new Schema({
  content: { type: String, required: true },
  wordCount: { type: Number },
  createdAt: { type: Date, default: Date.now },
})

const QuizSchema = new Schema({
  questions: [
    {
      question: { type: String, required: true },
      options: [String],
      answer: String,
      explanation: String,
    },
  ],
  createdAt: { type: Date, default: Date.now },
})

const FlashcardSchema = new Schema({
  cards: [
    {
      front: { type: String, required: true },
      back: { type: String, required: true },
    },
  ],
  createdAt: { type: Date, default: Date.now },
})

const UploadedDocumentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    filename: { type: String, required: true },
    originalText: { type: String, required: true },
    fileSize: { type: Number },
    fileType: { type: String },
    summary: { type: Schema.Types.ObjectId, ref: 'Summary' },
    quiz: { type: Schema.Types.ObjectId, ref: 'Quiz' },
    flashcards: { type: Schema.Types.ObjectId, ref: 'Flashcard' },
    folderId: { type: Schema.Types.ObjectId, ref: 'Folder' },
  },
  {
    timestamps: true,
  }
)

export const Summary = mongoose.model<ISummary>('Summary', SummarySchema)
export const Quiz = mongoose.model<IQuiz>('Quiz', QuizSchema)
export const Flashcard = mongoose.model<IFlashcard>('Flashcard', FlashcardSchema)
export const UploadedDocument = mongoose.model<IUploadedDocument>('UploadedDocument', UploadedDocumentSchema)
