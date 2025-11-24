// services/gemini-document.ts
/**
 * Gemini Document Processing Service
 * 
 * Handles large document processing with intelligent chunking:
 * - Summarization: Multi-stage chunked summarization for long documents
 * - Quiz Generation: Distributes questions across document chunks
 * - Flashcard Generation: Extracts key concepts from chunked content
 * - Q&A: Context-aware question answering
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

// Configuration
const MODEL_NAME = 'gemini-2.5-flash'; // Latest stable Gemini model with 1M token context
const CHUNK_CHAR_LIMIT = 12000; // Safe limit per API call

/**
 * Initialize Gemini client with API key validation
 */
function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }
  return new GoogleGenerativeAI(apiKey);
}

/**
 * Split text into manageable chunks, preferring sentence boundaries
 * @param text - Full document text
 * @param maxChars - Maximum characters per chunk
 * @returns Array of text chunks
 */
function chunkText(text: string, maxChars: number = CHUNK_CHAR_LIMIT): string[] {
  text = text.trim();
  const chunks: string[] = [];
  
  while (text.length > maxChars) {
    // Try to cut at sentence boundary
    let cut = text.lastIndexOf('.', maxChars);
    if (cut === -1) {
      cut = maxChars;
    }
    
    const chunk = text.slice(0, cut).trim();
    if (chunk) {
      chunks.push(chunk);
    }
    text = text.slice(cut).trim();
  }
  
  if (text) {
    chunks.push(text);
  }
  
  return chunks;
}

/**
 * Summarize a single chunk of text
 */
async function summarizeChunk(text: string, maxWords: number): Promise<string> {
  const prompt = `You are a precise summarizer.

Summarize the following text in about ${maxWords} words.
The summary should be clear, coherent, and must not add new facts.

TEXT:
${text}`;

  const genAI = getClient();
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });
  
  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

/**
 * Summarize a document with intelligent chunking for large texts
 * @param text - Full document text
 * @param desiredWords - Target word count for final summary
 * @returns Summary text
 */
export async function summarizeDocument(text: string, desiredWords: number = 200): Promise<string> {
  text = text.trim();
  if (!text) {
    return 'No content to summarize.';
  }

  // Single-shot for small documents
  if (text.length <= CHUNK_CHAR_LIMIT) {
    return summarizeChunk(text, desiredWords);
  }

  // Multi-stage chunked summarization
  const chunks = chunkText(text, CHUNK_CHAR_LIMIT);
  console.log(`📄 Document is large, splitting into ${chunks.length} chunks for summarization...`);

  const partialSummaries: string[] = [];
  const perChunkWords = Math.max(Math.floor(desiredWords / chunks.length), 50);

  for (let i = 0; i < chunks.length; i++) {
    console.log(`   - Summarizing chunk ${i + 1}/${chunks.length}...`);
    const summary = await summarizeChunk(chunks[i], perChunkWords);
    partialSummaries.push(`Chunk ${i + 1} summary:\n${summary}`);
  }

  console.log('📄 Combining chunk summaries into final summary...');

  const combinedText = partialSummaries.join('\n\n');
  const finalPrompt = `You are a summarization expert.

You are given summaries of different chunks from a single document.
Combine them into ONE final summary of about ${desiredWords} words.

Make the result:
- Non-redundant
- Well structured
- Easy to read
- Faithful to the content

Chunk summaries:
${combinedText}`;

  const genAI = getClient();
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });
  const result = await model.generateContent(finalPrompt);
  
  return result.response.text().trim();
}

/**
 * Generate quiz questions from a text chunk
 */
async function generateQuizFromText(text: string, numQuestions: number): Promise<string> {
  const prompt = `You are an exam question generator.

From the text below, generate ${numQuestions} multiple-choice questions in JSON format.

Requirements:
- Return a valid JSON array of questions
- Each question must have exactly 4 options
- Include the correct answer text and index (0-3)
- Focus on important concepts only

Format:
[
  {
    "question": "...",
    "options": ["A", "B", "C", "D"],
    "answer": "C",
    "correct": 2
  }
]

TEXT:
${text}`;

  const genAI = getClient();
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });
  
  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

/**
 * Generate quiz questions from a document with chunking support
 * @param text - Full document text
 * @param numQuestions - Number of questions to generate
 * @returns Quiz questions as JSON string or text
 */
export async function generateQuizDocument(text: string, numQuestions: number = 8): Promise<any> {
  text = text.trim();
  if (!text) {
    return 'No content for quiz generation.';
  }

  // Single-shot for small documents
  if (text.length <= CHUNK_CHAR_LIMIT) {
    const rawQuiz = await generateQuizFromText(text, numQuestions);
    try {
      // Try to parse JSON response
      const cleaned = rawQuiz.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      return JSON.parse(cleaned);
    } catch {
      return rawQuiz;
    }
  }

  // Multi-chunk quiz generation
  const chunks = chunkText(text, CHUNK_CHAR_LIMIT);
  console.log(`📝 Document is large, splitting into ${chunks.length} chunks for quiz generation...`);

  let questionsLeft = numQuestions;
  const perChunk = Math.max(Math.floor(numQuestions / chunks.length), 1);
  const quizBlocks: any[] = [];

  for (let i = 0; i < chunks.length && questionsLeft > 0; i++) {
    const thisN = i < chunks.length - 1 ? perChunk : questionsLeft;
    console.log(`   - Generating ${thisN} questions from chunk ${i + 1}/${chunks.length}...`);
    
    const block = await generateQuizFromText(chunks[i], thisN);
    try {
      const cleaned = block.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);
      quizBlocks.push(...(Array.isArray(parsed) ? parsed : [parsed]));
    } catch {
      // If parse fails, keep as text
      quizBlocks.push(block);
    }
    
    questionsLeft -= thisN;
  }

  return quizBlocks;
}

/**
 * Generate flashcards from a text chunk
 */
async function generateFlashcardsFromText(text: string, numCards: number): Promise<string> {
  const prompt = `You are creating concise study flashcards.

From the text below, generate ${numCards} flashcards in JSON format.

Format:
[
  {
    "front": "Term or question (1-5 words)",
    "back": "Definition or answer (1-3 sentences)"
  }
]

Rules:
- Keep "front" short (1–5 words)
- Keep "back" to 1–3 sentences
- Focus on the most important concepts
- Avoid duplicates
- Return valid JSON only

TEXT:
${text}`;

  const genAI = getClient();
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });
  
  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

/**
 * Generate flashcards from a document with chunking support
 * @param text - Full document text
 * @param numCards - Number of flashcards to generate
 * @returns Flashcards as JSON array or text
 */
export async function generateFlashcardsDocument(text: string, numCards: number = 12): Promise<any> {
  text = text.trim();
  if (!text) {
    return 'No content for flashcard generation.';
  }

  // Single-shot for small documents
  if (text.length <= CHUNK_CHAR_LIMIT) {
    const rawCards = await generateFlashcardsFromText(text, numCards);
    try {
      const cleaned = rawCards.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      return JSON.parse(cleaned);
    } catch {
      return rawCards;
    }
  }

  // Multi-chunk flashcard generation
  const chunks = chunkText(text, CHUNK_CHAR_LIMIT);
  console.log(`🗂️ Document is large, splitting into ${chunks.length} chunks for flashcards...`);

  let cardsLeft = numCards;
  const perChunk = Math.max(Math.floor(numCards / chunks.length), 1);
  const flashBlocks: any[] = [];

  for (let i = 0; i < chunks.length && cardsLeft > 0; i++) {
    const thisN = i < chunks.length - 1 ? perChunk : cardsLeft;
    console.log(`   - Generating ${thisN} flashcards from chunk ${i + 1}/${chunks.length}...`);
    
    const block = await generateFlashcardsFromText(chunks[i], thisN);
    try {
      const cleaned = block.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);
      flashBlocks.push(...(Array.isArray(parsed) ? parsed : [parsed]));
    } catch {
      // Try to parse text format: "Front: ... Back: ..."
      const lines = block.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      let i = 0;
      while (i < lines.length) {
        if (/^Front:/i.test(lines[i])) {
          const front = lines[i].replace(/^Front:\s*/i, '').trim();
          i++;
          let back = '';
          if (i < lines.length && /^Back:/i.test(lines[i])) {
            back = lines[i].replace(/^Back:\s*/i, '').trim();
            i++;
          }
          if (front) flashBlocks.push({ front, back });
          continue;
        }
        i++;
      }
    }
    
    cardsLeft -= thisN;
  }

  return flashBlocks;
}

/**
 * Prepare document context for Q&A (with summarization for large docs)
 */
export async function prepareQAContext(text: string): Promise<string> {
  text = text.trim();
  if (!text) {
    return '';
  }

  if (text.length <= CHUNK_CHAR_LIMIT) {
    return text;
  }

  console.log('💬 Document is large, creating condensed context for Q&A...');
  return summarizeDocument(text, 1500);
}

/**
 * Answer a question based on document context
 */
export async function answerQuestionAboutContext(context: string, question: string): Promise<string> {
  const prompt = `You are a question-answering assistant.

You will be given:
- A DOCUMENT CONTEXT
- A QUESTION

Rules:
- Answer ONLY using the information in the document context.
- If the answer is not present in the document context, reply exactly with:
  Information not found in the document.

DOCUMENT CONTEXT:
${context}

QUESTION:
${question}

ANSWER:`;

  const genAI = getClient();
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });
  
  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}
