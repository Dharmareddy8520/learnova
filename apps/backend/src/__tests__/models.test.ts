import mongoose from 'mongoose';
import { User } from '../models/User';
import { Feedback } from '../models/Feedback';
import SavedContent from '../models/SavedContent';
import { UsageEvent } from '../models/UsageEvent';

describe('Models', () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/learnova-test');
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('User Model', () => {
    beforeEach(async () => {
      await User.deleteMany({});
    });

    test('should create a user successfully', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: 'password123'
      };

      const user = new User(userData);
      await user.save();

      expect(user._id).toBeDefined();
      expect(user.name).toBe(userData.name);
      expect(user.email).toBe(userData.email);
      expect(user.role).toBe('free');
      expect(user.consecutiveDays).toBe(0);
    });

    test('should hash password before saving', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: 'password123'
      };

      const user = new User(userData);
      await user.save();

      expect(user.passwordHash).not.toBe('password123');
      expect(user.passwordHash.length).toBeGreaterThan(20);
    });

    test('should compare password correctly', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: 'password123'
      };

      const user = new User(userData);
      await user.save();

      const isMatch = await user.comparePassword('password123');
      expect(isMatch).toBe(true);

      const isNotMatch = await user.comparePassword('wrongpassword');
      expect(isNotMatch).toBe(false);
    });

    test('should require email to be unique', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: 'password123'
      };

      const user1 = new User(userData);
      await user1.save();

      const user2 = new User(userData);
      await expect(user2.save()).rejects.toThrow();
    });

    test('should set default values correctly', async () => {
      const user = new User({
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: 'password123'
      });
      await user.save();

      expect(user.role).toBe('free');
      expect(user.consecutiveDays).toBe(0);
      expect(user.avatarUrl).toBe('');
      expect(user.startedAt).toBeDefined();
      expect(user.lastActiveAt).toBeDefined();
    });
  });

  describe('Feedback Model', () => {
    beforeEach(async () => {
      await Feedback.deleteMany({});
    });

    test('should create feedback successfully', async () => {
      const feedbackData = {
        name: 'Test User',
        email: 'test@example.com',
        rating: 5,
        review: 'Great app!',
        isAnonymous: false
      };

      const feedback = new Feedback(feedbackData);
      await feedback.save();

      expect(feedback._id).toBeDefined();
      expect(feedback.name).toBe(feedbackData.name);
      expect(feedback.rating).toBe(feedbackData.rating);
      expect(feedback.review).toBe(feedbackData.review);
    });

    test('should validate rating range', async () => {
      const invalidFeedback = new Feedback({
        name: 'Test User',
        email: 'test@example.com',
        rating: 6,
        review: 'Test review'
      });

      await expect(invalidFeedback.save()).rejects.toThrow();
    });

    test('should require all mandatory fields', async () => {
      const incompleteFeedback = new Feedback({
        name: 'Test User'
      });

      await expect(incompleteFeedback.save()).rejects.toThrow();
    });

    test('should handle anonymous feedback', async () => {
      const feedback = new Feedback({
        name: 'Anonymous',
        email: 'anonymous@learnova.com',
        rating: 4,
        review: 'Good service',
        isAnonymous: true
      });

      await feedback.save();
      expect(feedback.isAnonymous).toBe(true);
    });

    test('should enforce max length on review', async () => {
      const longReview = 'a'.repeat(501);
      const feedback = new Feedback({
        name: 'Test User',
        email: 'test@example.com',
        rating: 5,
        review: longReview
      });

      await expect(feedback.save()).rejects.toThrow();
    });
  });

  describe('SavedContent Model', () => {
    beforeEach(async () => {
      await SavedContent.deleteMany({});
    });

    test('should create saved summary', async () => {
      const content = new SavedContent({
        userId: new mongoose.Types.ObjectId().toString(),
        type: 'summary',
        title: 'Test Summary',
        content: { text: 'Summary text', summary: 'Short summary' }
      });

      await content.save();
      expect(content._id).toBeDefined();
      expect(content.type).toBe('summary');
    });

    test('should create saved quiz', async () => {
      const content = new SavedContent({
        userId: new mongoose.Types.ObjectId().toString(),
        type: 'quiz',
        title: 'Test Quiz',
        content: {
          questions: [
            {
              question: 'What is 2+2?',
              options: ['3', '4', '5', '6'],
              correctAnswer: 1
            }
          ]
        }
      });

      await content.save();
      expect(content.type).toBe('quiz');
    });

    test('should create saved flashcard', async () => {
      const content = new SavedContent({
        userId: new mongoose.Types.ObjectId().toString(),
        type: 'flashcard',
        title: 'Test Flashcards',
        content: {
          cards: [
            { front: 'Question', back: 'Answer' }
          ]
        }
      });

      await content.save();
      expect(content.type).toBe('flashcard');
    });

    test('should validate content type', async () => {
      const content = new SavedContent({
        userId: new mongoose.Types.ObjectId().toString(),
        type: 'invalid' as any,
        title: 'Test',
        content: {}
      });

      await expect(content.save()).rejects.toThrow();
    });
  });

  describe('UsageEvent Model', () => {
    beforeEach(async () => {
      await UsageEvent.deleteMany({});
    });

    test('should create usage event', async () => {
      const event = new UsageEvent({
        userId: new mongoose.Types.ObjectId().toString(),
        feature: 'summarize',
        ip: '127.0.0.1'
      });

      await event.save();
      expect(event._id).toBeDefined();
      expect(event.feature).toBe('summarize');
    });

    test('should require feature field', async () => {
      const event = new UsageEvent({
        userId: new mongoose.Types.ObjectId().toString()
      } as any);

      await expect(event.save()).rejects.toThrow();
    });

    test('should allow optional userId and ip', async () => {
      const event = new UsageEvent({
        feature: 'quiz'
      });

      await event.save();
      expect(event.feature).toBe('quiz');
      expect(event.userId).toBe('');
      expect(event.ip).toBe('');
    });
  });
});
