# ✅ AI Integration - Setup & Verification Checklist

## Pre-Setup Checklist

- [ ] **Node.js installed** - Verify: `node --version` (should be 16+)
- [ ] **npm available** - Verify: `npm --version`
- [ ] **Backend directory exists** - `backend-node/` folder present
- [ ] **Internet connection** - For API key registration and Gemini API calls
- [ ] **Google account** - For creating Gemini API key

---

## Step 1: Get Gemini API Key (2 minutes)

- [ ] Go to: https://makersuite.google.com/app/apikey
- [ ] Click "Create API Key" button
- [ ] Select project or create new one
- [ ] Copy the API key to clipboard
- [ ] Verify key starts with: `AIzaSy...`
- [ ] ✅ **API Key Obtained**

---

## Step 2: Configure Environment (1 minute)

### In terminal/PowerShell:
```bash
cd c:\Users\ellyb\OneDrive\Desktop\mid\mid-rep\backend-node
```

- [ ] Navigate to backend-node directory
- [ ] Check `.env` file exists (if not, copy from `.env.example`)
  ```bash
  # If .env doesn't exist:
  cp .env.example .env
  ```

### Edit `.env` file:
- [ ] Open `.env` in text editor
- [ ] Find line: `GEMINI_API_KEY=`
- [ ] Add your API key: `GEMINI_API_KEY=your-actual-key-here`
- [ ] Save file
- [ ] ✅ **Environment Configured**

---

## Step 3: Install Dependencies (1 minute)

In terminal (backend-node directory):

```bash
npm install
```

- [ ] Command runs without errors
- [ ] Package `@google/generative-ai` listed in output
- [ ] No warnings about vulnerabilities (info warnings OK)
- [ ] `node_modules/` directory created
- [ ] ✅ **Dependencies Installed**

---

## Step 4: Start Backend Server (1 minute)

```bash
npm start
```

- [ ] Server starts successfully
- [ ] Output includes: `✅ AI routes mounted at /api/ai`
- [ ] No error messages in logs
- [ ] Server confirms listening on port 3000
- [ ] Example output:
  ```
  ✅ Auth routes mounted at /api/auth
  ✅ Memories routes mounted at /api/memories
  ...
  ✅ AI routes mounted at /api/ai
  Server is running on port 3000
  ```
- [ ] ✅ **Backend Server Running**

---

## Step 5: Verify AI Service Status (1 minute)

In new terminal window:

```bash
curl http://localhost:3000/api/ai/status
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

- [ ] Request completes successfully
- [ ] `configured` value is `true`
- [ ] `status` shows `ready`
- [ ] ✅ **AI Service Verified**

---

## Step 6: Test with Frontend (2 minutes)

1. Start frontend dev server (in new terminal):
   ```bash
   npm run dev
   ```

2. Open browser to frontend URL (typically http://localhost:5173)

3. **Login with test account** (or create new account)

- [ ] Login successful
- [ ] Redirected to Welcome page
- [ ] Welcome page displays correctly

4. **Go through intro**

- [ ] Click to proceed to intro
- [ ] See initialization messages
- [ ] Mother AI greeting appears: "Greetings, [Username]. I'm Mother, your AI guide for MiD."
- [ ] Mother smiles emoji appears 😊
- [ ] Second Mother message appears with intro explanation
- [ ] Input field ready for user questions
- [ ] ✅ **Frontend Shows AI**

5. **Test AI Conversation**

Ask Mother a question:
- [ ] Type: `How do I create a memory?`
- [ ] Press ENTER
- [ ] User message appears with your name
- [ ] Loading indicator shows while thinking
- [ ] Mother responds with intelligent answer
- [ ] Response is diary-related
- [ ] Response length: 2-4 sentences

6. **Test Off-Topic Redirect**

Ask off-topic question:
- [ ] Type: `What's the weather?`
- [ ] Press ENTER
- [ ] Mother politely redirects to diary topics
- [ ] Doesn't give weather information
- [ ] ✅ **AI Conversation Works**

7. **Test Navigation**

- [ ] Type: `skip` and press ENTER (or click Skip button)
- [ ] Redirects to `/MiD/MyDiary`
- [ ] Diary page loads successfully
- [ ] ✅ **Navigation Works**

---

## Browser Verification Checklist

Open DevTools (F12) while testing intro:

### Console Tab
- [ ] No red error messages
- [ ] Messages show: `✅ AI Service Enabled`
- [ ] No 404 errors for API calls

### Network Tab
1. Filter for: `ai` or `api`
2. Ask Mother a question
3. Look for API requests:
   - [ ] `POST /api/ai/chat` request visible
   - [ ] Status code: `200`
   - [ ] Request payload shows your message
   - [ ] Response shows Mother's message
   - [ ] Response time: 1-5 seconds (normal)

### Application Tab
- [ ] localStorage shows conversation stored
- [ ] sessionStorage shows current page tracking
- [ ] ✅ **Browser Data Verified**

---

## Troubleshooting Verification

If something doesn't work, check:

### Issue: API key error
- [ ] GEMINI_API_KEY in .env is valid
- [ ] No extra spaces or quotes around key
- [ ] Key starts with `AIzaSy`
- [ ] Backend restarted after adding key
- [ ] Try regenerating key from Google AI Studio

### Issue: "AI Service not configured"
- [ ] Check backend terminal for `configured` log
- [ ] Verify `/api/ai/status` returns configured: true
- [ ] Check .env file has GEMINI_API_KEY set
- [ ] Restart backend after .env changes

### Issue: No responses from Mother
- [ ] Check browser console for errors (F12)
- [ ] Check backend logs for error messages
- [ ] Verify network request succeeded (200 status)
- [ ] Check rate limit: max 60 requests/minute

### Issue: Slow responses
- [ ] Normal! Gemini takes 1-5 seconds
- [ ] Loading indicator should show
- [ ] Check internet connection
- [ ] Check if API quota exceeded

---

## Final Verification Summary

### Frontend ✅
- [ ] AboutMiD.jsx loads
- [ ] AI initialization messages show
- [ ] Mother greeting displays
- [ ] User can type messages
- [ ] Can ask questions and get responses
- [ ] Can skip to diary

### Backend ✅
- [ ] Server starts without errors
- [ ] `/api/ai/status` returns configured: true
- [ ] Chat endpoint accepts requests
- [ ] Returns valid responses
- [ ] Error handling works

### Integration ✅
- [ ] Frontend-Backend communication works
- [ ] AI responses are diary-related
- [ ] Off-topic questions are redirected
- [ ] Conversation flows naturally
- [ ] Performance is acceptable

---

## Documentation to Read

1. **Quick Start** (5 min read)
   - File: [AI-QUICK-START.md](./AI-QUICK-START.md)
   - Essential reading for immediate use

2. **Setup Guide** (15 min read)
   - File: [GEMINI-AI-SETUP.md](./GEMINI-AI-SETUP.md)
   - Detailed setup and customization

3. **Architecture** (10 min read)
   - File: [AI-ARCHITECTURE.md](./AI-ARCHITECTURE.md)
   - How everything works under the hood

4. **Code Structure** (15 min read)
   - File: [AI-CODE-STRUCTURE.md](./AI-CODE-STRUCTURE.md)
   - Code organization and file references

5. **Integration Summary** (10 min read)
   - File: [AI-INTEGRATION-SUMMARY.md](./AI-INTEGRATION-SUMMARY.md)
   - Overview of all changes made

---

## Performance Benchmarks

Expected response times:
- [ ] First message: 3-8 seconds (API startup)
- [ ] Subsequent messages: 1-3 seconds (after warmup)
- [ ] Off-topic detection: Same as above
- [ ] Status check: <100ms

---

## Next Steps After Verification

1. **Customize Mother's personality** (optional)
   - Edit system prompt in `backend-node/routes/ai.js`
   - Adjust tone, behavior, constraints

2. **Add more features** (optional)
   - Memory summarization
   - Tag suggestions
   - Mood analysis
   - See [GEMINI-AI-SETUP.md](./GEMINI-AI-SETUP.md#future-enhancements)

3. **Deploy to production** (when ready)
   - Set GEMINI_API_KEY in platform environment
   - Use production database
   - Enable CORS for production domain

4. **Monitor usage** (optional)
   - Track API calls
   - Monitor rate limits
   - Consider caching if high usage

---

## Support Resources

| Issue | Resource |
|-------|----------|
| Gemini API help | https://support.google.com/generativeai |
| API documentation | https://ai.google.dev/tutorials |
| MiD system help | [README.md](./README.md) |
| Setup questions | [GEMINI-AI-SETUP.md](./GEMINI-AI-SETUP.md) |
| Architecture questions | [AI-ARCHITECTURE.md](./AI-ARCHITECTURE.md) |
| Code questions | [AI-CODE-STRUCTURE.md](./AI-CODE-STRUCTURE.md) |

---

## Completion Confirmation

**Once all checks are complete:**

- [ ] All checkboxes above are checked
- [ ] Backend terminal shows no errors
- [ ] Frontend shows AI responses
- [ ] Browser console shows no errors
- [ ] Network requests show 200 status codes
- [ ] Mother AI is conversing with user
- [ ] Navigation works correctly

### 🎉 **SETUP COMPLETE!**

Your MiD diary now has Google Gemini AI integrated!

**Status:** ✅ Ready to Use

Next: Start creating memories and chatting with Mother AI!

---

**Last Updated:** January 23, 2026  
**Setup Time:** ~10 minutes  
**Difficulty:** Easy ✅
