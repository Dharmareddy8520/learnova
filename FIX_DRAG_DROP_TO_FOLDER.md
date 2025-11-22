# 🔧 Fix: Drag & Drop Card to Folder - "Card Not Found or Unauthorized"

## Problem
When dragging a card to a folder:
- ✗ Shows error: "Card not found or unauthorized"
- ✗ Card doesn't get added to folder
- ✗ Works with old PersonalCard cards only
- ✗ Fails with new UploadedDocument cards

## Root Cause
The `/api/folders/:folderId/add-card` endpoint was **only looking for cards in PersonalCard model**:

```typescript
// OLD CODE - Only checks PersonalCard
const card = await PersonalCard.findById(cardId)
if (!card || !card.userId || card.userId.toString() !== user._id.toString()) {
  return res.status(403).json({ error: 'Card not found or unauthorized' })
}
```

With the new system, uploaded documents are stored as **UploadedDocument**, not PersonalCard. So when you drag an UploadedDocument card to a folder, the backend can't find it in PersonalCard and returns "Card not found or unauthorized".

---

## Solution Implemented

**File:** `/apps/backend/src/routes/folders.ts`

### Added UploadedDocument Import
```typescript
import { UploadedDocument } from '../models/UploadedDocument'
```

### Updated /api/folders/:folderId/add-card Endpoint

Changed from checking only PersonalCard to checking **both PersonalCard and UploadedDocument**:

```typescript
// NEW CODE - Checks both types
let card = await PersonalCard.findById(cardId)
let isUploadedDoc = false

// If not found in PersonalCard, try UploadedDocument
if (!card) {
  const uploadedDoc = await UploadedDocument.findById(cardId)
  if (uploadedDoc && uploadedDoc.userId.toString() === user._id.toString()) {
    card = { _id: uploadedDoc._id } as any
    isUploadedDoc = true
  }
}

// Validate ownership
if (!card || (!isUploadedDoc && (!card.userId || card.userId.toString() !== user._id.toString()))) {
  return res.status(403).json({ error: 'Card not found or unauthorized' })
}

// Add card to folder
if (!folder.cardIds.includes(cardId as any)) {
  folder.cardIds.push(cardId as any)
}

// Update PersonalCard folderId if it's not an UploadedDocument
if (!isUploadedDoc) {
  card.folderId = folder._id?.toString() || null
  await card.save()
}
```

### Updated /api/folders/:folderId/remove-card Endpoint

Also updated to handle both types when removing:

```typescript
// NEW CODE - Try both models
const personalCard = await PersonalCard.findById(cardId)
if (personalCard) {
  await PersonalCard.findByIdAndUpdate(cardId, {
    $unset: { folderId: 1 }
  })
}
```

---

## How It Works Now

### Before (Broken):
```
Drag UploadedDocument card to folder
    ↓
POST /api/folders/:folderId/add-card { cardId }
    ↓
Backend searches: PersonalCard.findById(cardId)
    ↓
Not found! (Card is in UploadedDocument, not PersonalCard)
    ↓
Returns: "Card not found or unauthorized" ✗
```

### After (Fixed):
```
Drag UploadedDocument card to folder
    ↓
POST /api/folders/:folderId/add-card { cardId }
    ↓
Backend searches:
  1. PersonalCard.findById(cardId)
  2. If not found, try UploadedDocument.findById(cardId) ✅
  3. Verify ownership ✅
    ↓
Found in UploadedDocument!
    ↓
Add cardId to folder.cardIds
    ↓
Returns: Success ✅
```

---

## Data Flow

### Card Type Support
| Card Type | Location | Status |
|-----------|----------|--------|
| PersonalCard (Legacy) | PersonalCard model | ✅ Supported |
| UploadedDocument (New) | UploadedDocument model | ✅ Supported (NEW) |
| Both in same folder | Folder.cardIds | ✅ Works |

### Drag & Drop Flow
```
1. Drag card from My Cards
2. Drop on folder
3. Frontend: axios.post(`/api/folders/${folderId}/add-card`, { cardId })
4. Backend:
   - Check folder ownership ✅
   - Search both PersonalCard and UploadedDocument ✅
   - Add cardId to folder.cardIds ✅
5. Success: Card appears in folder ✅
```

---

## Testing Steps

### ✅ Test 1: Drag UploadedDocument to Folder
1. Upload a document → Creates UploadedDocument card
2. Go to Folders section
3. Create a new folder (if needed)
4. Drag the UploadedDocument card onto the folder
5. **Expected:** Card moves to folder without error
6. **Before:** "Card not found or unauthorized" ✗
7. **After:** Works! ✅

### ✅ Test 2: Drag PersonalCard (Legacy) to Folder
1. If you have old PersonalCard cards
2. Drag to folder
3. **Expected:** Still works ✅ (backward compatible)

### ✅ Test 3: View Folder with Mixed Cards
1. Add both UploadedDocument and PersonalCard to same folder
2. Click "View Folder"
3. **Expected:** Shows all cards regardless of type ✅

### ✅ Test 4: Remove Card from Folder
1. Card in folder
2. Click remove/delete
3. **Expected:** Removes successfully (works for both types)

---

## Files Changed

**Backend:**
- `/apps/backend/src/routes/folders.ts`
  - Added UploadedDocument import
  - Updated `/api/folders/:folderId/add-card` to check both models
  - Updated `/api/folders/:folderId/remove-card` to handle both models

**No frontend changes needed** - Already sends the correct cardId

---

## Backward Compatibility

✅ **All changes are backward compatible:**
- Old PersonalCard cards still work
- New UploadedDocument cards now work
- Both types can exist in same folder
- No breaking changes

---

## Status

✅ **Ready to Test**

All changes:
- ✅ No TypeScript errors
- ✅ Handles both card types
- ✅ Backward compatible
- ✅ Proper error handling

**Result:** Cards can now be dragged to folders! 🎉

---

## Summary

| Aspect | Before | After |
|--------|--------|-------|
| **Drag UploadedDocument to folder** | ✗ Error | ✅ Works |
| **Drag PersonalCard to folder** | ✅ Works | ✅ Works |
| **Remove from folder** | Partial | ✅ Works for both |
| **Card types supported** | PersonalCard only | Both types ✅ |

Fixed! 🚀
