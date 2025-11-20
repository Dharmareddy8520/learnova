import express, { Request, Response } from 'express';
import { isAuthenticated } from '../middleware/auth';
import { generateQuiz } from '../services/hf';

const router = express.Router();

// In-memory store for challenges (in production, use MongoDB)
interface ChallengeParticipant {
  userId: string;
  nickname: string;
  role: 'organizer' | 'participant';
  joinedAt: number;
  score: number;
  totalTimeMs: number;
  currentQuestionIndex?: number;
  finishedAt?: number;
  answers?: Array<{ questionId: string; answer: number; timestamp: number; timeMs: number }>;
}

interface Challenge {
  joinCode: string;
  createdAt: number;
  startAt: number;
  createdBy: string;
  questions: any[];
  state: 'lobby' | 'in_progress' | 'ended';
  participants: ChallengeParticipant[];
  text?: string;
  numQuestions?: number;
  difficulty?: string;
  totalQuizDurationMs?: number;
  quizStartedAt?: number;
}

const challenges = new Map<string, Challenge>();

/**
 * POST /api/challenge/create
 * Create a new quiz challenge with server-side start time and generated questions
 * 
 * Body:
 * {
 *   joinCode: string (generated on client)
 *   delaySeconds: number (how many seconds from now to start)
 *   text: string (source text for question generation)
 *   numQuestions: number (number of questions to generate)
 *   difficulty?: string
 *   ...other challenge data
 * }
 */
router.post('/create', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { joinCode, delaySeconds = 300, text, numQuestions = 5, ...challengeData } = req.body;
    
    if (!joinCode) {
      return res.status(400).json({ error: 'joinCode is required' });
    }

    if (!text?.trim()) {
      console.log('❌ No text provided for challenge creation');
      return res.status(400).json({ error: 'text is required for question generation' });
    }

    // Generate questions on the server side
    let questions: any[] = [];
    try {
      console.log('🎯 Generating quiz with text length:', text.length, 'numQuestions:', numQuestions);
      let quizData = await generateQuiz(text, numQuestions);
      console.log('📦 Raw quiz data received:', JSON.stringify(quizData, null, 2));
      
      // Handle string responses with markdown code blocks
      if (typeof quizData === 'string') {
        console.log('🔄 Quiz data is a string, attempting to parse...');
        // Remove markdown code block markers if present
        let cleaned = quizData.trim();
        if (cleaned.startsWith('```json') || cleaned.startsWith('```')) {
          cleaned = cleaned.replace(/^```json?\s*/i, '').replace(/\s*```\s*$/, '');
        }
        try {
          quizData = JSON.parse(cleaned);
          console.log('✅ Successfully parsed string to JSON');
        } catch (parseErr) {
          console.error('❌ Failed to parse quiz data string:', parseErr);
          return res.status(500).json({ error: 'Quiz generation returned invalid format' });
        }
      }
      
      // Normalize the quiz data to expected format
      if (Array.isArray(quizData)) {
        questions = quizData.map((q: any, idx: number) => {
          // Handle different quiz formats from hf service
          if (q.question && q.options && q.answer) {
            // Format: {question, options: [A,B,C,D], answer}
            const answerIndex = q.options.indexOf(q.answer);
            return {
              id: `q${idx + 1}`,
              question: q.question,
              choices: q.options,
              answerIndex: answerIndex >= 0 ? answerIndex : 0,
            };
          } else if (q.question && q.choices && typeof q.answerIndex === 'number') {
            // Format: {question, choices, answerIndex}
            return {
              id: `q${idx + 1}`,
              ...q,
            };
          }
          console.log('⚠️ Question format not recognized:', q);
          return null;
        }).filter(Boolean);
      } else {
        console.log('⚠️ Quiz data is not an array:', typeof quizData);
      }
      console.log('✅ Normalized questions:', questions.length);
      
      // If no questions were generated, return error
      if (questions.length === 0) {
        console.error('❌ No valid questions generated from quiz data');
        return res.status(500).json({ error: 'Failed to generate valid questions. Please try again with different text.' });
      }
    } catch (genErr: any) {
      console.error('❌ Question generation failed:', genErr);
      return res.status(500).json({ error: 'Failed to generate questions: ' + (genErr?.message || 'Unknown error') });
    }

    // Server calculates the exact start time
    const now = Date.now();
    const startAt = now + (delaySeconds * 1000);
    const totalQuizDurationMs = questions.length * 20 * 1000; // 20 seconds per question

    console.log('✅ Challenge created with', questions.length, 'questions for joinCode:', joinCode);

    // Add the organizer as the first participant
    const organizerParticipant: ChallengeParticipant = {
      userId: (req.user as any)?.id || 'organizer-' + joinCode,
      nickname: (req.user as any)?.name || 'Organizer',
      role: 'organizer',
      joinedAt: now,
      score: 0,
      totalTimeMs: 0,
      currentQuestionIndex: 0,
      answers: [],
    };

    const challenge: Challenge = {
      joinCode,
      createdAt: now,
      startAt,
      createdBy: (req.user as any)?.id,
      questions,
      state: 'lobby',
      participants: [organizerParticipant], // Organizer is automatically added
      text,
      numQuestions,
      difficulty: challengeData.difficulty,
      totalQuizDurationMs,
    };

    // Store challenge on server
    challenges.set(joinCode, challenge);
    
    // Verify it was stored
    const stored = challenges.get(joinCode);
    console.log('💾 Challenge stored in Map:', {
      joinCode,
      stored: !!stored,
      totalChallenges: challenges.size,
      participants: challenge.participants.length,
      allJoinCodes: Array.from(challenges.keys())
    });

    res.json({
      success: true,
      challenge: {
        joinCode,
        startAt,
        createdAt: now,
        startInSeconds: delaySeconds,
        questionCount: questions.length,
        questions, // Send questions to client
        totalQuizDurationMs,
        message: `Quiz will start in ${delaySeconds} seconds`,
      },
    });
  } catch (error: any) {
    console.error('Error creating challenge:', error);
    res.status(500).json({ error: 'Failed to create challenge' });
  }
});

/**
 * GET /api/challenge/:joinCode/status
 * Get real-time status of a challenge (must be before generic :joinCode route)
 * Used by clients to check if quiz has started
 */
router.get('/:joinCode/status', (req: Request, res: Response) => {
  try {
    const { joinCode } = req.params;
    const challenge = challenges.get(joinCode);

    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    const now = Date.now();
    const startAt = challenge.startAt;
    const hasStarted = now >= startAt;
    const timeRemaining = Math.max(0, startAt - now);

    res.json({
      joinCode,
      serverTime: now,
      startAt,
      hasStarted,
      secondsUntilStart: Math.ceil(timeRemaining / 1000),
      state: challenge.state || 'lobby',
    });
  } catch (error: any) {
    console.error('Error getting challenge status:', error);
    res.status(500).json({ error: 'Failed to get challenge status' });
  }
});

/**
 * GET /api/challenge/:joinCode
 * Get challenge details (including server-side start time)
 */
router.get('/:joinCode', (req: Request, res: Response) => {
  try {
    const { joinCode } = req.params;
    console.log('🔍 GET request for challenge:', joinCode, '- Total challenges in Map:', challenges.size);
    const challenge = challenges.get(joinCode);

    if (!challenge) {
      console.log('❌ Challenge not found in Map. Available join codes:', Array.from(challenges.keys()));
      return res.status(404).json({ error: 'Challenge not found' });
    }

    const now = Date.now();
    const timeUntilStart = Math.max(0, challenge.startAt - now);
    const hasStarted = now >= challenge.startAt;
    
    // Check if quiz should auto-end based on total duration
    if (challenge.state === 'in_progress' && challenge.quizStartedAt) {
      const quizElapsed = now - challenge.quizStartedAt;
      if (quizElapsed >= (challenge.totalQuizDurationMs || 0)) {
        challenge.state = 'ended';
      }
    }

    console.log('📡 Sending challenge:', joinCode, '- Questions:', challenge.questions?.length || 0, '- State:', challenge.state, '- Participants:', challenge.participants.length);

    res.json({
      ...challenge,
      serverTime: now,
      timeUntilStart,
      hasStarted,
      secondsUntilStart: Math.ceil(timeUntilStart / 1000),
    });
  } catch (error: any) {
    console.error('Error getting challenge:', error);
    res.status(500).json({ error: 'Failed to get challenge' });
  }
});

/**
 * PATCH /api/challenge/:joinCode/state
 * Update challenge state (only organizer)
 */
router.patch('/:joinCode/state', isAuthenticated, (req: Request, res: Response) => {
  try {
    const { joinCode } = req.params;
    const { state } = req.body;
    const challenge = challenges.get(joinCode);

    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    // Only organizer can change state
    if (challenge.createdBy !== (req.user as any)?.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const now = Date.now();
    challenge.state = state;
    
    // Record quiz start time when transitioning to in_progress
    if (state === 'in_progress' && !challenge.quizStartedAt) {
      challenge.quizStartedAt = now;
    }
    
    challenges.set(joinCode, challenge);

    res.json({ 
      success: true, 
      state,
      serverTime: now,
      quizStartedAt: challenge.quizStartedAt,
    });
  } catch (error: any) {
    console.error('Error updating challenge:', error);
    res.status(500).json({ error: 'Failed to update challenge' });
  }
});

/**
 * POST /api/challenge/:joinCode/join
 * Join a challenge as a participant
 */
router.post('/:joinCode/join', (req: Request, res: Response) => {
  try {
    const { joinCode } = req.params;
    const { userId, nickname } = req.body;
    const challenge = challenges.get(joinCode);

    if (!challenge) {
      console.log('❌ Join failed: Challenge not found:', joinCode);
      return res.status(404).json({ error: 'Challenge not found' });
    }

    console.log('👤 Join request:', {
      joinCode,
      userId,
      nickname,
      currentParticipants: challenge.participants.length
    });

    // Check if user already joined
    const existingParticipant = challenge.participants.find(p => p.userId === userId);
    if (existingParticipant) {
      console.log('ℹ️  User already joined:', userId);
      return res.json({ 
        success: true, 
        message: 'Already joined',
        participant: existingParticipant,
        serverTime: Date.now(),
      });
    }

    const now = Date.now();
    const participant: ChallengeParticipant = {
      userId,
      nickname: nickname || 'Guest',
      role: 'participant',
      joinedAt: now,
      score: 0,
      totalTimeMs: 0,
      currentQuestionIndex: 0,
      answers: [],
    };

    challenge.participants.push(participant);
    challenges.set(joinCode, challenge);

    console.log('✅ Participant joined successfully:', {
      userId,
      nickname,
      totalParticipants: challenge.participants.length,
      allParticipants: challenge.participants.map(p => ({ userId: p.userId, nickname: p.nickname }))
    });

    res.json({ 
      success: true, 
      participant,
      serverTime: now,
      message: 'Successfully joined challenge',
    });
  } catch (error: any) {
    console.error('Error joining challenge:', error);
    res.status(500).json({ error: 'Failed to join challenge' });
  }
});

/**
 * POST /api/challenge/:joinCode/answer
 * Submit an answer to a question
 */
router.post('/:joinCode/answer', (req: Request, res: Response) => {
  try {
    const { joinCode } = req.params;
    const { userId, questionId, answer, timeMs } = req.body;
    const challenge = challenges.get(joinCode);

    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    const participant = challenge.participants.find(p => p.userId === userId);
    if (!participant) {
      return res.status(404).json({ error: 'Participant not found' });
    }

    const now = Date.now();
    
    // Find the question and validate answer
    const question = challenge.questions.find(q => q.id === questionId);
    if (!question) {
      return res.status(400).json({ error: 'Invalid question' });
    }

    const isCorrect = question.answerIndex === answer;
    const baseScore = isCorrect ? 100 : 0;
    const speedBonus = isCorrect ? Math.round((20000 - timeMs) / 20000 * 50) : 0;
    const questionScore = baseScore + Math.max(0, speedBonus);

    // Record answer
    if (!participant.answers) participant.answers = [];
    participant.answers.push({
      questionId,
      answer,
      timestamp: now,
      timeMs,
    });

    participant.score += questionScore;
    participant.totalTimeMs += timeMs;
    
    // Move to next question
    participant.currentQuestionIndex = (participant.currentQuestionIndex || 0) + 1;
    
    // Check if participant finished all questions
    if (participant.currentQuestionIndex >= challenge.questions.length) {
      participant.finishedAt = now;
    }

    // Check if all participants have finished
    const allFinished = challenge.participants.every(p => 
      p.finishedAt || (p.currentQuestionIndex || 0) >= challenge.questions.length
    );

    // Only end quiz if all participants finished OR time expired
    if (allFinished && challenge.state === 'in_progress') {
      const quizElapsed = now - (challenge.quizStartedAt || now);
      if (quizElapsed >= (challenge.totalQuizDurationMs || 0)) {
        challenge.state = 'ended';
      }
    }

    challenges.set(joinCode, challenge);

    res.json({
      success: true,
      score: questionScore,
      totalScore: participant.score,
      isCorrect,
      currentQuestionIndex: participant.currentQuestionIndex,
      hasFinished: !!participant.finishedAt,
      serverTime: now,
    });
  } catch (error: any) {
    console.error('Error submitting answer:', error);
    res.status(500).json({ error: 'Failed to submit answer' });
  }
});

/**
 * GET /api/challenge/:joinCode/leaderboard
 * Get leaderboard (only available when quiz has ended or all finished)
 */
router.get('/:joinCode/leaderboard', (req: Request, res: Response) => {
  try {
    const { joinCode } = req.params;
    const challenge = challenges.get(joinCode);

    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    const now = Date.now();
    const quizElapsed = challenge.quizStartedAt ? now - challenge.quizStartedAt : 0;
    const timeExpired = quizElapsed >= (challenge.totalQuizDurationMs || 0);
    
    // Check if all participants have finished
    const allFinished = challenge.participants.every(p => 
      p.finishedAt || (p.currentQuestionIndex || 0) >= challenge.questions.length
    );

    // Leaderboard only available if quiz ended OR (all finished AND time expired)
    const canShowLeaderboard = challenge.state === 'ended' || (allFinished && timeExpired);

    if (!canShowLeaderboard) {
      return res.json({
        available: false,
        message: 'Leaderboard not available yet. Waiting for all participants to finish or time to expire.',
        serverTime: now,
        allFinished,
        timeExpired,
      });
    }

    // Sort participants by score (desc) then time (asc)
    const sortedParticipants = [...challenge.participants].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.totalTimeMs - b.totalTimeMs;
    });

    res.json({
      available: true,
      leaderboard: sortedParticipants,
      serverTime: now,
    });
  } catch (error: any) {
    console.error('Error getting leaderboard:', error);
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

export default router;
