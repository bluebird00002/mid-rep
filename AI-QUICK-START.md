# 🚀 AI Integration - Quick Start (5 Minutes)

## TL;DR Setup

### Step 1: Get API Key (2 min)
1. Go to: https://makersuite.google.com/app/apikey
2. Click "Create API Key"
3. Copy the key

### Step 2: Configure Backend (2 min)
```bash
cd backend-node
cp .env.example .env
```

Open `.env` and add:
```
GEMINI_API_KEY=paste-your-key-here
```

### Step 3: Install & Run (1 min)
```bash
npm install
npm start
```

### Step 4: Test
1. Login to your diary
2. Go through intro
3. Chat with "Mother" - the AI!

Done! ✅

---

## What You Just Did

- ✅ Integrated **Google Gemini AI** into your diary intro
- ✅ "Mother" AI now responds to user questions
- ✅ Removed static "MiD" character
- ✅ Added intelligent conversation to the onboarding

## The Intro Now Works Like This

```
User Login
    ↓
Welcome Screen  
    ↓
About MiD Page (REDESIGNED)
    System: "Initializing Mother AI..."
    Mother: "Hi! I'm Mother, your AI guide"
    Mother: "What would you like to know about the diary?"
    ↓
User Asks Questions (Live AI Responses!)
    User: "How do I create a memory?"
    Mother: [Intelligent answer from Gemini AI]
    ↓
Continue to Diary
```

## Key Files

| File | What Changed |
|------|--------------|
| `src/MiD/AboutMiD.jsx` | Intro page - now AI-powered |
| `backend-node/routes/ai.js` | NEW - AI endpoints |
| `src/services/geminiService.js` | NEW - AI communication |
| `backend-node/.env.example` | NEW - config template |

## Mother's Capabilities

Mother will help with:
- ✅ "How do I create a memory?"
- ✅ "What features does MiD have?"
- ✅ "Can I add images?"
- ✅ "How do I search memories?"
- ❌ Off-topic: "What's the weather?" → redirects to diary topics

## Free & Unlimited (For Personal Use)

- **Cost:** Free
- **Rate Limit:** 60 requests/minute (plenty for personal use)
- **Model:** Gemini-pro
- **No credit card required**

## Troubleshooting

**"AI Service not configured"**
- Check `.env` has GEMINI_API_KEY
- Restart backend server
- Check for typos in API key

**"Mother not responding"**
- Check backend logs: `npm start` output
- Check browser console: F12 → Console tab
- Verify network request in DevTools → Network tab

**"Responses are slow"**
- Normal! AI takes 1-5 seconds to think
- Loading indicator shown during thinking

---

## Next Level Customization

### Change Mother's Personality
Edit in `backend-node/routes/ai.js`:
```javascript
const MOTHER_SYSTEM_PROMPT = `You are Mother...
// Customize tone here
`;
```

### Change Response Length
Edit in `backend-node/routes/ai.js`:
```javascript
maxOutputTokens: 300,  // Change this
temperature: 0.7,      // Change this (0.0-1.0)
```

### Add More Features
The setup is extensible. You can add:
- Memory auto-summarization
- Smart tag suggestions
- Mood analysis
- Image analysis

See `GEMINI-AI-SETUP.md` for details.

---

## Documentation

- **Full Setup Guide:** [GEMINI-AI-SETUP.md](./GEMINI-AI-SETUP.md)
- **Integration Summary:** [AI-INTEGRATION-SUMMARY.md](./AI-INTEGRATION-SUMMARY.md)
- **API Documentation:** See bottom of GEMINI-AI-SETUP.md

---

## Verify It's Working

```bash
# From any terminal
curl http://localhost:3000/api/ai/status

# Should return:
# {
#   "success": true,
#   "data": {
#     "configured": true,
#     "service": "Google Gemini",
#     "model": "gemini-pro",
#     "status": "ready"
#   }
# }
```

---

**Status:** ✅ Ready to Use!

Your MiD diary now has an intelligent AI assistant. Enjoy! 🎉
