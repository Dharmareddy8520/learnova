import { generateWithGemini } from '../services/gemini'

// Mock fetch globally
global.fetch = jest.fn()

describe('Gemini Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Set required env var for tests
    process.env.GEMINI_API_KEY = 'test-api-key'
  })

  afterEach(() => {
    delete process.env.GEMINI_API_KEY
  })

  describe('generateWithGemini', () => {
    it('should throw error when GEMINI_API_KEY is not configured', async () => {
      delete process.env.GEMINI_API_KEY
      
      await expect(
        generateWithGemini('models/gemini-2.5-pro', 'test prompt')
      ).rejects.toThrow('GEMINI_API_KEY not configured')
    })

    it('should make correct API request with default parameters', async () => {
      const mockResponse = {
        candidates: [{ content: 'Generated text response' }]
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await generateWithGemini('models/gemini-2.5-pro', 'test prompt')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://generativelanguage.googleapis.com/v1beta2/models/models/gemini-2.5-pro:generateText'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: { text: 'test prompt' },
            temperature: 0.7,
            maxOutputTokens: 600
          })
        })
      )

      expect(result).toBe('Generated text response')
    })

    it('should make correct API request with custom parameters', async () => {
      const mockResponse = {
        candidates: [{ content: 'Custom response' }]
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      await generateWithGemini('models/gemini-2.5-pro', 'custom prompt', 1000, 0.5)

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            prompt: { text: 'custom prompt' },
            temperature: 0.5,
            maxOutputTokens: 1000
          })
        })
      )
    })

    it('should handle response with candidates array', async () => {
      const mockResponse = {
        candidates: [{ content: 'Response from candidates' }]
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await generateWithGemini('models/gemini-2.5-pro', 'test')
      expect(result).toBe('Response from candidates')
    })

    it('should handle response with output array', async () => {
      const mockResponse = {
        output: [{ content: 'Response from output' }]
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await generateWithGemini('models/gemini-2.5-pro', 'test')
      expect(result).toBe('Response from output')
    })

    it('should return stringified data when structure is unknown', async () => {
      const mockResponse = {
        unknownField: 'some data'
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await generateWithGemini('models/gemini-2.5-pro', 'test')
      expect(result).toBe(JSON.stringify(mockResponse))
    })

    it('should throw error on non-ok response', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => 'Invalid API key'
      })

      await expect(
        generateWithGemini('models/gemini-2.5-pro', 'test')
      ).rejects.toThrow('Gemini 401 Unauthorized - Invalid API key')
    })

    it('should handle fetch errors gracefully', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      await expect(
        generateWithGemini('models/gemini-2.5-pro', 'test')
      ).rejects.toThrow('Network error')
    })

    it('should handle invalid JSON response', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => { throw new Error('Invalid JSON') }
      })

      const result = await generateWithGemini('models/gemini-2.5-pro', 'test')
      expect(result).toBe('null')
    })
  })
})
