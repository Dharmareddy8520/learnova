import mongoose, { Document, Schema } from 'mongoose'

export interface IUsageEvent extends Document {
  ip?: string
  feature: string
  createdAt: Date
  userId?: string
}

const UsageEventSchema = new Schema<IUsageEvent>({
  ip: { type: String, default: '' },
  feature: { type: String, required: true },
  userId: { type: String, default: '' },
}, { timestamps: { createdAt: 'createdAt', updatedAt: false } })

export const UsageEvent = mongoose.model<IUsageEvent>('UsageEvent', UsageEventSchema)
