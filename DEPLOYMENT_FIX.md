# 🚀 Deployment Fix - Authentication Error

## Problem
Your Vercel deployment shows "Authentication required" error because:
1. The environment variable `VITE_API_URL` is not set in Vercel
2. The frontend needs to be redeployed with the latest code changes

## ✅ Solution Steps

### Step 1: Set Environment Variable in Vercel

1. Go to your Vercel project dashboard: https://vercel.com/dashboard
2. Select your `learnova` project
3. Go to **Settings** → **Environment Variables**
4. Add a new variable:
   - **Name**: `VITE_API_URL`
   - **Value**: `https://learnova-srwb.onrender.com`
   - **Environment**: Check all (Production, Preview, Development)
5. Click **Save**

### Step 2: Update Backend CORS Settings

1. Go to Render dashboard: https://dashboard.render.com
2. Select your backend service
3. Go to **Environment** section
4. Add/Update this variable:
   - **Key**: `FRONTEND_URL`
   - **Value**: `https://learnova-olive-eight.vercel.app` (your actual Vercel URL)
5. Click **Save Changes**
6. Render will automatically redeploy

### Step 3: Redeploy Frontend

After adding the environment variable in Vercel:

**Option A - Automatic (Recommended)**
```bash
git add .
git commit -m "Fix authentication with axios and env config"
git push origin main
```
Vercel will auto-deploy when you push to GitHub.

**Option B - Manual Redeploy**
1. Go to your Vercel project
2. Click **Deployments** tab
3. Click the three dots on the latest deployment
4. Click **Redeploy**
5. Check **Use existing Build Cache** (uncheck it)
6. Click **Redeploy**

### Step 4: Verify Deployment

After redeployment, test these:

1. **Check Environment Variable**
   - In browser console on your Vercel site, type:
   ```javascript
   console.log(import.meta.env.VITE_API_URL)
   ```
   - Should show: `https://learnova-srwb.onrender.com`

2. **Test Authentication**
   - Login to your deployed site
   - Navigate to **Saved Content** page
   - Should see your saved items (or empty state if none saved)
   - No "Authentication required" error

3. **Test Save Feature**
   - Go to Document Analyzer
   - Upload a document or paste text
   - Generate summary
   - Click "Save Summary"
   - Should save successfully
   - Check Saved Content page to verify

## 🔍 Debugging Tips

### If still showing "Authentication required":

1. **Check Browser Console**
   - Open DevTools (F12)
   - Go to Console tab
   - Look for errors

2. **Check Network Tab**
   - Open DevTools → Network tab
   - Try to load Saved Content page
   - Click on the failed `/api/saved-content` request
   - Check:
     - Request URL (should go to Render backend)
     - Request Headers (should include cookies)
     - Response (check error message)

3. **Verify Cookies**
   - DevTools → Application tab → Cookies
   - Should see session cookies from your backend domain
   - If not, check CORS settings

4. **Check Axios Configuration**
   - The code already uses axios with `withCredentials: true`
   - Configured in `apps/frontend/src/contexts/AuthContext.tsx`

### Common Issues:

**Issue**: CORS error in console
- **Solution**: Make sure `FRONTEND_URL` in Render matches your Vercel URL exactly (including https://)

**Issue**: No cookies being sent
- **Solution**: Check backend has `SESSION_COOKIE_SECURE=true` and `SESSION_COOKIE_SAMESITE=none`

**Issue**: Still using old build
- **Solution**: Clear Vercel build cache and redeploy (Option B above)

## 📋 Backend Environment Variables Checklist

Make sure these are set in Render:

```env
NODE_ENV=production
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/learnova
SESSION_SECRET=your-long-random-secret-min-32-chars
GEMINI_API_KEY=your-gemini-api-key
FRONTEND_URL=https://learnova-olive-eight.vercel.app
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_SAMESITE=none
PORT=3001
```

## 📋 Frontend Environment Variables Checklist

Make sure these are set in Vercel:

```env
VITE_API_URL=https://learnova-srwb.onrender.com
```

Optional (for limits):
```env
VITE_FREE_TIER_LIMIT=50
VITE_PREMIUM_TIER_LIMIT=500
```

## ✅ Final Verification

Once everything is deployed:

1. ✅ Can login/signup
2. ✅ Can view dashboard
3. ✅ Can save content (summary/quiz/flashcard/qa)
4. ✅ Can view saved content page without errors
5. ✅ Can see only your own saved items
6. ✅ Can delete saved items
7. ✅ Session persists after page refresh

## 🆘 Still Having Issues?

If you've followed all steps and still see errors:

1. Share the browser console error
2. Share the Network tab details for the failed request
3. Verify both backend and frontend URLs
4. Check that you pushed the latest code changes to GitHub
5. Ensure Vercel rebuilt with the new environment variable

---

**Your Backend**: https://learnova-srwb.onrender.com
**Your Frontend**: https://learnova-olive-eight.vercel.app
