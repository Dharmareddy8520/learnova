// src/pages/ChallengeCreate.tsx
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import { Copy, Play } from 'lucide-react'
import AppSidebar from '../components/AppSidebar'

type Question = {
  question: string
  choices: string[]
  answerIndex: number
}

type ChallengePlayer = {
  userId: string
  nickname: string
  role: 'organizer' | 'participant'
  joinedAt: number
  score: number
  totalTimeMs: number
  currentQuestionIndex?: number // Each player has their own progress
}

type ChallengeQuestion = Question & { id: string }

type ChallengeAnswer = {
  option: string | null
  timestamp: number
  isCorrect?: boolean
  deltaScore?: number
  totalScore?: number
}

type Challenge = {
  active: boolean
  state: 'lobby' | 'in_progress' | 'ended'
  id: string
  hostUserId: string
  joinCode: string
  players: ChallengePlayer[]
  questionIds: string[]
  currentIndex: number
  answers: Record<string, ChallengeAnswer>
  events: any[]
  startAt: number
  countdownSeconds: number
  createdAtServer?: number // Server timestamp when challenge was created
  quizStartAtServer?: number // Server timestamp when quiz actually started
}

const ui = {
  field:
    'relative border border-transparent rounded-xl px-4 pt-5 pb-2 bg-white shadow-sm hover:shadow-md focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-300 transition-all',
  label:
    'absolute -top-2 left-3 bg-white px-1 text-xs font-semibold text-indigo-600',
  input:
    'w-full border-none bg-transparent focus:outline-none focus:ring-0 text-gray-800 placeholder-gray-400',
  textarea:
    'w-full border-none bg-transparent focus:outline-none focus:ring-0 text-gray-800 placeholder-gray-400 resize-none',
  select:
    'w-full border-none bg-transparent focus:outline-none focus:ring-0 text-gray-800',
  btn: 'inline-flex items-center gap-2 rounded-xl font-semibold transition focus:outline-none focus:ring-2 focus:ring-indigo-500',
  primary:
    'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 shadow-md',
  ghost:
    'bg-white text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50 shadow-sm',
}

const ChallengeCreate = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = new URL(window.location.href)
  const joinCode = location.searchParams.get('join')
  
  console.log('🔍 Component mounted:', {
    fullURL: window.location.href,
    joinCodeParsed: joinCode,
    searchParams: Object.fromEntries(location.searchParams.entries())
  })

  // Helper function to get current time in Central Standard Time (CST)
  const getCSTTime = () => {
    const now = new Date()
    // Convert to CST (UTC-6, or UTC-5 during daylight saving)
    const cstTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Chicago' }))
    return cstTime
  }

  // Helper function to format CST time for datetime input
  const formatCSTForInput = (date: Date) => {
    const cstDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/Chicago' }))
    const year = cstDate.getFullYear()
    const month = String(cstDate.getMonth() + 1).padStart(2, '0')
    const day = String(cstDate.getDate()).padStart(2, '0')
    const hours = String(cstDate.getHours()).padStart(2, '0')
    const minutes = String(cstDate.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  // Form state
  const [formData, setFormData] = useState({
    text: '',
    numQuestions: 5,
    difficulty: 'medium',
    startTime: formatCSTForInput(new Date(getCSTTime().getTime() + 5 * 60 * 1000)),
  })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Helper function to convert CST datetime input to UTC timestamp
  const convertCSTToUTCTimestamp = (cstDateTimeString: string) => {
    // Input format: "2025-11-20T15:30" (CST/CDT)
    // Parse as CST and convert to proper timestamp
    const [datePart, timePart] = cstDateTimeString.split('T')
    const [year, month, day] = datePart.split('-')
    const [hours, minutes] = timePart.split(':')
    
    // Create a date string that will be interpreted as CST
    const cstDateString = `${month}/${day}/${year} ${hours}:${minutes}:00`
    const cstDate = new Date(cstDateString)
    
    // Get the CST version of this date
    const cstAsUTC = new Date(cstDate.toLocaleString('en-US', { timeZone: 'America/Chicago' }))
    const offset = cstDate.getTime() - cstAsUTC.getTime()
    
    return cstDate.getTime() + offset
  }

  // Challenge state
  const [challenge, setChallenge] = useState<Challenge>({
    active: false,
    state: 'lobby',
    id: '',
    hostUserId: user?.id || 'guest',
    joinCode: '',
    players: [],
    questionIds: [],
    currentIndex: 0,
    answers: {},
    events: [],
    startAt: 0,
    countdownSeconds: 0,
  })
  const [internalQuestions, setInternalQuestions] = useState<ChallengeQuestion[]>([])
  const [selectedOption, setSelectedOption] = useState<string | null>(null) // Track currently selected option
  const [leaderboard, setLeaderboard] = useState<any[]>([]) // Store leaderboard data
  const [lobbyRemaining, setLobbyRemaining] = useState<number | null>(null)
  const [timeRemaining, setTimeRemaining] = useState<number>(20)
  const [questionStart, setQuestionStart] = useState<number>(0)
  const [quizStartTime, setQuizStartTime] = useState<number>(0) // When quiz transitioned to in_progress
  const [totalQuizTimeRemaining, setTotalQuizTimeRemaining] = useState<number>(0) // Total time for entire quiz
  // Get server time once and cache it with a reference point
  const [serverTimeRef, setServerTimeRef] = useState<{ serverTime: number; clientTime: number } | null>(null)

  useEffect(() => {
    // Fetch server time on mount and every 60 seconds for validation
    const getServerTime = async () => {
      try {
        const response = await axios.get('/api/server-time')
        const serverTime = response.data.timestamp
        const clientTime = Date.now()
        setServerTimeRef({ serverTime, clientTime })
      } catch (err) {
        console.error('Failed to sync server time:', err)
      }
    }

    getServerTime()
    const interval = setInterval(getServerTime, 60000) // Re-sync every 60 seconds
    return () => clearInterval(interval)
  }, [])

  // Helper function to get current server time based on initial sync + elapsed client time
  const getServerTime = () => {
    if (!serverTimeRef) return Date.now() // Fallback if sync hasn't happened yet
    const clientElapsed = Date.now() - serverTimeRef.clientTime
    return serverTimeRef.serverTime + clientElapsed
  }

  // Load challenge from server when joining via code (with localStorage fallback)
  useEffect(() => {
    if (joinCode && !challenge.active) {
      const loadChallenge = async () => {
        try {
          // Try to fetch from server first
          const response = await axios.get(`/api/challenge/${joinCode}`)
          const serverChallenge = response.data
          
          // Extract server questions and challenge data
          const serverQuestions = serverChallenge.questions || []
          setChallenge((prev) => ({
            ...prev,
            ...serverChallenge,
            active: true,
            state: prev.state || serverChallenge.state || 'lobby',
          }))
          
          if (serverQuestions.length > 0) {
            setInternalQuestions(serverQuestions)
          }
          
          // Store in localStorage for offline access
          localStorage.setItem(`challenge-${joinCode}`, JSON.stringify(serverChallenge))
          localStorage.setItem(`challenge-questions-${joinCode}`, JSON.stringify(serverQuestions))
        } catch (serverErr: any) {
          console.warn('Failed to load from server, trying localStorage:', serverErr)
          
          // Fallback to localStorage
          const stored = localStorage.getItem(`challenge-${joinCode}`)
          if (stored) {
            try {
              const data = JSON.parse(stored)
              setChallenge((prev) => ({ ...prev, ...data, active: true }))
              
              const questionsStored = localStorage.getItem(`challenge-questions-${joinCode}`)
              if (questionsStored) {
                setInternalQuestions(JSON.parse(questionsStored))
              }
            } catch (err) {
              console.error('Failed to load challenge from localStorage:', err)
              setError('Failed to load challenge from code')
            }
          } else {
            setError('Challenge not found')
          }
        }
      }
      
      loadChallenge()
    }
  }, [joinCode])

  // Sync challenge state from server (poll every 2 seconds for updates)
  useEffect(() => {
    if (!challenge.joinCode || !challenge.active) return

    const interval = setInterval(async () => {
      try {
        const response = await axios.get(`/api/challenge/${challenge.joinCode}`)
        const serverChallenge = response.data
        
        // Check if quiz just started (state changed to in_progress)
        const justStarted = challenge.state !== 'in_progress' && serverChallenge.state === 'in_progress'
        
        setChallenge((prev) => ({
          ...prev,
          state: serverChallenge.state,
          startAt: serverChallenge.startAt,
          participants: serverChallenge.participants || prev.players,
          players: serverChallenge.participants || prev.players,
        }))

        // Initialize quiz timers when quiz starts
        if (justStarted && serverChallenge.quizStartedAt) {
          const now = getServerTime()
          const totalSeconds = timeLimit * (serverChallenge.questions?.length || internalQuestions.length || 1)
          setQuizStartTime(serverChallenge.quizStartedAt)
          setTotalQuizTimeRemaining(totalSeconds)
          setQuestionStart(now)
          setTimeRemaining(timeLimit)
        }

        // Update questions if received from server
        if (serverChallenge.questions && serverChallenge.questions.length > 0) {
          console.log('📝 Received questions from server:', serverChallenge.questions.length, 'questions')
          setInternalQuestions(serverChallenge.questions)
          setChallenge(prev => ({
            ...prev,
            questionIds: serverChallenge.questions.map((q: any) => q.id),
          }))
        } else {
          console.log('⚠️ No questions in server response')
        }
      } catch (err) {
        // Silently ignore errors during polling
        console.debug('Poll error:', err)
      }
    }, 2000) // Poll every 2 seconds

    return () => clearInterval(interval)
  }, [challenge.joinCode, challenge.active])

  // Fetch leaderboard when quiz ends
  useEffect(() => {
    if (challenge.state === 'ended' && challenge.joinCode && leaderboard.length === 0) {
      const fetchLeaderboard = async () => {
        try {
          console.log('🏆 Fetching final leaderboard...')
          const response = await axios.get(`/api/challenge/${challenge.joinCode}/leaderboard`)
          if (response.data.available) {
            console.log('✅ Leaderboard received:', response.data.leaderboard)
            setLeaderboard(response.data.leaderboard)
            // Also update challenge players with leaderboard data
            setChallenge(prev => ({
              ...prev,
              players: response.data.leaderboard
            }))
          } else {
            console.log('⏳ Leaderboard not ready yet:', response.data.message)
          }
        } catch (err) {
          console.error('❌ Failed to fetch leaderboard:', err)
        }
      }
      fetchLeaderboard()
    }
  }, [challenge.state, challenge.joinCode, leaderboard.length])

  const timeLimit = 20

  // Get current player's question index
  const userIdKey = user?.id || 'guest'
  const currentPlayerProgress = useMemo(() => {
    const currentPlayer = challenge.players.find((p) => p.userId === userIdKey)
    return currentPlayer?.currentQuestionIndex ?? challenge.currentIndex ?? 0
  }, [challenge.players, challenge.currentIndex, userIdKey])

  const currentQuestion = useMemo(() => {
    if (challenge.state !== 'in_progress') return null
    const qid = challenge.questionIds[currentPlayerProgress]
    const question = internalQuestions.find((q) => q.id === qid) || null
    console.log('🎯 Current question lookup:', {
      state: challenge.state,
      currentPlayerProgress,
      questionId: qid,
      totalInternalQuestions: internalQuestions.length,
      totalQuestionIds: challenge.questionIds.length,
      found: !!question
    })
    return question
  }, [challenge.state, currentPlayerProgress, internalQuestions, challenge.questionIds])

  // Check if current player has finished all questions
  const hasPlayerFinishedAllQuestions = useMemo(() => {
    return currentPlayerProgress >= challenge.questionIds.length
  }, [currentPlayerProgress, challenge.questionIds.length])

  // Handlers
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      // Validate text is not empty
      if (!formData.text?.trim()) {
        setError('Please enter text to generate quiz questions')
        setIsLoading(false)
        return
      }

      // 1. Calculate delay in seconds from form input
      const startTimestamp = convertCSTToUTCTimestamp(formData.startTime)
      const now = getServerTime() // Use server time
      const delaySeconds = Math.max(0, Math.floor((startTimestamp - now) / 1000))

      // 2. Create challenge on server - server generates questions and calculates startAt
      const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase()

      console.log('🚀 Creating challenge with:', {
        joinCode,
        delaySeconds,
        textLength: formData.text.length,
        numQuestions: Number(formData.numQuestions),
        difficulty: formData.difficulty,
      })

      const challengeResponse = await axios.post('/api/challenge/create', {
        joinCode,
        delaySeconds, // Server calculates exact startAt from this
        text: formData.text,
        numQuestions: Number(formData.numQuestions),
        difficulty: formData.difficulty,
      })

      const serverChallenge = challengeResponse.data.challenge
      const serverQuestions = serverChallenge.questions || []
      
      const organizer: ChallengePlayer = {
        userId: user?.id || 'guest',
        nickname: (user as any)?.name || 'Organizer',
        role: 'organizer',
        joinedAt: now,
        score: 0,
        totalTimeMs: 0,
      }

      setChallenge((prev) => ({
        ...prev,
        active: true,
        state: 'lobby',
        id: `challenge-${Date.now()}`,
        joinCode,
        players: [organizer],
        questionIds: serverQuestions.map((q: any) => q.id),
        startAt: serverChallenge.startAt, // Use server-calculated startAt
        countdownSeconds: delaySeconds,
      }))
      setInternalQuestions(serverQuestions)
      
      console.log('✅ Challenge created successfully with', serverQuestions.length, 'questions')
    } catch (err: any) {
      const errorMessage = err?.response?.data?.error || err?.message || 'Failed to create challenge'
      console.error('❌ Challenge creation failed:', errorMessage)
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  // Persist challenge to localStorage whenever it changes
  useEffect(() => {
    if (challenge.active && challenge.joinCode) {
      localStorage.setItem(`challenge-${challenge.joinCode}`, JSON.stringify(challenge))
      localStorage.setItem(`challenge-questions-${challenge.joinCode}`, JSON.stringify(internalQuestions))
    }
  }, [challenge, internalQuestions])

  // Countdown effect
  useEffect(() => {
    if (challenge.state !== 'lobby' || !challenge.active) {
      setLobbyRemaining(null)
      return
    }

    const startAt = challenge.startAt
    if (!startAt || startAt <= 0) {
      setLobbyRemaining(null)
      return
    }

    const interval = setInterval(async () => {
      const now = getServerTime() // Use server time
      const remaining = Math.max(0, Math.floor((startAt - now) / 1000))
      setLobbyRemaining(remaining)

      // Auto-start when countdown reaches 0 (only organizer triggers this)
      const currentUserId = user?.id || 'guest'
      const currentPlayer = challenge.players.find(p => p.userId === currentUserId)
      const isOrganizer = currentPlayer?.role === 'organizer'
      
      if (remaining === 0 && isOrganizer) {
        console.log('⏰ Countdown reached 0, organizer auto-starting quiz...')
        try {
          // Update state on server
          const response = await axios.patch(`/api/challenge/${challenge.joinCode}/state`, {
            state: 'in_progress',
          })
          console.log('✅ Quiz state updated to in_progress on server')
          
          const now = getServerTime()
          const totalSeconds = timeLimit * (internalQuestions.length || 1)
          setQuizStartTime(response.data.quizStartedAt || now)
          setTotalQuizTimeRemaining(totalSeconds)
          setQuestionStart(now)
          setTimeRemaining(timeLimit)
        } catch (err) {
          console.error('❌ Failed to auto-start quiz:', err)
        }
      }
    }, 100)

    return () => clearInterval(interval)
  }, [challenge.state, challenge.active, challenge.startAt, challenge.joinCode, challenge.players])

  // Global quiz timer - display remaining time only (server controls when quiz ends)
  useEffect(() => {
    if (challenge.state !== 'in_progress' || quizStartTime === 0) return

    const interval = setInterval(() => {
      const now = getServerTime()
      const elapsed = Math.floor((now - quizStartTime) / 1000)
      const remaining = Math.max(0, totalQuizTimeRemaining - elapsed)
      
      setTotalQuizTimeRemaining(remaining)
      // Don't end quiz locally - server will update state via polling
    }, 100)

    return () => clearInterval(interval)
  }, [challenge.state, quizStartTime, totalQuizTimeRemaining])

  // Question timer effect
  useEffect(() => {
    if (challenge.state !== 'in_progress') return
    if (timeRemaining <= 0) {
      moveToNextQuestion()
      return
    }
    const timer = setTimeout(() => setTimeRemaining((t) => t - 1), 1000)
    return () => clearTimeout(timer)
  }, [challenge.state, timeRemaining])

  // Handlers
  const copyToClipboard = (text: string) => {
    try {
      navigator.clipboard.writeText(text)
    } catch (e) {
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
  }

  const startChallengeNow = () => {
    const now = getServerTime() // Use server time
    const totalSeconds = timeLimit * (internalQuestions.length || 1) // 20 seconds per question
    setChallenge((prev) => ({ ...prev, state: 'in_progress', currentIndex: 0 }))
    setQuizStartTime(now)
    setTotalQuizTimeRemaining(totalSeconds)
    setQuestionStart(now)
    setTimeRemaining(timeLimit)
  }

  const answerQuestion = async (option: string) => {
    if (!internalQuestions[currentPlayerProgress]) return
    const qid = challenge.questionIds[currentPlayerProgress]
    if (challenge.answers[qid]) return // Already answered

    const ts = getServerTime() // Use server time
    const elapsedMs = ts - questionStart
    const answerIndex = option.charCodeAt(0) - 65 // Convert A,B,C,D to 0,1,2,3

    try {
      // Submit answer to server
      const userId = user?.id || 'guest'
      const response = await axios.post(`/api/challenge/${challenge.joinCode}/answer`, {
        userId,
        questionId: qid,
        answer: answerIndex,
        timeMs: elapsedMs,
      })

      if (response.data.success) {
        const { score, totalScore, isCorrect, currentQuestionIndex, hasFinished } = response.data
        
        // Update local state with server response
        setChallenge((prev) => {
          const players = prev.players.map((p) => {
            if (p.userId === userId) {
              return { 
                ...p, 
                score: totalScore, 
                totalTimeMs: p.totalTimeMs + elapsedMs,
                currentQuestionIndex,
              }
            }
            return p
          })
          return {
            ...prev,
            players,
            answers: { ...prev.answers, [qid]: { option, timestamp: ts, isCorrect, deltaScore: score } },
          }
        })

        // Move to next question if not finished
        if (!hasFinished) {
          setQuestionStart(getServerTime())
          setTimeRemaining(timeLimit)
        }
      }
    } catch (err) {
      console.error('Failed to submit answer:', err)
    }
  }

  const moveToNextQuestion = () => {
    const nextIndex = (challenge.currentIndex || 0) + 1
    const userIdKey = user?.id || 'guest'
    
    setChallenge((prev) => {
      // Update the current player's progress
      const players = prev.players.map((p) => {
        if (p.userId === userIdKey) {
          return { ...p, currentQuestionIndex: nextIndex }
        }
        return p
      })

      return {
        ...prev,
        currentIndex: nextIndex, // For shared view
        players,
      }
    })

    // Only reset timers if not at the end
    if (nextIndex < challenge.questionIds.length) {
      setQuestionStart(getServerTime())
      setTimeRemaining(timeLimit)
    }
    // If at the end, don't reset - show waiting screen
  }

  const cancelChallenge = () => {
    setChallenge((prev) => ({ ...prev, active: false }))
    navigate('/quiz-generator')
  }

  const handleJoinChallenge = async () => {
    if (!joinCode) return

    try {
      const userId = user?.id || `guest-${Math.random().toString(36).slice(2, 6)}`
      const nickname = (user as any)?.name || 'Guest'

      console.log('🎯 Attempting to join challenge:', {joinCode, userId, nickname})

      // Join via server endpoint
      const response = await axios.post(`/api/challenge/${joinCode}/join`, {
        userId,
        nickname,
      })

      console.log('✅ Join response:', response.data)

      if (response.data.success) {
        // Fetch updated challenge from server
        const challengeResponse = await axios.get(`/api/challenge/${joinCode}`)
        const serverChallenge = challengeResponse.data
        
        console.log('📊 Challenge data after join:', {
          participants: serverChallenge.participants?.length,
          state: serverChallenge.state,
          questions: serverChallenge.questions?.length
        })
        
        setChallenge((prev) => ({
          ...prev,
          active: true,
          state: serverChallenge.state || 'lobby',
          joinCode: joinCode,
          players: serverChallenge.participants || [],
          startAt: serverChallenge.startAt,
          questionIds: serverChallenge.questions?.map((q: any) => q.id) || [],
        }))

        if (serverChallenge.questions) {
          setInternalQuestions(serverChallenge.questions)
        }
      }
    } catch (err) {
      console.error('❌ Failed to join challenge:', err)
      setError('Failed to join challenge')
    }
  }

  // Auto-join if code is provided
  useEffect(() => {
    if (joinCode && !challenge.active) {
      handleJoinChallenge()
    }
  }, [joinCode])

  const header = useMemo(
    () => (
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold text-indigo-700">🎯 Create Quiz Challenge</h1>
        {challenge.active && (
          <button
            onClick={() => navigate('/quiz-generator')}
            className={`${ui.btn} ${ui.ghost} px-4 py-2`}
          >
            ← Back
          </button>
        )}
      </div>
    ),
    [challenge.active, navigate]
  )

  // Only show join interface if URL has join code but challenge isn't loaded
  if (joinCode && !challenge.active) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <AppSidebar />
        <main className="pt-14 pb-14 md:pt-0 md:pb-0 md:ml-64 px-4 md:px-8 flex items-center justify-center">
          <div className="max-w-md w-full bg-white rounded-lg p-8 shadow-lg text-center">
            <h1 className="text-3xl font-bold text-indigo-700 mb-4">⏳ Waiting for Quiz</h1>
            <p className="text-gray-600 mb-6">
              Waiting for the organizer to start the quiz challenge...
            </p>
            <div className="animate-spin h-12 w-12 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-6"></div>
            <p className="text-sm text-gray-500">Join Code: <span className="font-mono font-bold text-indigo-600">{joinCode}</span></p>
            <button
              onClick={() => navigate('/quiz-generator')}
              className={`${ui.btn} ${ui.ghost} w-full mt-8`}
            >
              ← Back to Generator
            </button>
          </div>
        </main>
      </div>
    )
  }

  if (!challenge.active) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppSidebar />
        <main className="pt-14 pb-14 md:pt-0 md:pb-0 md:ml-64 px-4 md:px-8">
          {header}

          <form
            onSubmit={handleSubmit}
            className="max-w-2xl space-y-6 rounded-2xl border border-gray-100 bg-white/70 backdrop-blur-sm p-8 shadow-md"
          >
            <div className={ui.field}>
              <label htmlFor="text" className={ui.label}>
                Source Text
              </label>
              <textarea
                id="text"
                name="text"
                value={formData.text}
                onChange={handleChange}
                rows={8}
                placeholder="Paste or write content for the quiz..."
                className={ui.textarea}
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className={ui.field}>
                <label htmlFor="numQuestions" className={ui.label}>
                  Number of Questions (1–25)
                </label>
                <input
                  id="numQuestions"
                  name="numQuestions"
                  type="number"
                  min={1}
                  max={25}
                  value={formData.numQuestions}
                  onChange={handleChange}
                  className={ui.input}
                />
              </div>

              <div className={ui.field}>
                <label htmlFor="difficulty" className={ui.label}>
                  Difficulty
                </label>
                <select
                  id="difficulty"
                  name="difficulty"
                  value={formData.difficulty}
                  onChange={handleChange}
                  className={ui.select}
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>

            <div className={ui.field}>
              <label htmlFor="startTime" className={ui.label}>
                Quiz Start Time (Central Standard Time - CST)
              </label>
              <input
                id="startTime"
                name="startTime"
                type="datetime-local"
                value={formData.startTime}
                onChange={handleChange}
                className={ui.input}
              />
              <p className="text-xs text-gray-500 mt-2">All participants will use CST as the reference time</p>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isLoading}
                className={`${ui.btn} ${ui.primary} px-8 py-3 text-white text-base`}
              >
                {isLoading ? '✨ Creating…' : '🎯 Create Challenge'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/quiz-generator')}
                className={`${ui.btn} ${ui.ghost} px-8 py-3`}
              >
                Cancel
              </button>
            </div>

            {error && <p className="text-red-600 font-semibold">{error}</p>}
          </form>
        </main>
      </div>
    )
  }

  // Challenge Lobby View
  return (
    <div className="min-h-screen bg-gray-50">
      <AppSidebar />
      <main className="pt-14 pb-14 md:pt-0 md:pb-0 md:ml-64 px-4 md:px-8">
        {header}

        {challenge.state === 'lobby' && (
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Countdown Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg p-8 shadow-lg">
            <div className="flex items-start justify-between gap-6">
              <div className="flex-1">
                <h2 className="text-4xl font-bold mb-2">Quiz Challenge Ready</h2>
                <p className="text-indigo-100">Share the link below. Quiz will start at scheduled time.</p>
              </div>
              <div className="text-center">
                <div className="text-5xl font-bold text-white mb-2">
                  {lobbyRemaining !== null ? Math.ceil(lobbyRemaining / 60) : '—'}
                </div>
                <div className="text-sm text-indigo-100">minutes until start</div>
              </div>
            </div>
          </div>

          {/* Invitation Card */}
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-lg p-8 shadow-lg border-2 border-indigo-200">
            <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              📧 Invite Participants
            </h3>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-3 uppercase tracking-wide">
                  🔐 Share Join Code
                </label>
                <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg p-6 text-center shadow-md">
                  <p className="text-blue-100 text-sm font-semibold mb-3">Enter this code at /quiz-generator:</p>
                  <div className="font-mono text-5xl font-bold text-white tracking-widest bg-blue-800 rounded-lg py-5 px-8 inline-block mb-4">
                    {challenge.joinCode}
                  </div>
                  <button
                    onClick={() => copyToClipboard(challenge.joinCode)}
                    className="mt-3 bg-white text-blue-700 px-6 py-3 rounded-lg font-bold text-base hover:bg-blue-50 transition-colors"
                  >
                    <Copy className="h-4 w-4 inline mr-2" />
                    Copy Code
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Participants Card */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-8 shadow-md border border-indigo-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                👥 Participants
                <span className="ml-4 px-4 py-2 bg-indigo-600 text-white font-bold rounded-full text-lg">
                  {challenge.players.length}
                </span>
              </h3>
              <div className="text-right">
                <p className="text-sm text-gray-600">Capacity: {challenge.players.length} / 25</p>
                <div className="mt-2 w-48 h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-3 bg-gradient-to-r from-indigo-500 to-purple-500 transition-all"
                    style={{ width: `${Math.min((challenge.players.length / 25) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {challenge.players.map((p, idx) => (
                <div
                  key={p.userId}
                  className="flex items-center gap-4 p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition border-l-4 border-indigo-500"
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center font-bold text-base">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 text-lg">{p.nickname}</div>
                    <div className="text-sm text-gray-500">
                      {p.role === 'organizer' ? '🎓 Quiz Organizer' : '📚 Participant'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.role === 'organizer' && (
                      <span className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold rounded-full">
                        HOST
                      </span>
                    )}
                    <span className="text-2xl">✅</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Start Time Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">⏰ Quiz Start Time (Central Standard Time)</h3>
            <p className="text-blue-800 text-lg font-mono font-semibold">
              {new Date(challenge.startAt).toLocaleString('en-US', { timeZone: 'America/Chicago' })}
            </p>
            <p className="text-blue-700 text-sm font-semibold mt-2">Timezone: Central Standard Time (CST)</p>
            <p className="text-blue-600 text-sm mt-2">
              All participants will see the quiz when this time is reached (CST)
            </p>
            {lobbyRemaining !== null && lobbyRemaining > 0 && (
              <div className="mt-4 bg-white rounded-lg p-4 border-2 border-blue-300">
                <p className="text-center text-blue-900 font-semibold mb-1">Starting in:</p>
                <p className="text-center text-4xl font-bold text-blue-600 font-mono">
                  {Math.floor(lobbyRemaining / 60)}:{String(lobbyRemaining % 60).padStart(2, '0')}
                </p>
                <p className="text-center text-blue-600 text-sm mt-1">minutes:seconds</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            {/* Only show Start Quiz Now button if no active countdown */}
            {(lobbyRemaining === null || lobbyRemaining <= 0) && (
              <button
                onClick={startChallengeNow}
                className="flex-1 px-8 py-4 bg-green-600 text-white font-bold text-lg rounded-lg hover:bg-green-700 transition shadow-md"
              >
                <Play className="h-5 w-5 inline mr-2" />
                Start Quiz Now
              </button>
            )}
            <button
              onClick={cancelChallenge}
              className="px-8 py-4 bg-gray-400 text-white font-semibold rounded-lg hover:bg-gray-500 transition"
            >
              Cancel
            </button>
          </div>
        </div>
        )}

        {challenge.state === 'in_progress' && hasPlayerFinishedAllQuestions && (
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-r from-blue-100 to-indigo-100 border-4 border-blue-500 rounded-lg p-12 text-center shadow-lg">
            <div className="mb-6 flex justify-center">
              <div className="animate-spin">
                <div className="h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
              </div>
            </div>
            <h2 className="text-4xl font-bold text-blue-900 mb-3">✅ Quiz Complete!</h2>
            <p className="text-xl text-blue-700 mb-6">You've answered all questions. Waiting for other participants to finish...</p>
            <div className="bg-white rounded-lg p-6 inline-block">
              <p className="text-gray-700 text-lg"><span className="font-bold text-blue-600">Total Time Remaining:</span> <span className="font-mono text-2xl font-bold text-blue-600">{totalQuizTimeRemaining}s</span></p>
            </div>
            <p className="text-blue-600 text-sm mt-8">The quiz will automatically end when time runs out.</p>
          </div>
        </div>
        )}

        {challenge.state === 'in_progress' && currentQuestion && !hasPlayerFinishedAllQuestions && (
        <div className="max-w-4xl mx-auto">
          {/* Question Card */}
          <div className="bg-white rounded-lg p-8 shadow-md mb-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                Question {currentPlayerProgress + 1} of {challenge.questionIds.length}
              </h2>
              <div className={`text-center px-4 py-2 rounded-lg font-bold ${timeRemaining <= 10 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                ⏱️ {timeRemaining}s
              </div>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-2 bg-indigo-600 transition-all"
                style={{ width: `${((currentPlayerProgress + 1) / challenge.questionIds.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Question Content */}
          <div className="bg-white rounded-lg p-8 shadow-md mb-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-8 leading-relaxed">
              {currentQuestion.question}
            </h3>

            {/* Answer Options */}
            <div className="space-y-3">
              {currentQuestion.choices.map((c, i) => {
                const optionLetter = String.fromCharCode(65 + i)
                const answerExists = currentQuestion.id in challenge.answers
                const chosen = challenge.answers[currentQuestion.id]?.option === optionLetter
                const isSelected = selectedOption === optionLetter
                const isDisabled = answerExists

                return (
                  <button
                    key={i}
                    disabled={isDisabled}
                    onClick={() => {
                      if (!isDisabled) {
                        setSelectedOption(optionLetter)
                        answerQuestion(optionLetter)
                      }
                    }}
                    className={`w-full text-left p-5 rounded-xl border-2 font-semibold transition-all transform ${
                      chosen
                        ? 'border-green-500 bg-green-100 text-green-900 scale-[1.02]'
                        : isSelected
                        ? 'border-blue-500 bg-blue-100 text-blue-900 scale-[1.02] shadow-lg'
                        : isDisabled
                        ? 'border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed'
                        : 'border-gray-300 bg-white text-gray-800 hover:border-indigo-400 hover:bg-indigo-50 hover:scale-[1.01] cursor-pointer'
                    }`}
                  >
                    <span className={`inline-block w-10 h-10 rounded-full text-center font-bold mr-4 leading-10 ${
                      chosen ? 'bg-green-500 text-white' :
                      isSelected ? 'bg-blue-500 text-white' :
                      'bg-gray-200 text-gray-700'
                    }`}>
                      {optionLetter}
                    </span>
                    {c}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Next Button */}
          {challenge.answers[currentQuestion.id] && (
            <button
              onClick={moveToNextQuestion}
              className={`${ui.btn} ${ui.primary} px-8 py-4 text-white text-lg w-full`}
            >
              Next Question →
            </button>
          )}
        </div>
        )}

        {challenge.state === 'ended' && (
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg p-8 mb-8 shadow-lg">
            <h2 className="text-4xl font-bold mb-2">🎉 Quiz Complete!</h2>
            <p className="text-green-100">All participants have finished</p>
          </div>

          {/* Leaderboard */}
          <div className="bg-white rounded-lg p-8 shadow-md mb-8">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">🏆 Final Results</h3>
            <div className="space-y-4">
              {challenge.players
                .sort((a, b) => {
                  if (b.score !== a.score) return b.score - a.score
                  return a.totalTimeMs - b.totalTimeMs
                })
                .map((player, idx) => {
                  const medals = ['🥇', '🥈', '🥉']
                  const medal = idx < 3 ? medals[idx] : '📊'
                  return (
                    <div
                      key={player.userId}
                      className={`p-6 rounded-lg border-l-4 flex items-center justify-between ${
                        idx === 0
                          ? 'border-yellow-500 bg-yellow-50'
                          : idx === 1
                          ? 'border-gray-400 bg-gray-50'
                          : idx === 2
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-blue-500 bg-blue-50'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-4xl font-bold">{medal}</span>
                        <div>
                          <div className="text-lg font-bold text-gray-900">{player.nickname}</div>
                          <div className="text-sm text-gray-600">
                            {player.role === 'organizer' ? '🎓 Organizer' : '📚 Participant'}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-indigo-600">{player.score}</div>
                        <div className="text-xs text-gray-600">
                          {(player.totalTimeMs / 1000).toFixed(1)}s
                        </div>
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>

          <button
            onClick={cancelChallenge}
            className={`${ui.btn} ${ui.primary} px-8 py-4 text-white text-lg w-full`}
          >
            ← Back to Generator
          </button>
        </div>
        )}
      </main>
    </div>
  )
}

export default ChallengeCreate
