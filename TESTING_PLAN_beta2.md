# My Library Feature - Testing Plan (Beta2)

## Feature Overview
The My Library feature enables users to organize their study materials using folders, cards, and uploaded documents. Core functionality includes uploading files, analyzing them (summary/quiz/flashcards), saving to library, and organizing items in folders.

## Implementation Summary

### Backend Changes (Branch: beta2)
1. **New Backend Endpoints:**
   - `GET /api/folders/count` - Get count of user's folders
   - `GET /api/cards/count` - Get count of user's personal cards
   - `GET /api/documents/count` - Get count of user's uploaded documents
   - `POST /api/documents` - Save uploaded document with analysis results to library
     - Accepts: filename, fileSize, fileType, originalText, summaryContent, quizQuestions, flashcardCards
     - Returns: saved document in PersonalCard-compatible format

2. **Enhanced Routes:**
   - `/api/folders/*` - Full CRUD with create/read/update/delete/add-card functionality
   - `/api/cards/*` - Full CRUD for personal cards
   - `/api/documents/*` - Full CRUD for uploaded documents with regenerate endpoints

### Frontend Changes (Branch: beta2)
1. **New Components/Pages:**
   - `MyLibrary.tsx` - Main library dashboard with tabs (All, Folders, My Cards, Uploads)
   - `FolderManager.tsx` (existing, integrated) - Full folder management UI

2. **Enhanced Components:**
   - `FileUploadSummary.tsx` - Added "Save to Library" button with success feedback
   - `AppSidebar.tsx` - Updated "My Library" link to `/library` route
   - `App.tsx` - Added `/library` route with ProtectedRoute wrapper

3. **Features Implemented:**
   - Real-time count display for folders/cards/uploads
   - Folder creation/edit/delete with color picker and descriptions
   - Card listing with delete and move-to-folder functionality
   - Document upload history with metadata and view/delete actions
   - One-click save of analyzed documents to library
   - "All" tab showing summary counts

## Manual Testing Checklist

### Setup
- [ ] Git branch: Ensure on `beta2` branch
  ```bash
  git status  # Should show "On branch beta2"
  ```
- [ ] Backend running on port 3001
  ```bash
  cd apps/backend && npm run dev
  ```
- [ ] Frontend running on port 5173
  ```bash
  cd apps/frontend && npm run dev
  ```

### User Authentication
- [ ] Sign up with new account (or use existing test account)
- [ ] Login successfully
- [ ] Navigate to /library route (should see My Library page)

### Test 1: Count Endpoints
- [ ] Verify network tab shows requests to `/api/folders/count`, `/api/cards/count`, `/api/documents/count`
- [ ] Counts display correctly (should all show 0 for new user)
- [ ] Refresh page - counts persist and load quickly

### Test 2: Folder Management
**Create Folder:**
- [ ] Click "New Folder" button in Folders tab
- [ ] Enter folder name (e.g., "Biology")
- [ ] Add optional description
- [ ] Select a color
- [ ] Click "Create"
- [ ] Verify folder appears in list
- [ ] Verify folder count increments (+1)

**Edit Folder:**
- [ ] Click folder to expand/view contents
- [ ] Click edit button (pencil icon)
- [ ] Change folder name
- [ ] Click save
- [ ] Verify name updates immediately

**Delete Folder:**
- [ ] Click delete button on folder
- [ ] Confirm deletion in alert
- [ ] Verify folder removed from list
- [ ] Verify count decrements

**Move Card to Folder:**
- [ ] Go to "My Cards" tab (create or upload a file first, then save it)
- [ ] Click folder icon (📁) next to a card
- [ ] Select folder from dropdown
- [ ] Verify folder's card count increases

### Test 3: Upload & Save to Library Flow
**Upload File:**
- [ ] Go to Dashboard or File Upload component
- [ ] Select a text file (or paste text)
- [ ] Enable at least "Summarize" task
- [ ] Click Analyze
- [ ] Wait for analysis to complete (progress indicator shows "done")

**View Results:**
- [ ] Verify summary displays
- [ ] Verify quiz shows (with "Start Interactive Quiz" button if available)
- [ ] Verify flashcards show (with "Start Flashcard Study" button if available)

**Save to Library:**
- [ ] Click "Save to My Library" button (indigo color)
- [ ] Button should briefly show "Saving..." then "Saved to Library!" (green)
- [ ] Verify upload count increments in My Library dashboard
- [ ] Go to My Library > Uploads tab
- [ ] Verify uploaded document appears in list with correct metadata

### Test 4: My Cards Tab
- [ ] Create or upload a document and save to library
- [ ] Go to My Library > My Cards tab
- [ ] Verify card appears with:
  - Title (from card name or uploaded filename)
  - Quiz count and flashcard count metadata
  - Delete button (Trash icon)
  - Move to Folder button (📁) if folders exist

**Delete Card:**
- [ ] Click trash icon next to card
- [ ] Confirm deletion
- [ ] Verify card removed from list
- [ ] Verify count in "My Cards" decrements

**Move Card to Folder:**
- [ ] Click 📁 button
- [ ] Select a folder
- [ ] Verify success (should reload folders to show updated counts)

### Test 5: All Tab
- [ ] Go to My Library > All tab
- [ ] Verify summary of:
  - Recent folders (up to 3 shown)
  - Recent cards (up to 3 shown)
  - Recent uploads (up to 3 shown)
- [ ] Verify "+" indicators for overflow items (e.g., "+2 more")
- [ ] Empty state message if library is empty

### Test 6: Uploads Tab
- [ ] Go to My Library > Uploads tab
- [ ] Verify all uploaded documents display
- [ ] Verify metadata shows:
  - Filename (title)
  - Summary word count
  - Quiz count
  - Flashcard count
- [ ] "View" button (placeholder for document viewer - click should show alert)
- [ ] Delete button removes document

### Test 7: Data Persistence
- [ ] Create folders, upload documents, save to library
- [ ] Refresh page (F5)
- [ ] Verify all items still appear with correct counts
- [ ] Verify data loads from backend (check Network tab)

### Test 8: Error Handling
**Network Errors:**
- [ ] Temporarily disconnect network
- [ ] Try to fetch library data
- [ ] Verify error message displays (red banner with error text)
- [ ] Reconnect and retry
- [ ] Verify data loads

**Invalid Actions:**
- [ ] Try to create folder with empty name - should show validation alert
- [ ] Try to delete folder - cancel in confirmation - should not delete
- [ ] Try to move card to folder that doesn't exist - backend should return 404 error

### Test 9: Performance
- [ ] Create 10+ folders and 20+ cards
- [ ] Go to "All" tab - should load quickly (< 1 second)
- [ ] Scroll through My Cards tab - should be smooth
- [ ] Check browser console - no errors or warnings

### Test 10: Cross-Tab Behavior
- [ ] Open two browser tabs, both on My Library
- [ ] Create a folder in tab 1
- [ ] Refresh tab 2
- [ ] Verify folder appears in tab 2
- [ ] Verify counts match

## Unit Test Checklist

### normalizeQuiz Function
Test file: `apps/frontend/src/components/FileUploadSummary.tsx` (exported)
- [ ] Test: Simple quiz array format
  ```typescript
  const quiz = [{ question: "Q1?", options: ["A", "B"], answer: "A", correct: 0 }];
  expect(normalizeQuiz(quiz)).toHaveLength(1);
  ```

- [ ] Test: Quiz with letter-based answer (A, B, C, D)
  ```typescript
  const quiz = [{ question: "Q?", options: ["A", "B"], answer: "B", correct: "B" }];
  // Should infer correct index from letter
  ```

- [ ] Test: Quiz with string-based answer (full answer text)
  ```typescript
  const quiz = [{ question: "Q?", options: ["Option1", "Option2"], answer: "Option1" }];
  // Should match answer text to options
  ```

- [ ] Test: Invalid quiz (empty or malformed) should return []

### normalizeFlashcards Function
Test file: `apps/frontend/src/components/FileUploadSummary.tsx` (exported)
- [ ] Test: Array of strings (important points)
  ```typescript
  const cards = ["Point 1", "Point 2"];
  expect(normalizeFlashcards(cards)).toHaveLength(2);
  ```

- [ ] Test: Array of objects with front/back
  ```typescript
  const cards = [{ front: "Q", back: "A" }];
  expect(normalizeFlashcards(cards)[0].front).toBe("Q");
  ```

- [ ] Test: Mixed formats (strings and objects)
- [ ] Test: Empty or invalid input should return []

## Integration Tests

### End-to-End Flow: Upload → Analyze → Save → Study
1. Start on Dashboard
2. Upload a text file (or paste text content)
3. Select tasks: Summarize, Quiz, Flashcards
4. Click "Analyze"
5. Wait for results (jobStatus = "done")
6. Verify summary, quiz, flashcards display
7. Click "Save to My Library"
8. Verify success feedback
9. Navigate to My Library
10. Verify document appears in "Uploads" tab
11. Verify counts updated (Uploads +1)
12. Go to "My Cards" tab
13. Verify card appears if from PersonalCard (not from upload)
14. Go to "Folders" tab
15. Create a new folder
16. Go to "My Cards" tab
17. Move card to folder
18. Go to "Folders" tab
19. Verify folder now shows +1 card count

## Regression Tests
- [ ] Dashboard still works (upload, analyze, view results)
- [ ] Quiz Player component works correctly (select answer, submit, next, restart)
- [ ] Flashcard Viewer component works correctly (navigate, view key points)
- [ ] Interactive loading UI still displays results during job processing
- [ ] User authentication/login/logout still works
- [ ] Navigation and sidebar updates correctly

## Performance Benchmarks
- [ ] Page load time for My Library: < 1 second
- [ ] Folder creation: < 500ms
- [ ] Document save: < 2 seconds
- [ ] Count endpoint response: < 100ms each

## Browser Compatibility
- [ ] Chrome/Edge (Chromium) - Latest
- [ ] Firefox - Latest
- [ ] Safari - Latest (if available)

## Known Limitations / Future Work
1. Document viewer modal not yet implemented (placeholder "Coming soon")
2. Card regeneration UI in My Cards not yet implemented (edit card metadata)
3. Folder contents modal not yet fully integrated
4. Drag-and-drop for cards to folders planned (currently uses add-card endpoint)
5. Pagination for large libraries not yet implemented
6. Search/filter functionality not yet added

## Sign-Off
- [ ] All manual tests pass
- [ ] No console errors
- [ ] Builds successful (both backend and frontend)
- [ ] Ready for beta testing with users
- [ ] PR created and link documented

---

**Testing Date:** _______________
**Tester Name:** ________________
**Notes/Issues Found:** __________________________________________
