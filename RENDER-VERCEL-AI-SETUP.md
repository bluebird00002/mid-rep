# 🚀 MiD Diary - Render + Vercel + Gemini AI Deployment Guide

## Overview

This guide walks you through deploying your MiD Diary system with:
- **Backend**: Render (Node.js/Express)
- **Frontend**: Vercel (React/Vite)
- **AI**: Google Gemini API (Free tier)

---

## Prerequisites

- Render account (https://render.com) - Free tier available
- Vercel account (https://vercel.com) - Free tier available
- Google Gemini API key (https://makersuite.google.com/app/apikey)
- Your database credentials (PlanetScale or local MySQL)

---

## Part 1: Set Up Google Gemini API (Required for AI)

### Step 1: Get Free Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Click **"Create API Key"**
3. Select your Google project (or create new)
4. Copy the API key
5. **Keep this safe** - you'll need it for Render environment variables

**Free Tier Details:**
- 60 requests per minute
- Perfect for personal diary use
- No credit card required

---

## Part 2: Deploy Backend to Render

### Step 1: Prepare Your Repository

Ensure you have:
- `backend-node/` folder with your Express server
- `render.yaml` file (provided in your project)
- All code committed to Git (GitHub/GitLab)

### Step 2: Create Render Service

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New+"** → **"Web Service"**
3. **Connect your repository**
   - Click "GitHub" and authorize
   - Select your repository
4. Fill in the form:
   - **Name**: `mid-diary-backend`
   - **Environment**: `Node`
   - **Plan**: Free (or Paid for better uptime)
   - **Build Command**: `cd backend-node && npm install`
   - **Start Command**: `cd backend-node && npm start`

### Step 3: Set Environment Variables on Render

After clicking "Create", you'll see the service dashboard.

Go to **"Environment"** tab and add these variables:

| Key | Value | Notes |
|-----|-------|-------|
| `NODE_ENV` | `production` | Set in render.yaml |
| `DB_HOST` | Your DB host | From PlanetScale or local MySQL |
| `DB_USER` | Your DB user | Database username |
| `DB_PASSWORD` | Your DB password | Database password |
| `DB_NAME` | `mid_diary` | Database name |
| `JWT_SECRET` | Strong random string | e.g., `your-secret-key-min-32-chars` |
| `GEMINI_API_KEY` | Your Gemini API key | **THIS ENABLES AI** |
| `ALLOWED_ORIGINS` | See below | Your Vercel frontend URL |

### Step 4: Set ALLOWED_ORIGINS for CORS

After you deploy to Vercel (see Part 3), update this variable:

```
ALLOWED_ORIGINS=https://your-vercel-app.vercel.app,https://your-custom-domain.com
```

Until then, use:
```
ALLOWED_ORIGINS=http://localhost:5173
```

### Step 5: Deploy

Once environment variables are set, click **"Deploy"**

Wait for deployment to complete. You'll see a URL like:
```
https://mid-diary-backend.onrender.com
```

**Copy this URL** - you need it for Vercel!

### Step 6: Verify Backend is Running

Test the AI status endpoint:
```bash
curl https://mid-diary-backend.onrender.com/api/ai/status
```

Expected response:
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

---

## Part 3: Deploy Frontend to Vercel

### Step 1: Prepare Your Repository

Ensure root directory has:
- `package.json`
- `vite.config.js`
- `src/` folder
- `index.html`
- `vercel.json` (provided in project)

### Step 2: Create Vercel Project

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New"** → **"Project"**
3. **Import your repository**
   - Click on your Git provider
   - Select your repository
4. Click **"Import"**

### Step 3: Configure Environment Variables

In the Vercel dashboard, go to **"Settings"** → **"Environment Variables"**

Add this variable:

| Key | Value |
|-----|-------|
| `VITE_API_BASE` | `https://mid-diary-backend.onrender.com/api` |

Replace with your actual Render backend URL from Part 2, Step 5.

### Step 4: Configure Build Settings

Vercel should auto-detect, but verify:
- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

Click **"Deploy"**

Wait for deployment. You'll get a URL like:
```
https://your-app.vercel.app
```

---

## Part 4: Connect Frontend & Backend

### Step 1: Update Render ALLOWED_ORIGINS

Go back to your Render service dashboard:

1. Click **"Environment"**
2. Edit `ALLOWED_ORIGINS` variable
3. Set it to your Vercel URL:
   ```
   ALLOWED_ORIGINS=https://your-app.vercel.app
   ```
4. Click **"Save"**

This allows your Vercel frontend to communicate with Render backend.

### Step 2: Test the Connection

1. Go to your Vercel app: `https://your-app.vercel.app`
2. Open browser console (F12)
3. Try using the AI features (intro, chat, etc.)
4. Check console for any errors

Common issues & solutions below.

---

## Troubleshooting

### Issue: "AI service not configured" error

**Solution:**
- Check Render environment variables
- Verify `GEMINI_API_KEY` is set correctly
- Test: `curl https://your-backend.onrender.com/api/ai/status`

### Issue: CORS error when calling backend

**Solution:**
- Make sure `ALLOWED_ORIGINS` on Render includes your Vercel URL
- Check that your Vercel URL doesn't have trailing slash in ALLOWED_ORIGINS
- Example: `https://your-app.vercel.app` (NOT `https://your-app.vercel.app/`)

### Issue: Frontend can't find backend

**Solution:**
- Verify `VITE_API_BASE` is set in Vercel environment
- Check it matches your Render URL exactly
- Redeploy Vercel after changing the variable
- Test: Open DevTools → Network tab → check API calls go to correct URL

### Issue: Vercel shows blank page

**Solution:**
- Check Vercel build logs for errors
- Make sure all dependencies are listed in `package.json`
- Verify `index.html` is in root directory
- Check `vite.config.js` configuration

### Issue: 502 Bad Gateway on Render

**Solution:**
- Check Render logs: Dashboard → Service → Logs
- Verify database connection is working
- Make sure `npm install` installs all dependencies
- Check that `backend-node/server.js` starts without errors

---

## How to Use the AI Features

Once deployed, the AI interface includes:

### 1. **Intro Experience**
- New users see "Mother" AI guide
- AI helps users understand diary features
- Warm, conversational tone

### 2. **Chat Interface**
- Ask questions about diary features
- Get help organizing memories
- Receive emotional support prompts

### 3. **Scope Validation**
- AI stays focused on diary-related topics
- Redirects off-topic questions
- Maintains user experience

---

## Monitoring & Maintenance

### Check Backend Health
```bash
curl https://your-backend.onrender.com/api/ai/status
```

### View Logs
- **Render**: Dashboard → Service → Logs
- **Vercel**: Dashboard → Deployment → Logs

### Rate Limiting
- Gemini free tier: 60 requests/minute
- Monitor usage in Google AI Studio
- Upgrade if needed

---

## Security Notes

⚠️ **Important:**

1. **Never commit `.env` files** to Git
2. **Use environment variables** for all secrets
3. **Change `JWT_SECRET`** to a strong random string
4. **Monitor API usage** to prevent unexpected charges
5. **Enable Render free tier limits** to prevent surprise bills
6. **Use HTTPS** in production (both Render & Vercel use it by default)

---

## Production Checklist

Before going to production:

- [ ] Database credentials are correct and secure
- [ ] `JWT_SECRET` is set to a strong random value
- [ ] `GEMINI_API_KEY` is set in Render
- [ ] `VITE_API_BASE` is set in Vercel
- [ ] `ALLOWED_ORIGINS` includes Vercel domain
- [ ] Frontend tests pass: `npm run build`
- [ ] Backend tests pass locally: `npm start` in `backend-node/`
- [ ] AI features work (test intro & chat)
- [ ] Database migrations are applied
- [ ] Custom domain (if any) is configured

---

## Summary

| Component | Service | Status |
|-----------|---------|--------|
| Backend | Render | ✅ Deployed |
| Frontend | Vercel | ✅ Deployed |
| AI | Google Gemini | ✅ Free tier |
| Database | PlanetScale/MySQL | ✅ Connected |

Your MiD Diary system is now live with AI-powered features!

---

## Next Steps

1. **Test Everything**: Use the app thoroughly
2. **Gather Feedback**: Get user feedback
3. **Monitor Logs**: Watch for errors
4. **Plan Scaling**: Upgrade if needed
5. **Add Custom Domain**: Point domain to Vercel

---

## Need Help?

- **Render Docs**: https://render.com/docs
- **Vercel Docs**: https://vercel.com/docs
- **Gemini API Docs**: https://ai.google.dev/tutorials
- **Express.js Docs**: https://expressjs.com/

---

**Last Updated**: January 24, 2025
**Version**: 1.0
