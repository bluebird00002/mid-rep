# 🤖 Gemini AI Integration Guide for MiD Diary System

## Overview

This guide will help you set up Google Gemini AI integration for your MiD diary system. The AI enhances the intro experience by enabling real-time, intelligent conversations with "Mother," your AI guide.

## What's New

- **AI-Powered Intro**: The introduction screen now features "Mother," an intelligent AI assistant powered by Google Gemini
- **Smart Responses**: Mother responds contextually to user questions about the diary system
- **Scope Management**: The AI stays focused on diary-related topics and politely redirects off-topic questions
- **Out-of-Scope Detection**: Automatic detection of questions outside the diary domain
- **Conversation Memory**: The AI maintains conversation history for better context

## Prerequisites

- Node.js 16+ installed
- Backend running with Express (port 3000)
- A Google account to access Gemini API

## Step-by-Step Setup

### 1. Get Your Free Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Click "Create API Key"
3. Select your project (or create a new one)
4. Copy the API key

**Free Tier Limits:**
- 60 requests per minute
- Sufficient for personal diary use
- No credit card required for free tier

### 2. Configure Environment Variables

1. Navigate to the backend directory:
   ```bash
   cd backend-node
   ```

2. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

3. Edit `.env` and add your Gemini API key:
   ```
   GEMINI_API_KEY=your-api-key-here
   ```

### 3. Install Dependencies

The `@google/generative-ai` package has already been added to `package.json`. Install it:

```bash
npm install
```

### 4. Start the Backend Server

```bash
npm start
# or for development with auto-reload:
npm run dev
```

You should see:
```
✅ AI routes mounted at /api/ai
```

### 5. Verify AI Integration

Test the AI service is working:

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

## How It Works in the Intro

### The Conversation Flow

1. **System Initialization** (automatic)
   - "Initializing Mother AI..."
   - "Connecting to diary core..."
   - "Loading memory interface..."

2. **Mother's Introduction** (automatic)
   - "Greetings, [Username]. I'm Mother, your AI guide for MiD."
   - Mother smiles 😊

3. **AI-Powered Conversation** (user-driven)
   - User can ask anything about the diary
   - Mother responds intelligently
   - Examples:
     - "How do I create a memory?"
     - "What features does the diary have?"
     - "Can I add images?"
     - "How do I search my memories?"

4. **Smart Redirection**
   - If user asks off-topic questions, Mother politely redirects:
     - User: "What's the weather?"
     - Mother: "I'm here to help with your diary. Would you like to know about memory management or diary features?"

5. **Skip at Anytime**
   - Skip button available in top-right
   - Or continue to diary directly

## Architecture

### Frontend (`src/services/geminiService.js`)
- Singleton service for Gemini API communication
- Manages conversation history
- Provides AI response methods
- Handles out-of-scope validation

### Backend (`backend-node/routes/ai.js`)
- Main chat endpoint: `POST /api/ai/chat`
- Scope validation endpoint: `POST /api/ai/validate-scope`
- Status endpoint: `GET /api/ai/status`
- System prompt ensures Mother stays focused on diary topics

### Modified Components
- **AboutMiD.jsx**: Completely redesigned to feature live AI conversations
- Removed static "MiD" character from intro
- Mother is now the primary interactive guide
- Username remains as the user's identifier

## API Endpoints

### 1. Chat Endpoint
```
POST /api/ai/chat
Content-Type: application/json

{
  "message": "User's question here",
  "conversationHistory": [
    { "role": "user", "parts": [{"text": "..."}] },
    { "role": "model", "parts": [{"text": "..."}] }
  ],
  "context": {
    "username": "UserName",
    "stage": 5,
    "isNewUser": true
  }
}

Response:
{
  "success": true,
  "data": {
    "message": "Mother's response",
    "timestamp": "2024-01-23T..."
  }
}
```

### 2. Scope Validation Endpoint
```
POST /api/ai/validate-scope
{
  "message": "User message to validate"
}

Response:
{
  "success": true,
  "data": {
    "isInScope": true,
    "message": "..."
  }
}
```

### 3. Status Endpoint
```
GET /api/ai/status

Response:
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

## Customization

### Modify Mother's Personality

Edit the `MOTHER_SYSTEM_PROMPT` in `backend-node/routes/ai.js`:

```javascript
const MOTHER_SYSTEM_PROMPT = `You are Mother, a warm and intelligent AI assistant...
// Customize the tone, behavior, and constraints here
`;
```

### Change AI Model

To use a different Gemini model, edit `backend-node/routes/ai.js`:

```javascript
const model = genAI.getGenerativeModel({ 
  model: "gemini-pro-vision" // or other available models
});
```

### Adjust Response Length

Edit the generation config in `backend-node/routes/ai.js`:

```javascript
generationConfig: {
  maxOutputTokens: 300,  // Change this value
  temperature: 0.7,      // Adjust creativity (0.0-1.0)
},
```

## Troubleshooting

### "AI Service not configured"
- Ensure `GEMINI_API_KEY` is set in `.env`
- Restart the backend server
- Check backend logs for errors

### "API key not valid"
- Verify the API key is correctly copied from Google AI Studio
- Check for extra spaces or quotes in `.env`
- Regenerate a new key if needed

### "Rate limit exceeded"
- The free tier allows 60 requests/minute
- Implement caching or request throttling for high-traffic scenarios
- Consider upgrading to a paid plan for production

### AI responses are slow
- Gemini API response time varies (typically 1-5 seconds)
- This is normal for cloud AI services
- Loading indicator is displayed during thinking

### Mother doesn't respond to all questions
- Check if question is within diary scope
- Some off-topic questions are intentionally redirected
- Review the system prompt for scope limitations

## Upgrading to Paid Tier

For production use, consider upgrading:

1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Set up billing
3. Increase request limits
4. Get priority support

Pricing starts at $0.0005 per request (gemini-pro).

## Security Notes

- **Never commit `.env` file to version control**
- API keys in `.env` are local-only
- For production, use environment variables in deployment platform
- Render, Heroku, AWS, etc. have secure environment variable management

## Feature Requests & Future Enhancements

Potential additions:
- Multi-turn conversations with memory persistence
- AI-powered memory summarization
- Smart tagging suggestions
- Mood analysis and insights
- Image analysis and auto-tagging
- Voice-to-diary transcription

## Support

For issues with:
- **Gemini API**: Visit [Google AI Help Center](https://support.google.com/generativeai)
- **MiD Integration**: Check `backend-node/routes/ai.js` error logs
- **Frontend**: Check browser console for errors

## References

- [Google Generative AI API Docs](https://ai.google.dev/tutorials/python_quickstart)
- [Gemini Model Documentation](https://ai.google.dev/models)
- [MiD Diary System Documentation](../README.md)
