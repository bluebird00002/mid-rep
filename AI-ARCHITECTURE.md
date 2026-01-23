# 🏗️ AI Integration Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     MiD DIARY SYSTEM                        │
│              (With Gemini AI Integration)                   │
└─────────────────────────────────────────────────────────────┘
```

## Component Architecture

```
┌──────────────────────────────────────────────────────────┐
│                   REACT FRONTEND                         │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────────────────────────────────────┐        │
│  │  src/MiD/AboutMiD.jsx (Intro Page)         │        │
│  │  - Renders message display                 │        │
│  │  - Handles user input                      │        │
│  │  - Manages AI conversation state           │        │
│  └────────────────┬────────────────────────────┘        │
│                   │                                      │
│                   ▼                                      │
│  ┌─────────────────────────────────────────────┐        │
│  │ src/services/geminiService.js               │        │
│  │ - Manages AI service singleton              │        │
│  │ - Handles conversation history              │        │
│  │ - Provides response methods                 │        │
│  │ - Validates message scope                   │        │
│  └────────────────┬────────────────────────────┘        │
│                   │                                      │
│                   ▼                                      │
│  ┌─────────────────────────────────────────────┐        │
│  │      src/services/api.js                    │        │
│  │      (Generic API layer)                    │        │
│  └────────────────┬────────────────────────────┘        │
│                   │                                      │
└───────────────────┼──────────────────────────────────────┘
                    │ HTTP Request
                    │
         ┌──────────▼─────────┐
         │  Network/Internet  │
         └──────────┬─────────┘
                    │ HTTP Response
                    │
┌───────────────────▼──────────────────────────────────────┐
│               EXPRESS BACKEND                            │
│              (Node.js Server)                            │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────────────────────────────────────┐        │
│  │  backend-node/server.js                    │        │
│  │  - Initializes Express app                 │        │
│  │  - Sets up CORS, middleware                │        │
│  │  - Mounts AI routes                        │        │
│  └────────────────┬────────────────────────────┘        │
│                   │                                      │
│                   ▼                                      │
│  ┌─────────────────────────────────────────────┐        │
│  │  backend-node/routes/ai.js                 │        │
│  │  ┌─────────────────────────────────────┐   │        │
│  │  │ POST /api/ai/chat                   │   │        │
│  │  │ - Receives user message             │   │        │
│  │  │ - Sends to Gemini API               │   │        │
│  │  │ - Returns AI response               │   │        │
│  │  └─────────────────────────────────────┘   │        │
│  │  ┌─────────────────────────────────────┐   │        │
│  │  │ POST /api/ai/validate-scope         │   │        │
│  │  │ - Checks if message is diary-related│   │        │
│  │  │ - Returns scope validation result   │   │        │
│  │  └─────────────────────────────────────┘   │        │
│  │  ┌─────────────────────────────────────┐   │        │
│  │  │ GET /api/ai/status                  │   │        │
│  │  │ - Returns AI service status         │   │        │
│  │  │ - Checks API key configuration      │   │        │
│  │  └─────────────────────────────────────┘   │        │
│  └────────────────┬────────────────────────────┘        │
│                   │                                      │
│                   ▼                                      │
│  ┌─────────────────────────────────────────────┐        │
│  │ @google/generative-ai Package              │        │
│  │ - Initializes Gemini API client            │        │
│  │ - Builds message history                   │        │
│  │ - Handles API calls                        │        │
│  └────────────────┬────────────────────────────┘        │
│                   │                                      │
└───────────────────┼──────────────────────────────────────┘
                    │ HTTPS Request
                    │
         ┌──────────▼──────────┐
         │  Google Gemini API  │
         │ (Cloud Service)     │
         └──────────┬──────────┘
                    │ HTTPS Response
                    │
                    ▼
         ┌──────────────────────┐
         │  Gemini AI Model     │
         │  (gemini-pro)        │
         │                      │
         │  - Understands text  │
         │  - Generates responses
         │  - Context aware     │
         └──────────────────────┘
```

## Data Flow for a User Question

```
1. USER ASKS QUESTION
   └─> "How do I create a memory?"

2. REACT CAPTURES INPUT
   └─> AboutMiD.jsx receives input
   └─> Adds to local display

3. SENDS TO BACKEND
   └─> geminiService.generateResponse()
   └─> POST /api/ai/chat
   └─> {
         message: "How do I create a memory?",
         conversationHistory: [...],
         context: { username, stage, isNewUser }
       }

4. BACKEND PROCESSES
   └─> ai.js receives request
   └─> Initializes Gemini client
   └─> Builds message history with system prompt
   └─> Calls Google Gemini API

5. GEMINI AI PROCESSES
   └─> Analyzes user message
   └─> Considers conversation history
   └─> Applies Mother system prompt
   └─> Generates contextual response

6. RESPONSE RETURNS
   └─> Google API → backend-node
   └─> Response: {
         success: true,
         data: {
           message: "To create a memory, use the 'create memory' command..."
         }
       }

7. FRONTEND DISPLAYS
   └─> geminiService updates conversation history
   └─> AboutMiD displays Mother's response
   └─> User sees immediate AI reply
```

## Message Structure

### User Query
```javascript
{
  "message": "How do I create a memory?",
  "conversationHistory": [
    {
      "role": "user",
      "parts": [{ "text": "..." }]
    },
    {
      "role": "model", 
      "parts": [{ "text": "..." }]
    }
  ],
  "context": {
    "username": "John",
    "stage": 5,
    "isNewUser": true
  }
}
```

### AI Response
```javascript
{
  "success": true,
  "data": {
    "message": "To create a memory in MiD, use the 'create memory' command...",
    "timestamp": "2024-01-23T10:30:00Z"
  }
}
```

## State Management

### Frontend State (AboutMiD.jsx)
```javascript
- currentStage: int                // Intro progression
- userInputs: object               // User's typed messages
- messages: array                  // Display message history
- conversationHistory: array       // Gemini conversation context
- aiLoading: boolean              // Loading indicator
- aiEnabled: boolean              // AI service availability
- smileIcon: boolean              // Mother's smile emoji
```

### Backend Context
```javascript
// Built per request and sent to Gemini API:
- username: string                // User's display name
- isNewUser: boolean              // New vs returning user
- stage: number                   // Current intro phase
- conversationHistory: array      // Full message history
```

## Security & Privacy

```
┌─────────────────────────────────────────┐
│         Security Considerations         │
├─────────────────────────────────────────┤
│                                         │
│ API KEY MANAGEMENT                      │
│ ├─ Stored in backend .env file only    │
│ ├─ Never exposed to frontend           │
│ ├─ Not logged or cached                │
│ └─ Safe for environment variables      │
│                                         │
│ DATA TRANSMISSION                       │
│ ├─ All requests use HTTPS/HTTP         │
│ ├─ CORS configured for allowed origins │
│ ├─ Content-Type validation             │
│ └─ Request validation middleware       │
│                                         │
│ SCOPE MANAGEMENT                        │
│ ├─ Mother stays focused on diary       │
│ ├─ Off-topic questions redirected      │
│ ├─ System prompt enforces guardrails   │
│ └─ Validation endpoint available       │
│                                         │
│ ERROR HANDLING                          │
│ ├─ Graceful fallback if AI unavailable │
│ ├─ Rate limiting enforced              │
│ ├─ Error messages user-friendly        │
│ └─ Sensitive info not exposed          │
│                                         │
└─────────────────────────────────────────┘
```

## Deployment Topology

### Development
```
Local Machine
├─ React Dev Server (5173)
├─ Express Backend (3000)
└─ .env with API key
```

### Production
```
Cloud Platform (Render/Heroku/AWS)
├─ React Build (Static)
├─ Express Backend
└─ Environment Variables
    └─ GEMINI_API_KEY (from platform)
```

## Performance Characteristics

```
User Input → Response Time Breakdown:

Frontend Processing:        ~50ms
  ├─ Capture input
  ├─ Update state
  └─ Send request

Network Latency:            ~100ms
  ├─ Request to backend
  └─ Response from backend

Backend Processing:         ~100ms
  ├─ Parse request
  ├─ Validate input
  └─ Format for Gemini API

Gemini API Processing:      1000-5000ms ⏳
  ├─ API receives request
  ├─ AI model thinks
  └─ Generates response

Response Journey Back:      ~100ms

Frontend Rendering:         ~200ms
  ├─ Display response
  ├─ Animate text
  └─ Update UI

TOTAL LATENCY:             ~1500-5500ms
```

## Error Handling Flow

```
User Asks Question
      │
      ▼
Is AI Enabled?
      │
      ├─ YES → Send to Gemini API
      │           │
      │           ▼
      │        API Success?
      │           │
      │           ├─ YES → Return Response
      │           │
      │           └─ NO → Show Error Message
      │                   Suggest Retry
      │
      └─ NO → Show Fallback Message
              "Go to Diary" Button
                  │
                  ▼
              User Continues
```

## Scalability Considerations

```
Current Configuration (Free Tier):
├─ Rate Limit: 60 requests/minute
├─ Suitable for: Personal diary use
└─ Multiple users: Limited

For Higher Load:
├─ Upgrade to paid Gemini API tier
├─ Implement request caching
├─ Add response queuing
├─ Use conversation summarization
└─ Monitor API usage
```

---

**Diagram Last Updated:** January 23, 2026
**Matches Version:** AI Integration v1.0
