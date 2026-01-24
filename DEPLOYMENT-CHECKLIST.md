# ✅ AI + Render + Vercel Deployment Checklist

## Quick Summary

Your MiD Diary system is configured for deployment with:
- ✅ Backend on Render (Google Gemini AI enabled)
- ✅ Frontend on Vercel (Vite + React)
- ✅ CORS configured for cross-origin requests
- ✅ Environment variables documented

---

## Step 1: Get Gemini API Key (5 minutes)

**Action Items:**
- [ ] Visit https://makersuite.google.com/app/apikey
- [ ] Create a new API key
- [ ] Copy and save the key somewhere safe

**Free Tier:**
- 60 requests per minute
- No credit card required
- Perfect for personal diary use

---

## Step 2: Deploy Backend to Render (10 minutes)

**Pre-deployment:**
- [ ] Push all code to GitHub/GitLab
- [ ] Ensure `backend-node/` folder exists
- [ ] `render.yaml` file is in root directory

**In Render Dashboard:**
1. [ ] Create new Web Service
2. [ ] Connect your Git repository
3. [ ] Set these environment variables:
   - `NODE_ENV` = `production`
   - `DB_HOST` = Your database host
   - `DB_USER` = Your database user
   - `DB_PASSWORD` = Your database password
   - `DB_NAME` = `mid_diary`
   - `JWT_SECRET` = Strong random string (32+ chars)
   - `GEMINI_API_KEY` = Your Gemini API key **← ENABLES AI**
   - `ALLOWED_ORIGINS` = `http://localhost:5173` (update later)

4. [ ] Click "Deploy"
5. [ ] Wait for deployment (2-5 minutes)
6. [ ] Copy your Render URL: `https://mid-diary-backend.onrender.com`

**Verify it works:**
```bash
curl https://your-render-url.onrender.com/api/ai/status
```

Expected response: `{"success": true, "data": {"configured": true, ...}}`

---

## Step 3: Deploy Frontend to Vercel (10 minutes)

**In Vercel Dashboard:**
1. [ ] Create new project
2. [ ] Import your GitHub repository
3. [ ] Add environment variable:
   - `VITE_API_BASE` = `https://your-render-url.onrender.com/api`

4. [ ] Click "Deploy"
5. [ ] Wait for deployment (3-5 minutes)
6. [ ] Copy your Vercel URL: `https://your-app.vercel.app`

---

## Step 4: Connect Frontend & Backend (5 minutes)

**Back in Render Dashboard:**
1. [ ] Go to your backend service
2. [ ] Edit environment variables
3. [ ] Update `ALLOWED_ORIGINS`:
   ```
   https://your-app.vercel.app
   ```
4. [ ] Save (deployment restarts automatically)

---

## Step 5: Test AI Features (5 minutes)

**In your Vercel app:**
1. [ ] Visit `https://your-app.vercel.app`
2. [ ] Open browser DevTools (F12)
3. [ ] Test AI intro experience
4. [ ] Try asking "Mother" a question
5. [ ] Check Network tab - requests should go to Render URL
6. [ ] Check Console - no CORS errors

**If there are errors:**
- See Troubleshooting section below

---

## Total Time: ~30 minutes

---

## Troubleshooting

### ❌ "AI service not configured"

**Check:**
1. Is `GEMINI_API_KEY` set in Render?
2. Test: `curl https://your-render.onrender.com/api/ai/status`
3. Check Render logs for errors

**Fix:**
- Add `GEMINI_API_KEY` to Render environment
- Restart the service

### ❌ CORS Error in Browser Console

**Check:**
1. Is `ALLOWED_ORIGINS` updated in Render?
2. Does it match your Vercel URL exactly?
3. No trailing slashes!

**Fix:**
```
❌ Wrong: https://your-app.vercel.app/
✅ Right: https://your-app.vercel.app
```

### ❌ Frontend Can't Reach Backend

**Check:**
1. Is `VITE_API_BASE` set in Vercel?
2. Does it match your Render URL?
3. Redeploy Vercel after changing it

**Fix:**
- Verify `VITE_API_BASE=https://your-render-url.onrender.com/api`
- Redeploy Vercel

### ❌ 502 Bad Gateway on Render

**Check Render logs:**
1. Go to Service → Logs
2. Look for error messages
3. Common causes:
   - Database connection failed
   - Missing dependencies
   - Wrong environment variables

**Fix:**
- Verify database credentials
- Run `npm install` locally to test
- Check that all required env vars are set

---

## After Deployment

### Monitor Your App
- **Render Logs**: https://dashboard.render.com → Service → Logs
- **Vercel Logs**: https://vercel.com/dashboard → Deployments
- **Gemini Usage**: https://makersuite.google.com/app/apikey

### Best Practices
- Check logs weekly for errors
- Monitor Gemini API usage (free tier = 60 req/min)
- Keep your API keys secure (never share!)
- Test new features on staging first
- Use custom domains when ready

### Upgrade if Needed
- **Render**: Upgrade from free to paid for better uptime
- **Vercel**: Free tier is plenty for most users
- **Gemini**: Upgrade API limits if needed

---

## Key Files to Know

| File | Purpose |
|------|---------|
| `render.yaml` | Render deployment config (includes GEMINI_API_KEY) |
| `vercel.json` | Vercel deployment config |
| `.env.example` | Template for environment variables |
| `backend-node/server.js` | Express server with CORS configured |
| `src/services/api.js` | Frontend API client (uses VITE_API_BASE) |
| `src/services/geminiService.js` | AI service interface |
| `backend-node/routes/ai.js` | Backend AI endpoints |

---

## Support

- **Render Docs**: https://render.com/docs
- **Vercel Docs**: https://vercel.com/docs
- **Gemini API**: https://ai.google.dev
- **Express.js**: https://expressjs.com

---

**Status**: ✅ Ready to Deploy
**Last Updated**: January 24, 2025
