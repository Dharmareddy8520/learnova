import mongoose, { Schema, Document } from 'mongoose'

export interface IFolder extends Document {
  userId: mongoose.Types.ObjectId
  name: string
  description?: string
  color?: string // Optional color for UI
  cardIds: mongoose.Types.ObjectId[] // Array of card IDs in this folder
  createdAt: Date
  updatedAt: Date
}

const folderSchema = new Schema<IFolder>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    color: { type: String, default: 'bg-blue-100' }, // Tailwind color class
    cardIds: [{ type: Schema.Types.ObjectId, ref: 'PersonalCard', default: [] }],
  },
  { timestamps: true }
)

export const Folder = mongoose.model<IFolder>('Folder', folderSchema)
