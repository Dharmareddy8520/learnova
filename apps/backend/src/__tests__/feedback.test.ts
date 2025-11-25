import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import feedbackRoutes from '../routes/feedback';
import { Feedback } from '../models/Feedback';

const app = express();
app.use(express.json());
app.use('/api', feedbackRoutes);

describe('Feedback Routes', () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/learnova-test');
  });

  beforeEach(async () => {
    await Feedback.deleteMany({});
  });

  afterAll(async () => {
    await Feedback.deleteMany({});
    await mongoose.connection.close();
  });

  describe('POST /api/feedback', () => {
    test('should submit feedback successfully', async () => {
      const feedbackData = {
        name: 'John Doe',
        email: 'john@example.com',
        rating: 5,
        review: 'Great platform for learning!',
        isAnonymous: false
      };

      const response = await request(app)
        .post('/api/feedback')
        .send(feedbackData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Thank you for your feedback!');
      expect(response.body.feedback.rating).toBe(5);
    });

    test('should submit anonymous feedback', async () => {
      const feedbackData = {
        name: 'Anonymous',
        email: 'anonymous@learnova.com',
        rating: 4,
        review: 'Good service',
        isAnonymous: true
      };

      const response = await request(app)
        .post('/api/feedback')
        .send(feedbackData)
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    test('should fail without required fields', async () => {
      const response = await request(app)
        .post('/api/feedback')
        .send({ name: 'Test' })
        .expect(400);

      expect(response.body.error).toContain('required fields');
    });

    test('should fail with invalid rating', async () => {
      const feedbackData = {
        name: 'John Doe',
        email: 'john@example.com',
        rating: 6,
        review: 'Test review'
      };

      const response = await request(app)
        .post('/api/feedback')
        .send(feedbackData)
        .expect(400);

      expect(response.body.error).toContain('Rating must be between 1 and 5');
    });

    test('should fail with too long review', async () => {
      const feedbackData = {
        name: 'John Doe',
        email: 'john@example.com',
        rating: 5,
        review: 'a'.repeat(501)
      };

      const response = await request(app)
        .post('/api/feedback')
        .send(feedbackData)
        .expect(400);

      expect(response.body.error).toContain('500 characters');
    });
  });

  describe('GET /api/feedback/stats', () => {
    test('should return statistics', async () => {
      // Create some test feedback
      await Feedback.create([
        { name: 'User1', email: 'user1@test.com', rating: 5, review: 'Great!' },
        { name: 'User2', email: 'user2@test.com', rating: 4, review: 'Good' },
        { name: 'User3', email: 'user3@test.com', rating: 5, review: 'Excellent' }
      ]);

      const response = await request(app)
        .get('/api/feedback/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.statistics.totalReviews).toBe(3);
      expect(response.body.statistics.averageRating).toBeGreaterThan(4);
    });

    test('should return zero stats when no feedback', async () => {
      const response = await request(app)
        .get('/api/feedback/stats')
        .expect(200);

      expect(response.body.statistics.totalReviews).toBe(0);
      expect(response.body.statistics.averageRating).toBe(0);
    });
  });

  describe('GET /api/feedback/recent', () => {
    test('should return recent feedback', async () => {
      // Create test feedback
      await Feedback.create([
        { name: 'User1', email: 'user1@test.com', rating: 5, review: 'Great!' },
        { name: 'User2', email: 'user2@test.com', rating: 4, review: 'Good' }
      ]);

      const response = await request(app)
        .get('/api/feedback/recent')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.feedbacks)).toBe(true);
      expect(response.body.feedbacks.length).toBeLessThanOrEqual(6);
    });

    test('should respect limit parameter', async () => {
      // Create test feedback
      await Feedback.create([
        { name: 'User1', email: 'user1@test.com', rating: 5, review: 'Great!' },
        { name: 'User2', email: 'user2@test.com', rating: 4, review: 'Good' },
        { name: 'User3', email: 'user3@test.com', rating: 5, review: 'Excellent' }
      ]);

      const response = await request(app)
        .get('/api/feedback/recent?limit=2')
        .expect(200);

      expect(response.body.feedbacks.length).toBe(2);
    });
  });
});
