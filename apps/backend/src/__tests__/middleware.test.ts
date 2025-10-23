import request from 'supertest'
import express from 'express'
import mongoose from 'mongoose'
import session from 'express-session'
import MongoStore from 'connect-mongo'
import passport from 'passport'
import { isAuthenticated } from '../middleware/auth'
import { User } from '../models/User'
import { configurePassport } from '../config/passport'

// Create test app
const app = express()
app.use(express.json())

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

// Test route that requires authentication
app.get('/test-protected', isAuthenticated, (req: any, res) => {
  res.json({ message: 'Protected route accessed', user: req.user })
})

describe('Auth Middleware', () => {
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

  test('should allow access to protected route when authenticated', async () => {
    // Create a test user
    const user = new User({
      name: 'Test User',
      email: 'test@example.com',
      passwordHash: 'password123'
    })
    await user.save()

    // Login to create session
    const agent = request.agent(app)
    await agent
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      })

    // Access protected route
    const response = await agent
      .get('/test-protected')
      .expect(200)

    expect(response.body.message).toBe('Protected route accessed')
    expect(response.body.user).toBeDefined()
  })

  test('should deny access to protected route when not authenticated', async () => {
    const response = await request(app)
      .get('/test-protected')
      .expect(401)

    expect(response.body.error).toBe('Authentication required')
  })
})
