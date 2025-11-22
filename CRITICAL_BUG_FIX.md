# CRITICAL BUG FIX: User Context Loss in Async Job

## Problem
**Cards were not getting created because the user context (`req.user`) was being accessed AFTER the response was sent.**

### The Bug
In `/api/analyze` endpoint:
```typescript
// ❌ WRONG - Inside async IIFE, after response sent
;(async () => {
  // ... run analysis jobs ...
  const user = (req as any).user;  // ❌ user is undefined/lost here!
  if (user && user._id) {
    await PersonalCard.create({ userId: user._id, ... });
  }
})();

res.json({ jobId });  // Response sent, req context lost
```

The async job is fire-and-forget, so it runs AFTER the Express response is sent. At that point, the `req` object's user context may be lost or garbage collected.

## Solution
**Capture the user object BEFORE starting the async job:**

```typescript
// ✅ RIGHT - Capture user BEFORE async job
const user = (req as any).user;
console.log('📌 User captured at request start:', { 
  hasUser: !!user, 
  userId: user?._id?.toString?.() || 'none', 
  userEmail: user?.email 
});

;(async () => {
  console.log('🚀 Starting async job:', jobId, 'for user:', user?._id?.toString?.());
  
  // ... run analysis jobs ...
  
  if (user && user._id) {
    await PersonalCard.create({ userId: user._id, ... });  // ✅ user is available!
  }
})();

res.json({ jobId });  // Response sent, but user already captured
```

## Files Changed
- `/apps/backend/src/routes/analyze.ts`
  - **Lines 175-177**: Capture user BEFORE async job starts
  - **Lines 181**: Log user context at job start
  - **Removed lines**: Old `const user = (req as any).user;` inside async job (was line 294)

## Impact
This fix ensures:
1. ✅ User context is available throughout PersonalCard creation
2. ✅ User IDs are properly associated with cards
3. ✅ Cards appear in "My Cards" dashboard for logged-in users
4. ✅ No more silent failures due to missing user context

## Verification
After this fix, when a user uploads and processes a document:
1. User is captured immediately from `req.user`
2. Async job runs with available user context
3. PersonalCard entries are created with correct `userId`
4. Frontend `/api/cards` returns the created cards
5. Cards appear in "My Cards" section

## Log Output
You should now see:
```
📌 User captured at request start: { hasUser: true, userId: ObjectId(...), userEmail: user@example.com }
🚀 Starting async job: [jobId] for user: ObjectId(...)
📝 Creating PersonalCard for summary...
✅ PersonalCard created: summary, ID: ObjectId(...)
```
