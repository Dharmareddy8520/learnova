import request from 'supertest'
import express from 'express'
import mongoose from 'mongoose'
import session from 'express-session'
import MongoStore from 'connect-mongo'
import passport from 'passport'
import authRoutes from '../routes/auth'
import { User } from '../models/User'
import { configurePassport } from '../config/passport'

// Create test app
const app = express()
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Mock session store for testing
app.use(session({
  secret: 'test-secret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI || 'mongodb://localhost:27017/learnova-test',
    touchAfter: 24 * 3600
  }),
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7
  }
}))

app.use(passport.initialize())
app.use(passport.session())
configurePassport()

app.use('/api/auth', authRoutes)

describe('Auth Routes', () => {
  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/learnova-test')
  })

  beforeEach(async () => {
    // Clean up users collection before each test
    await User.deleteMany({})
  })

  afterAll(async () => {
    // Clean up and close connection
    await User.deleteMany({})
    await mongoose.connection.close()
  })

  describe('POST /api/auth/register', () => {
    test('should register a new user successfully', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      }

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.user.name).toBe(userData.name)
      expect(response.body.user.email).toBe(userData.email)
      expect(response.body.user.passwordHash).toBeUndefined() // Should not return password
    })

    test('should fail with invalid email', async () => {
      const userData = {
        name: 'Test User',
        email: 'invalid-email',
        password: 'password123'
      }

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400)

      expect(response.body.error).toBe('Validation failed')
    })

    test('should fail with short password', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: '123'
      }

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400)

      expect(response.body.error).toBe('Validation failed')
    })

    test('should fail with duplicate email', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      }

      // Register first user
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(200)

      // Try to register with same email
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400)

      expect(response.body.error).toBe('User already exists with this email')
    })
  })

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create a test user
      const user = new User({
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: 'password123' // Will be hashed by pre-save middleware
      })
      await user.save()
    })

    test('should login with valid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      }

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.user.email).toBe(loginData.email)
    })

    test('should fail with invalid email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'password123'
      }

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401)

      expect(response.body.error).toBe('Invalid email or password')
    })

    test('should fail with invalid password', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword'
      }

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401)

      expect(response.body.error).toBe('Invalid email or password')
    })
  })
})
