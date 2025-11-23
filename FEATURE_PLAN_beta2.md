Feature plan for branch beta2

Goal: Implement "My library" tab and related features, replace summary logic with upload option, and add folders/cards functionality.

Scope:
- My Library tab (UI + features)
  - Tabs: "All", "Folders", "My Cards", "Uploads"
  - Clear item counts displayed on folder tiles
  - Card actions: edit, delete, move to folder, add to study queue
  - Folder management: create, rename, delete, list contents
  - Uploads view: list uploaded documents, show status, re-upload

- Replace summary generation logic
  - Add upload option that allows users to upload document and get summary
  - Support progress and interactive loading UI (already present in beta)
  - Ensure summary storage to user's library when requested

- Quiz/Flashcards behavior improvements
  - Verify correct answer detection and normalization (index/letter/text)
  - Make interactive quiz available from library cards
  - Allow setting card counts between 1–10 in library (fix default 1 behavior)

- Usage counts and permissions
  - Verify counts appear correctly in usage for free and premium
  - Enforce limits on free tier; show upgrade CTA when nearing limit

Implementation notes:
- Base branch: main (beta2 created from main)
- Development branch: beta2
- Files to update (initial):
  - apps/frontend/src/pages/DocumentAnalyzerPage.tsx
  - apps/frontend/src/components/FileUploadSummary.tsx
  - apps/frontend/src/components/UnifiedCardDisplay.tsx
  - apps/frontend/src/components/FolderManager.tsx
  - apps/backend/src/routes/documents.ts
  - apps/backend/src/routes/folders.ts
  - apps/backend/src/routes/cards.ts

Testing:
- Unit tests for normalizeQuiz and normalizeFlashcards
- E2E: upload document -> summary appears -> saved to library -> quiz/flashcards generated

Notes:
- Keep interactive loading UI from beta (live quiz and flashcards while processing)
- Work in small commits per feature (upload, summary storage, UI, counts)
