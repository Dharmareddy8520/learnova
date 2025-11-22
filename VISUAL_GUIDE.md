# Visual Guide: Unified Card System

## Before vs After

### ❌ BEFORE (3 Separate Cards)
```
┌─────────────────────────────────────┐
│ 📝 Summary: Story2                  │
├─────────────────────────────────────┤
│ This is the summary of the story... │
│         [Ask] [Delete]              │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ ❓ Quiz: Story2                     │
├─────────────────────────────────────┤
│ Q1: What happened?                  │
│ Q2: Where did...                    │
│         [Ask] [Delete]              │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 🎴 Flashcards: Story2               │
├─────────────────────────────────────┤
│ Card 1: Term → Definition           │
│ Card 2: Term → Definition           │
│         [Ask] [Delete]              │
└─────────────────────────────────────┘

Problem: 
  ❌ 3 cards cluttering dashboard
  ❌ Not editable
  ❌ Unclear they're from same upload
```

### ✅ AFTER (1 Unified Card)
```
┌────────────────────────────────────────────────┐
│ 📁 Upload - Story2                       [🗑️]  │
├────────────────────────────────────────────────┤
│                                                │
│ 📝 Summary (200 words)  ▼                      │
│ ┌──────────────────────────────────────────┐  │
│ │ This is the summary of the story...      │  │
│ │ [Edit Length] ────────────────────────   │  │
│ └──────────────────────────────────────────┘  │
│                                                │
│ ❓ Quiz (8 questions)  ▼                       │
│ ┌──────────────────────────────────────────┐  │
│ │ Q1: What happened?                       │  │
│ │ Q2: Where did...                         │  │
│ │ Q3: Who was...                           │  │
│ │ [Edit Count] ──────────────────────────  │  │
│ └──────────────────────────────────────────┘  │
│                                                │
│ 🎴 Flashcards (12 cards)  ▼                    │
│ ┌──────────────────────────────────────────┐  │
│ │ Card 1: Term → Definition                │  │
│ │ Card 2: Term → Definition                │  │
│ │ Card 3: Term → Definition                │  │
│ │ [Edit Count] ──────────────────────────  │  │
│ └──────────────────────────────────────────┘  │
│                                                │
├────────────────────────────────────────────────┤
│            [💬 Ask Question]                   │
└────────────────────────────────────────────────┘

Benefits:
  ✅ 1 organized card
  ✅ All content in one place
  ✅ Collapsible sections
  ✅ Editable fields
  ✅ Independent regeneration
```

## Feature Showcase

### 1️⃣ Unified Display
```
Before: Story2 appears 3 times in list
After:  Story2 appears once, fully expandable
```

### 2️⃣ Editable Sections
```
Click [Edit Length]
┌─────────────────────┐
│ Current: 200 words  │
│ Input: [___150___]  │
│ [Regenerate] [✕]   │
└─────────────────────┘
Click Regenerate → Summary updates with exactly 150 words
```

### 3️⃣ Collapsible Content
```
Card expanded:
┌─ Summary ▼
│ Summary text...
├─ Quiz ▼
│ Q1...
│ Q2...
├─ Flashcards ▼
│ Card1...
│ Card2...

Click ▼ to collapse:
┌─ Summary ▲
├─ Quiz ▲
├─ Flashcards ▲
```

### 4️⃣ Independent Editing
```
1. Edit summary length → Regenerate summary only
   ✅ Summary: updated
   ✅ Quiz: unchanged
   ✅ Flashcards: unchanged

2. Edit quiz count → Regenerate quiz only
   ✅ Summary: still has edited length
   ✅ Quiz: regenerated with new count
   ✅ Flashcards: unchanged

3. Edit flashcard count → Regenerate flashcards only
   ✅ Summary: still edited
   ✅ Quiz: still regenerated
   ✅ Flashcards: regenerated with new count
```

## User Journey

### 📋 Step-by-Step Workflow

```
1. USER UPLOADS DOCUMENT
   ┌─ Click "Upload Document"
   ├─ Select: Summary ✅
   ├─ Select: Quiz ✅
   ├─ Select: Flashcards ✅
   └─ Click [Analyze]
        ↓
   
2. BACKEND PROCESSES
   ┌─ Generate summary (200 words)
   ├─ Generate quiz (8 questions)
   ├─ Generate flashcards (12 cards)
   ├─ Store original text (for edits)
   └─ Create 1 unified card
        ↓

3. FRONTEND DISPLAYS
   ┌─ User navigates to "My Cards"
   ├─ Sees 1 card with 3 sections
   ├─ All sections expanded
   └─ Ready for interaction
        ↓

4. USER EDITS
   ┌─ Read summary (200 words)
   ├─ Click [Edit Length]
   ├─ Change to 300 words
   ├─ Click [Regenerate]
   ├─ Wait for new summary
   └─ Summary updates, others unchanged
        ↓

5. USER EXPORTS/USES
   ┌─ Ask questions about content
   ├─ Export if needed
   ├─ Continue editing other sections
   └─ Delete when done
```

## API Request/Response Flow

### Creating Card
```
POST /api/analyze
├─ Body: { uploadId, tasks: { summarize, quiz, flashcards } }
└─ Backend
   ├─ Analyze text
   ├─ Generate content
   ├─ Save to PersonalCard
   │  └─ type: 'upload'
   │  └─ content: { summary, quiz, flashcards }
   │  └─ metadata: { originalText, counts... }
   └─ Return { jobId }
```

### Editing Card
```
PATCH /api/cards/:id/update
├─ Body: { field: 'summaryLength', value: 300 }
└─ Backend
   ├─ Get original text from metadata
   ├─ Generate new summary with 300 words
   ├─ Update card.content.summary
   ├─ Update card.metadata.summaryLength
   ├─ Save card
   └─ Return { card: {...updated...} }
```

### Fetching Cards
```
GET /api/cards
├─ Backend: Find all PersonalCard for user
└─ Return { cards: [
     {
       type: 'upload',
       title: 'Story2',
       content: { summary: '...', quiz: [...], flashcards: [...] },
       metadata: { summaryLength: 200, quizCount: 8, flashcardCount: 12 }
     }
   ]}
```

## Component Architecture

```
PersonalDashboard
├─ Fetch cards from API
├─ Filter by type
├─ Route cards:
│  ├─ type === 'upload' → UnifiedCardDisplay
│  └─ type === 'summary'|'quiz'|... → LegacyCardDisplay
│
└─ UnifiedCardDisplay
   ├─ State: expandedSections, editMode, editValues, updating
   ├─ Sections:
   │  ├─ SummarySection
   │  │  ├─ Display summary text
   │  │  ├─ [Edit Length] button
   │  │  └─ Edit mode with regenerate
   │  ├─ QuizSection
   │  │  ├─ Display quiz questions
   │  │  ├─ [Edit Count] button
   │  │  └─ Edit mode with regenerate
   │  └─ FlashcardsSection
   │     ├─ Display flashcards
   │     ├─ [Edit Count] button
   │     └─ Edit mode with regenerate
   └─ Actions:
      ├─ [Delete]
      └─ [Ask Question]
```

## Data Flow Visualization

```
┌─────────────────┐
│  User Upload    │
│  + Selections   │
└────────┬────────┘
         │
         ▼
    ┌─────────────────────────────────┐
    │    Backend /api/analyze         │
    │                                 │
    │  1. Extract text from upload    │
    │  2. Generate summary (200w)     │
    │  3. Generate quiz (8 q)         │
    │  4. Generate flashcards (12 c)  │
    │  5. Store original text         │
    │  6. Create 1 card (type:upload) │
    └────────┬────────────────────────┘
             │
             ▼
    ┌─────────────────────────────────┐
    │  MongoDB: PersonalCard          │
    │  {                              │
    │    type: 'upload',              │
    │    content: { summary, quiz,... │
    │    metadata: { originalText,... │
    │  }                              │
    └────────┬────────────────────────┘
             │
             ▼
    ┌─────────────────────────────────┐
    │  Frontend My Cards              │
    │  └─ UnifiedCardDisplay          │
    │     ├─ Summary [Edit]           │
    │     ├─ Quiz [Edit]              │
    │     └─ Flashcards [Edit]        │
    └────────┬────────────────────────┘
             │ User clicks [Edit]
             ▼
    ┌─────────────────────────────────┐
    │  PATCH /api/cards/:id/update    │
    │  {field: 'summaryLength', ...}  │
    └────────┬────────────────────────┘
             │
             ▼
    ┌─────────────────────────────────┐
    │  Backend:                       │
    │  1. Get originalText            │
    │  2. Regenerate with new param   │
    │  3. Update card.content.summary │
    │  4. Save to MongoDB             │
    └────────┬────────────────────────┘
             │
             ▼
    ┌─────────────────────────────────┐
    │  Frontend receives updated card │
    │  └─ Summary section updates     │
    │  ├─ Quiz section: unchanged     │
    │  └─ Flashcards section: chngd   │
    └─────────────────────────────────┘
```

## Status Indicators

```
Loading State:
┌─ [🔄 Regenerating...]
├─ User clicks Regenerate
├─ Button shows loading spinner
├─ API call in progress
└─ Button disabled until complete

Success State:
┌─ [✅ Regenerated]
├─ Content updated
├─ Button returns to normal
└─ Section shows new content

Error State:
┌─ [❌ Failed]
├─ Shows error message
├─ User can retry
└─ Original content preserved
```

## Ready for Testing! 🚀

Everything is implemented and servers are running:
- ✅ Backend: Port 3001
- ✅ Frontend: Port 5174
- ✅ All features implemented
- ✅ Ready for first upload test
