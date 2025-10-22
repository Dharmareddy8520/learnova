import mongoose, { Schema, Document } from 'mongoose';

// Define the interface for the Quiz document
export interface IQuiz extends Document {
  title: string;
  description: string;
  questions: Array<{
    question: string;
    options: string[];
    correctAnswer: string;
  }>;
  createdAt: Date;
}

// Define the schema for the Quiz model
const QuizSchema: Schema = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  questions: [
    {
      question: { type: String, required: true },
      options: { type: [String], required: true },
      correctAnswer: { type: String, required: true },
    },
  ],
  createdAt: { type: Date, default: Date.now },
});

// Create and export the Quiz model
const Quiz = mongoose.model<IQuiz>('Quiz', QuizSchema);
export default Quiz;