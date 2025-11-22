# 📊 Document Upload Limits - Complete Reference

## File Size Limits

### Maximum File Size: **50 MB**

```
UPLOAD_MAX_MB = 50 (configurable via .env)

Location: backend/src/routes/upload.ts (line 10)
Formula: UPLOAD_MAX_MB * 1024 * 1024 = bytes
Example: 50 * 1024 * 1024 = 52,428,800 bytes
```

### Configuration
**File:** `.env` (Backend)
```bash
UPLOAD_MAX_MB=50  # Default: 50 MB
```

If not set, defaults to **50 MB**.

---

## In-Memory Upload Limit: **15 MB**

For in-memory processing (used in `/api/analyze`):
```typescript
const upload = multer({ 
  storage: multer.memoryStorage(), 
  limits: { fileSize: 15 * 1024 * 1024 }  // 15 MB
})
```

**Location:** `/apps/backend/src/routes/analyze.ts` (line 11)

This is a stricter limit than disk uploads for performance reasons.

---

## Word Count Limits

### No Hard Limit on Words
- Documents can contain **unlimited words**
- System processes text up to available model token limits
- AI models (Gemini/HuggingFace) have their own token limits

### Truncation for Model Token Limits
When text exceeds model token limits:
- Text is **automatically truncated** to fit
- User receives warning: `"Input was truncated to X characters to fit the model token limit"`
- Processing continues with truncated text

---

## Supported File Types

✅ **Allowed Extensions:**
- `.txt` - Plain text files
- `.pdf` - PDF documents
- `.doc` - Microsoft Word 97-2003
- `.docx` - Microsoft Word 2007+

❌ **Not Allowed:**
- Images (JPG, PNG, etc.)
- Excel files (XLSX, XLS)
- Other formats

**Location:** `/apps/backend/src/routes/upload.ts` (lines 42-50)

```typescript
const allowedExts = ['.txt', '.pdf', '.doc', '.docx']
const ext = path.extname(file.originalname).toLowerCase()

if (allowedExts.includes(ext)) {
  cb(null, true)
} else {
  cb(new Error(`Unsupported file type. Allowed: ${allowedExts.join(', ')}`))
}
```

---

## Summary of Limits

| Limit | Value | Notes |
|-------|-------|-------|
| **File Size (Disk)** | 50 MB | Configurable via `UPLOAD_MAX_MB` env var |
| **File Size (Memory)** | 15 MB | Used for `/api/analyze` endpoint |
| **Word Count** | Unlimited | Truncated to fit model token limits |
| **File Types** | 4 types | .txt, .pdf, .doc, .docx |
| **Usage Limit** | User tier dependent | Guest: 3/day, Free: 5/day, Premium: Unlimited |

---

## Usage Tier Limits

These are **daily usage limits**, NOT document size limits:

### Guest Users
- **3 operations per day**
- Across all features (summarize, quiz, flashcards, Q&A)
- Env var: `GUEST_LIMIT` (default: 3)

### Free Tier
- **5 operations per day**
- Across all features
- Env var: `FREE_TIER_LIMIT` (default: 5)

### Premium Tier
- **Unlimited** (-1)
- Across all features
- Env var: `PREMIUM_TIER_LIMIT` (default: -1)

**Location:** `/apps/backend/src/routes/ml.ts` (lines 22-35)

```typescript
const GUEST_LIMIT = Number(process.env.GUEST_LIMIT ?? '3')
const FREE_TIER_LIMIT = Number(process.env.FREE_TIER_LIMIT ?? '5')
const PREMIUM_TIER_LIMIT = Number(process.env.PREMIUM_TIER_LIMIT ?? '-1')

function getLimitForRole(role?: string) {
  if (!role) return GUEST_LIMIT
  if (role === 'premium') return PREMIUM_TIER_LIMIT
  return FREE_TIER_LIMIT
}
```

---

## Model Token Limits

AI models have inherent token limits (not document limits):

### Gemini (Google)
- Token limit: ~100,000-200,000 depending on model
- Automatically truncates long documents
- Returns warning if truncation occurs

### HuggingFace (Fallback)
- Token limit: Varies by model
- Typically 512-1024 tokens
- Text truncated automatically

---

## How Limits Work in Practice

### Example 1: 50 MB PDF Upload
```
1. User selects 50 MB PDF file
2. Browser uploads to backend
3. Backend checks: file.size ≤ 50 MB ✅
4. File processed for text extraction
5. PDF text extracted (usually much smaller than 50 MB)
6. Text analyzed by AI model
7. If text > model tokens: auto-truncated ✅
```

### Example 2: 100 MB Word Document
```
1. User selects 100 MB DOCX file
2. Backend checks: 100 MB > 50 MB ❌
3. Error: "File size exceeds maximum 50 MB"
4. Upload rejected
```

### Example 3: Free Tier User, 5 Documents
```
1. User creates 5 summaries (5/5 used)
2. Tries to create 6th summary ❌
3. Error: "Usage limit reached for today"
4. Counter resets at midnight
```

---

## Error Messages

### File Too Large
```
Error: File size exceeds maximum 50 MB
Status: 413 (Payload Too Large)
```

### File Type Not Supported
```
Error: Unsupported file type. Allowed: .txt, .pdf, .doc, .docx
Status: 400 (Bad Request)
```

### Usage Limit Exceeded
```
Error: Usage limit reached for today
Details: { feature: 'summarize', used: 5, limit: 5 }
Status: 403 (Forbidden)
```

### Text Truncation Warning
```
Warning: Input was truncated to 100000 characters to fit the model token limit.
```

---

## Configuration Guide

### To Change Upload Limits

**File:** `.env` (Backend)

```bash
# Maximum file size in MB (default: 50)
UPLOAD_MAX_MB=100

# Usage limits per day
GUEST_LIMIT=3
FREE_TIER_LIMIT=5
PREMIUM_TIER_LIMIT=-1  # -1 means unlimited
```

**Restart backend after changes:**
```bash
cd apps/backend
npm run dev
```

### To Change AI Model Token Limits

This requires modifying AI service configurations in:
- `/apps/backend/src/services/gemini.ts` (for Google Gemini)
- `/apps/backend/src/services/hf.ts` (for HuggingFace)

These are typically set by the model provider and can't be changed by app settings.

---

## FAQs

### Q: Can I upload a 100 MB file?
**A:** No. Maximum is 50 MB. You can change this by setting `UPLOAD_MAX_MB=100` in `.env`, but in-memory processing is limited to 15 MB.

### Q: How many words can a document have?
**A:** Unlimited. However, AI models will truncate text if it exceeds their token limits. You'll see a warning if this happens.

### Q: Why can I only upload 50 MB but in-memory limit is 15 MB?
**A:** Two different routes:
- `/api/upload` uses disk storage (50 MB limit)
- `/api/analyze` uses memory storage (15 MB limit)

The memory limit is for real-time processing to prevent server overload.

### Q: What happens when I reach my daily limit?
**A:** The operation is rejected with error code 403. You can try again tomorrow. Premium users have unlimited access.

### Q: Can I increase the file size limit?
**A:** Yes! Set `UPLOAD_MAX_MB` in `.env` to a higher value (e.g., 100, 200, etc.)

### Q: What if my PDF is 45 MB but extracts to millions of words?
**A:** The extracted text will be processed by the AI model. If it exceeds model token limits, it will be auto-truncated with a warning.

### Q: Do all 3 features (summary, quiz, flashcards) count towards the daily limit?
**A:** Yes. Each feature increments the daily counter. So if you're free tier (5/day limit):
- 2 summaries = 2 used
- 2 quizzes = 4 used
- 1 flashcard = 5 used
- Next attempt = Limit reached ❌

---

## Current Settings (Production)

As of November 19, 2025:

```
File Upload Limit: 50 MB
In-Memory Limit: 15 MB
Guest Daily Limit: 3 operations
Free User Daily Limit: 5 operations
Premium Daily Limit: Unlimited
Supported Formats: .txt, .pdf, .doc, .docx
```

---

## Technical Details

### Upload Flow
```
Client Browser
    ↓ (File selected)
    ↓ (POST /api/upload)
Backend Upload Route
    ↓ (Multer checks size)
    ├─ If > UPLOAD_MAX_MB → Error 413
    ├─ If wrong type → Error 400
    └─ If OK → Store to disk
```

### Analyze Flow
```
Client Browser
    ↓ (Text pasted or file uploaded)
    ↓ (POST /api/analyze)
Backend Analyze Route
    ↓ (Multer in-memory, 15 MB limit)
    ├─ If > 15 MB → Error 413
    └─ If OK → Load to memory
    ↓
Text Processing
    ├─ Extract text
    ├─ Check usage limits
    └─ Send to AI models
    ↓
AI Model Processing
    ├─ Check token limits
    └─ If > tokens → Auto-truncate + warn
    ↓
Results Stored
    └─ PersonalCard created
```

---

## Summary

**Maximum Document Size: 50 MB** (configurable)
**Maximum Words: Unlimited** (truncated to fit AI model tokens)
**Daily Usage Limits: Tier-dependent** (Guest: 3, Free: 5, Premium: ∞)
**File Types: 4 formats** (.txt, .pdf, .doc, .docx)

All limits are enforced server-side for security and performance.

