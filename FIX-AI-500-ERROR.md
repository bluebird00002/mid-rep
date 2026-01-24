# 🔧 Fix: AI 500 Error on Render Backend

## Problem
When you ask a question, you get: **POST 500 (Internal Server Error)**

This means Render backend is rejecting the AI request - most likely because `GEMINI_API_KEY` is not set.

---

## Solution: Add GEMINI_API_KEY to Render

### Step 1: Get Your Gemini API Key

1. Go to https://makersuite.google.com/app/apikey
2. Click **"Create API Key"** 
3. Copy the key (looks like: `AIzaSyA-C7Fp0ZUE0ZJ_YfpJy-TQYoTosvTIqPM`)
4. **Save it somewhere safe**

### Step 2: Add to Render Dashboard

1. Go to https://dashboard.render.com
2. Click your **`mid-diary-backend`** service
3. Go to the **Environment** tab
4. Look for existing variables (you should see `DB_HOST`, `JWT_SECRET`, etc.)
5. Click **Add Environment Variable**
   - **Key**: `GEMINI_API_KEY`
   - **Value**: Paste your Gemini API key
6. Click **Save** (service will restart automatically)

### Step 3: Verify It Works

Wait 1-2 minutes for the service to restart, then:

1. Go to your Vercel app
2. Test asking Mother a question
3. Check DevTools → Network tab
4. The `/api/ai/chat` request should return **200** instead of **500**

---

## If It Still Shows 500 Error

Check Render logs for the actual error:

1. In Render dashboard → **Logs** tab
2. Look for error messages
3. Common issues:
   - **"API key not valid"** - Your Gemini API key is wrong or expired
   - **"Invalid API key"** - Re-copy the key from Google AI Studio
   - **"quota exceeded"** - You've hit the free tier limit (60 req/min)

---

## Verifying GEMINI_API_KEY is Set

You can test if the API key is configured:

```bash
curl https://mid-rep.onrender.com/api/ai/status
```

Should return:
```json
{
  "success": true,
  "data": {
    "configured": true,
    "service": "Google Gemini",
    "model": "gemini-pro",
    "status": "ready"
  }
}
```

If `"configured": false`, the `GEMINI_API_KEY` is not set.

---

## Double-Check Your Setup

**Render Environment Variables** (should have):
- ✅ `GEMINI_API_KEY` = Your API key
- ✅ `ALLOWED_ORIGINS` = Your Vercel URL
- ✅ `JWT_SECRET` = Strong secret
- ✅ `DB_HOST`, `DB_USER`, `DB_PASSWORD` = Database credentials

**Vercel Environment Variables** (should have):
- ✅ `VITE_API_BASE` = `https://mid-rep.onrender.com/api`

---

## How the AI Works Now

```
Frontend (Vercel)
    ↓
User asks question
    ↓
POST https://mid-rep.onrender.com/api/ai/chat
    ↓
Render backend checks GEMINI_API_KEY
    ↓
Sends to Google Gemini API
    ↓
Gets response back
    ↓
Returns to frontend
    ↓
Mother answers the question ✨
```

Without `GEMINI_API_KEY` → Server returns 500 error
With `GEMINI_API_KEY` → Everything works!

---

## Free Tier Limits

**Google Gemini Free Tier:**
- 60 requests per minute (plenty for personal use)
- No credit card required
- If you hit the limit, wait a minute and try again

---

## Next Steps

1. ✅ Add GEMINI_API_KEY to Render
2. ⏳ Wait for service to restart (1-2 min)
3. 🧪 Test the AI in your app
4. ✨ Mother should now answer questions!

---

**Last Updated**: January 24, 2025
**Status**: Ready to fix
