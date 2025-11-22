# Testing the Unified Card System

## What Changed

### Backend ✅
1. **Single Card Creation** - `/api/analyze` now creates 1 unified card instead of 3
2. **Edit Endpoints** - `PATCH /api/cards/:id/update` allows regenerating content

### Frontend ✅
1. **New Component** - `UnifiedCardDisplay.tsx` shows all content in one card
2. **Collapsible Sections** - Summary, Quiz, Flashcards can be expanded/collapsed
3. **Editable Fields** - Click "Edit" to change counts and regenerate

## How to Test

### Step 1: Upload Document
1. Go to **Document Analyzer** page
2. Upload a document (or paste text): "Story2"
3. Select all checkboxes:
   - ✅ Summarize
   - ✅ Quiz
   - ✅ Flashcards
4. Click **Analyze**
5. Wait for processing to complete

### Step 2: Check My Cards
1. Go to **Dashboard** → **My Cards**
2. **VERIFY**: You see **1 card** titled "Story2", not 3 separate cards!

### Step 3: View Card Content
The card should show:
```
📁 Upload - Story2
├─ 📝 Summary (expanded by default)
│  └─ Full summary text + [Edit Length] button
├─ ❓ Quiz (expanded by default)
│  └─ List of questions + [Edit Count] button
├─ 🎴 Flashcards (expanded by default)
│  └─ List of flashcards + [Edit Count] button
└─ Footer with [Ask Question] and actions
```

### Step 4: Test Edit Summary
1. In Summary section, click **[Edit Length]**
2. Change word count to **300 words**
3. Click **[Regenerate]**
4. **VERIFY**: Summary updates with new length
5. Quiz and Flashcards should remain unchanged

### Step 5: Test Edit Quiz
1. In Quiz section, click **[Edit Count]**
2. Change count to **5 questions**
3. Click **[Regenerate]**
4. **VERIFY**: Quiz updates with 5 new questions
5. Summary and Flashcards should remain unchanged

### Step 6: Test Edit Flashcards
1. In Flashcards section, click **[Edit Count]**
2. Change count to **20 cards**
3. Click **[Regenerate]**
4. **VERIFY**: Flashcards updates with 20 new cards
5. Summary and Quiz should remain unchanged

### Step 7: Collapse/Expand Sections
1. Click the collapse arrow (▲) next to Summary
2. **VERIFY**: Summary content hides
3. Click the expand arrow (▼)
4. **VERIFY**: Summary content shows again
5. Repeat for Quiz and Flashcards

### Step 8: Delete Card
1. Click the **🗑️** button in the card header
2. Confirm deletion
3. **VERIFY**: Card disappears from My Cards

### Step 9: Ask Question
1. Click **[Ask Question]** button
2. Ask a question about the content
3. Get an answer from the AI
4. **VERIFY**: Answer is generated based on card content

## Expected Behavior

| Action | Before | After | Status |
|--------|--------|-------|--------|
| Upload with summary+quiz+flashcards | Creates 3 cards | Creates 1 card | ✅ |
| Edit summary length | N/A | Regenerates only summary | ✅ |
| Edit quiz count | N/A | Regenerates only quiz | ✅ |
| Edit flashcard count | N/A | Regenerates only flashcards | ✅ |
| Collapse section | N/A | Hides content, keeps other sections open | ✅ |
| Delete card | Deletes one of 3 | Deletes entire upload | ✅ |

## Troubleshooting

### Card not appearing after upload?
1. Check browser console (F12) for errors
2. Verify `/api/cards` returns the card
3. Check MongoDB for PersonalCard entry with `type: 'upload'`

### Edit not working?
1. Check network tab for `PATCH /api/cards/:id/update` request
2. Verify request body: `{ field: 'summaryLength', value: 300 }`
3. Check backend logs for regeneration errors

### Old 3-card format still showing?
- Old cards with `type: 'summary'|'quiz'|'flashcards'` still display in legacy format
- New uploads use unified format
- To clean up, manually delete old cards from My Cards

## API Examples

### Create unified card
- Automatic via `/api/analyze` endpoint
- Returns `{ jobId }`

### Fetch cards
```bash
GET /api/cards
# Returns: { cards: [{ _id, title, type: 'upload', content: {...}, metadata: {...} }] }
```

### Edit card
```bash
PATCH /api/cards/:id/update
Body: { field: 'summaryLength', value: 200 }
# Returns: { card: { ... updated card with new summary ... } }
```

### Delete card
```bash
DELETE /api/cards/:id
# Returns: { success: true }
```

## Files Changed

**Backend:**
- `/apps/backend/src/routes/analyze.ts` - Single card creation
- `/apps/backend/src/routes/cards.ts` - Edit endpoint (PATCH)

**Frontend:**
- `/apps/frontend/src/components/UnifiedCardDisplay.tsx` - New component
- `/apps/frontend/src/components/PersonalDashboard.tsx` - Integration

## Success Criteria

✅ Uploading creates 1 card, not 3
✅ Card shows all 3 sections (Summary, Quiz, Flashcards)
✅ Each section can be independently edited and regenerated
✅ Editing one section doesn't affect others
✅ Card can be deleted
✅ Can ask questions about card content
