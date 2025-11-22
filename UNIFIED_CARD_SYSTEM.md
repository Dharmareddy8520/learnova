# Unified Card System - Architecture Changes

## Problem
Previously, uploading a document created **3 separate cards** in "My Cards":
- Card 1: Summary only
- Card 2: Quiz only  
- Card 3: Flashcards only

Users couldn't edit these cards, and the UI was cluttered.

## Solution
Now creates **1 unified card per upload** containing all content (summary, quiz, flashcards) with edit capabilities.

## Files Changed

### 1. Backend: `/apps/backend/src/routes/analyze.ts`

**Changes:**
- Lines 319-336: Replaced 3 separate PersonalCard creations with 1 unified card
- Single card contains all generated content in `content` object:
  ```typescript
  content: {
    summary: results.summary || null,
    quiz: results.quiz || null,
    flashcards: results.flashcards || null,
  }
  ```
- Metadata tracks counts for each content type:
  ```typescript
  metadata: {
    sourceFileId: uploadedDoc._id,
    originalText: fullText,  // Stored for regeneration
    summaryLength: number,
    quizCount: number,
    flashcardCount: number,
  }
  ```

### 2. Backend: `/apps/backend/src/routes/cards.ts`

**New Endpoint:**
```
PATCH /api/cards/:id/update
Request body: { field: 'summaryLength' | 'quizCount' | 'flashcardCount', value: number }
```

**Features:**
- Regenerates content based on field
- Updates metadata counts
- Stores original text for regeneration without re-uploading
- Examples:
  - `{ field: 'summaryLength', value: 150 }` - regenerate summary with 150 words
  - `{ field: 'quizCount', value: 5 }` - regenerate 5 quiz questions
  - `{ field: 'flashcardCount', value: 20 }` - regenerate 20 flashcards

## Frontend UI Changes Needed

The frontend component should now display **1 card per upload** with:

```
┌─ Story2 ─────────────────────────────┐
├─ Summary [Edit: 150 words ▼]          │
│  "This is the summary text..."       │
│  [Regenerate]                        │
├─ Quiz [Edit: 5 questions ▼]           │
│  Q1: What is...                      │
│  Q2: How does...                     │
│  [Regenerate]                        │
├─ Flashcards [Edit: 12 cards ▼]        │
│  Card 1: Term → Definition           │
│  Card 2: Term → Definition           │
│  [Regenerate]                        │
└──────────────────────────────────────┘
```

## Data Model

### PersonalCard Schema (Updated)
```typescript
{
  userId: ObjectId,
  title: string,                    // e.g., "Story2"
  type: 'upload',                   // Was 'summary'|'quiz'|'flashcards', now unified
  content: {
    summary: string | null,
    quiz: QuestionObject[] | null,
    flashcards: string[] | null,    // Array of "Term: Definition" strings
  },
  metadata: {
    sourceFileId: ObjectId,         // Reference to UploadedDocument
    originalText: string,           // For regeneration
    summaryLength: number,
    quizCount: number,
    flashcardCount: number,
  },
  createdAt: Date,
  updatedAt: Date,
}
```

## API Usage Examples

### Create Card (Automatic)
- User uploads document and requests summary, quiz, flashcards
- Backend automatically creates 1 unified card

### Fetch All Cards
```
GET /api/cards
Response: { cards: [{ id, title, type, content, metadata, ... }] }
```

### Fetch Single Card
```
GET /api/cards/:id
Response: { card: { ... } }
```

### Edit Card (Regenerate Content)
```
PATCH /api/cards/:id/update
Body: { field: 'summaryLength', value: 200 }
Response: { card: { ... updated card ... } }
```

### Delete Card
```
DELETE /api/cards/:id
Response: { success: true }
```

## Benefits

1. **Cleaner UI**: One card per upload instead of 3
2. **Editable**: Users can adjust summary length, quiz count, flashcard count
3. **Efficient**: Stores original text once, regenerates content on demand
4. **Better Organization**: All content for one document in one place
5. **Flexible**: Users control exactly what they want to see/edit

## Testing Steps

1. Upload a document (e.g., "Story2")
2. Request: Summary, Quiz, Flashcards
3. Verify: Single card appears in "My Cards" with all 3 sections
4. Click "Edit Summary" → Change to 200 words → [Regenerate]
5. Verify: Summary updates without affecting quiz/flashcards
6. Click "Edit Quiz" → Change to 10 questions → [Regenerate]
7. Verify: Quiz updates independently
8. Repeat for Flashcards

## Database Migration

If you have old 3-card format in DB, they'll still display. New uploads will use the unified format.

To clean up old cards (optional):
```javascript
db.personalcards.deleteMany({ type: { $in: ['summary', 'quiz', 'flashcards'] } })
```
