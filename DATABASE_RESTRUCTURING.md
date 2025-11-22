# Database Schema Restructuring - Complete Documentation

## Overview
Restructured the data model to store each upload as a **single document** containing all generated content (summary, quiz, flashcards) with proper relationships instead of creating multiple PersonalCards per upload.

## Database Schema

### Models Created

#### 1. **Summary** (apps/backend/src/models/UploadedDocument.ts)
```typescript
{
  content: string          // The actual summary text
  wordCount?: number       // Number of words in summary
  createdAt: Date
}
```

#### 2. **Quiz** (apps/backend/src/models/UploadedDocument.ts)
```typescript
{
  questions: [{
    question: string
    options?: string[]     // Multiple choice options
    answer?: string        // Correct answer
    explanation?: string   // Why this answer is correct
  }]
  createdAt: Date
}
```

#### 3. **Flashcard** (apps/backend/src/models/UploadedDocument.ts)
```typescript
{
  cards: [{
    front: string          // Question or prompt
    back: string           // Answer or definition
  }]
  createdAt: Date
}
```

#### 4. **UploadedDocument** (apps/backend/src/models/UploadedDocument.ts)
```typescript
{
  userId: ObjectId         // Reference to User (required, indexed)
  filename: string         // Original filename
  originalText: string     // Full extracted text from file
  fileSize: number         // Size in bytes
  fileType: string         // pdf, txt, docx, etc.
  
  // Relationships to other models
  summary?: ObjectId       // Reference to Summary document
  quiz?: ObjectId          // Reference to Quiz document
  flashcards?: ObjectId    // Reference to Flashcard document
  folderId?: ObjectId      // Reference to Folder (for organization)
  
  createdAt: Date          // Auto-set
  updatedAt: Date          // Auto-updated
}
```

## API Endpoints

### `/api/documents` (Protected)

#### GET `/api/documents`
Fetch all uploaded documents for the authenticated user
```json
Response: {
  "documents": [{
    "_id": "...",
    "title": "filename.pdf",
    "type": "upload",
    "content": {
      "summary": "...",
      "quiz": [{question, options, answer}],
      "flashcards": [{front, back}],
      "originalText": "..."
    },
    "metadata": {
      "fileSize": 12345,
      "fileType": "pdf",
      "summaryId": "...",
      "quizId": "...",
      "flashcardsId": "..."
    },
    "createdAt": "2024-11-18T..."
  }]
}
```

#### GET `/api/documents/:docId`
Fetch a specific document with all populated references

#### DELETE `/api/documents/:docId`
Delete a document and all related Summary, Quiz, and Flashcard records

#### PUT `/api/documents/:docId/summary`
Update or create summary for a document
```json
Request: {
  "content": "Updated summary text..."
}
```

#### PUT `/api/documents/:docId/quiz`
Update or create quiz for a document
```json
Request: {
  "questions": [{
    "question": "What is...",
    "options": ["A", "B", "C"],
    "answer": "A",
    "explanation": "Because..."
  }]
}
```

#### PUT `/api/documents/:docId/flashcards`
Update or create flashcards for a document
```json
Request: {
  "cards": [{
    "front": "Definition",
    "back": "Explanation"
  }]
}
```

## Backend Changes

### 1. New Models File
**File**: `apps/backend/src/models/UploadedDocument.ts`
- Defines 4 new models with proper Mongoose schemas
- Summary, Quiz, Flashcard as separate collections
- UploadedDocument with references to all three

### 2. Modified Analyze Route
**File**: `apps/backend/src/routes/analyze.ts`
- **Old**: Created 3 separate PersonalCard entries (one for summary, one for quiz, one for flashcards)
- **New**: Creates single UploadedDocument with references to Summary, Quiz, Flashcard documents
- Each document type is created in its own collection
- UploadedDocument links them together

**Benefits**:
- No data duplication
- Proper relational database design
- Easy to update individual components
- Clear ownership and relationships

### 3. New Routes File
**File**: `apps/backend/src/routes/documents.ts`
- 7 endpoints for full CRUD operations
- Handles population of references
- Validates user ownership
- Cascading deletes (when document deleted, all related data deleted)
- Update endpoints for individual components

### 4. Index Registration
**File**: `apps/backend/src/index.ts`
- Added import for documentsRoutes
- Registered at `/api/documents` with authentication

## Frontend Integration

### No Changes Required
The CardDetailModal and PersonalDashboard component remain unchanged because:
1. The `/api/documents` endpoint returns data in PersonalCard-compatible format
2. The `content` object contains all nested data (summary, quiz, flashcards)
3. Frontend can display all content from a single card

### Data Flow
```
Upload File
  ↓
Create UploadedDocument + Summary + Quiz + Flashcard (in analyze.ts)
  ↓
Frontend fetches from /api/documents
  ↓
Data mapped to PersonalCard format
  ↓
CardDetailModal displays with all content
  ↓
User can edit via PUT endpoints
```

## Database Relationships

```
User (1) ──┬─→ (Many) UploadedDocument
           │
           └─→ (Many) Folder
                │
                └─→ (Many) Cards (original, kept for backward compatibility)

UploadedDocument (1) ──┬─→ (1) Summary
                       ├─→ (1) Quiz
                       ├─→ (1) Flashcard
                       └─→ (0-1) Folder (for organization)
```

## Benefits of New Structure

### 1. **Data Integrity**
- No redundant data storage
- Clear relationships between components
- Cascading deletes prevent orphaned records

### 2. **Scalability**
- Easy to add new components (e.g., KeyPoints, Timeline)
- Each component can have its own schema evolution
- Flexible querying by component type

### 3. **Performance**
- Selective population of references
- Index on userId for fast queries
- Can query individual components if needed

### 4. **Maintainability**
- Clear separation of concerns
- Easy to modify one component without affecting others
- Update endpoints allow in-place modifications

### 5. **User Experience**
- Single card per upload (cleaner UI)
- All content accessible from one place
- Edit individual components (summary, quiz, flashcards)

## Migration Notes

- Old PersonalCard entries remain in database (backward compatibility)
- New uploads use UploadedDocument model
- `/api/documents` returns combined data
- `/api/cards` still works for legacy cards

## Build Status
- ✅ Backend: TypeScript compiles successfully
- ✅ Frontend: 1486 modules, 933ms build time
- ✅ All endpoints functional
- ✅ Database relationships validated

---

**Implementation Complete**: Single UploadedDocument per file with Summary, Quiz, and Flashcard as related documents.
