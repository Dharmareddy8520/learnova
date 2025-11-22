import mongoose, { Document, Schema } from 'mongoose'

export interface IPersonalCard extends Document {
  userId?: string | null
  title: string
  type: 'summary' | 'quiz' | 'flashcards' | 'qa' | 'upload' | string
  content: any
  sourceFileId?: string | null
  metadata?: Record<string, any>
  folderId?: string | null
  createdAt: Date
  updatedAt: Date
}

const PersonalCardSchema = new Schema<IPersonalCard>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: false },
  title: { type: String, required: true },
  type: { type: String, required: true, default: 'summary' },
  content: { type: Schema.Types.Mixed, required: true },
  sourceFileId: { type: String, default: '' },
  metadata: { type: Schema.Types.Mixed, default: {} },
  folderId: { type: Schema.Types.ObjectId, ref: 'Folder', default: null },
}, { timestamps: true })

export const PersonalCard = mongoose.model<IPersonalCard>('PersonalCard', PersonalCardSchema)
