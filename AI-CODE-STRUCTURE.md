# 📝 AI Integration - Code Structure Reference

## Files Modified & Created

### 1. Frontend: AI Service Module
**File:** `src/services/geminiService.js`  
**Status:** ✨ NEW  
**Size:** ~200 lines

```javascript
// Key Classes & Methods:
class GeminiService {
  initializeContext(username)        // Start conversation with user context
  generateResponse(message, context) // Get AI response for user message
  getIntroGreeting(username)         // Get Mother's greeting
  explainFeature(feature)            // Explain specific features
  validateDiaryScope(message)        // Check if message is diary-related
  getOutOfScopeResponse()            // Redirect off-topic questions
  clearHistory()                     // Reset conversation
  getHistory()                       // Get conversation history
}

export default geminiService; // Singleton instance
```

**Usage in Components:**
```javascript
import geminiService from "../services/geminiService";

// Initialize
geminiService.initializeContext(user.username);

// Get response
const response = await geminiService.generateResponse(userMessage, {
  stage: currentStage,
  isNewUser: true
});
```

---

### 2. Frontend: Intro Page Component
**File:** `src/MiD/AboutMiD.jsx`  
**Status:** ♻️ REDESIGNED  
**Size:** ~500 lines (was 1554)  

**Key Changes:**
```javascript
// Removed:
// - 230+ stages of static MiD character dialogue
// - Automated boot sequence messages
// - Multiple "MiD" speaker instances

// Added:
// - AI service integration
// - Real-time chat interface
// - Dynamic conversation rendering
// - AI loading indicators
// - Message history display
// - Graceful fallback if AI unavailable

// New State:
const [aiEnabled, setAiEnabled] = useState(false);
const [conversationHistory, setConversationHistory] = useState([]);
const [messages, setMessages] = useState([]);
const [aiLoading, setAiLoading] = useState(false);

// New Methods:
const getAIResponse = async (userMessage) => { ... }
const handleUserInput = async (inputValue, ...) => { ... }
const renderMessage = (msg, index) => { ... }
```

**Component Structure:**
```
AboutMiD.jsx
├─ Initialization Effects
│  ├─ Initialize AI service
│  ├─ Get user status (new/returning)
│  └─ Check AI configuration
├─ User Input Handling
│  ├─ Process user messages
│  ├─ Request AI responses
│  └─ Update conversation
├─ Rendering
│  ├─ System initialization messages
│  ├─ Mother's greeting
│  ├─ Message history
│  ├─ Loading indicators
│  └─ User input field
└─ Navigation
   ├─ Skip button
   └─ Auto-proceed to diary
```

---

### 3. Backend: AI Routes
**File:** `backend-node/routes/ai.js`  
**Status:** ✨ NEW  
**Size:** ~300 lines

```javascript
// Endpoints:
POST   /api/ai/chat              // Main chat endpoint
POST   /api/ai/validate-scope    // Check diary-relatedness
GET    /api/ai/status            // Check service status

// Middleware/Processing:
- Initialize Gemini API client
- Build conversation history
- Apply system prompt
- Generate responses
- Error handling & validation
- Rate limiting considerations

// Key Functions:
router.post("/chat", async (req, res) => {
  // 1. Validate input
  // 2. Initialize Gemini model
  // 3. Build message context
  // 4. Apply system prompt
  // 5. Call Gemini API
  // 6. Return response
  // 7. Handle errors
})
```

**Request/Response Examples:**

Chat Request:
```javascript
POST /api/ai/chat
{
  "message": "How do I create a memory?",
  "conversationHistory": [
    { "role": "user", "parts": [{ "text": "..." }] },
    { "role": "model", "parts": [{ "text": "..." }] }
  ],
  "context": {
    "username": "John",
    "isNewUser": true,
    "stage": 5
  }
}

Response:
{
  "success": true,
  "data": {
    "message": "To create a memory...",
    "timestamp": "2024-01-23T10:30:00Z"
  }
}
```

---

### 4. Backend: Server Configuration
**File:** `backend-node/server.js`  
**Status:** ✏️ MODIFIED  
**Changes:** 3 lines added

```javascript
// Added import:
import aiRoutes from "./routes/ai.js";

// Added route mounting:
app.use("/api/ai", aiRoutes);
console.log("✅ AI routes mounted at /api/ai");
```

---

### 5. Backend: Package Dependencies
**File:** `backend-node/package.json`  
**Status:** ✏️ MODIFIED  
**Added Dependency:**

```json
"dependencies": {
  ...existing packages...,
  "@google/generative-ai": "^0.3.0"
}
```

**Install with:** `npm install`

---

### 6. Configuration: Environment Template
**File:** `backend-node/.env.example`  
**Status:** ✨ NEW  
**Size:** ~50 lines

```bash
# Configuration sections:
# - Database
# - Server
# - JWT Authentication
# - Firebase (optional)
# - Cloudinary (optional)
# - Gemini API (REQUIRED for AI)
# - CORS
# - Environment-specific settings

KEY SETTING:
GEMINI_API_KEY=your-gemini-api-key-here
```

---

### 7. Documentation: Setup Guide
**File:** `GEMINI-AI-SETUP.md`  
**Status:** ✨ NEW  
**Size:** ~500 lines

**Sections:**
- Overview & Features
- Prerequisites
- Step-by-step setup (5 steps)
- Verification
- API endpoints documentation
- Customization guides
- Troubleshooting
- Upgrades & pricing

---

### 8. Documentation: Quick Start
**File:** `AI-QUICK-START.md`  
**Status:** ✨ NEW  
**Size:** ~150 lines

**Quick Reference:** Get running in 5 minutes

---

### 9. Documentation: Architecture
**File:** `AI-ARCHITECTURE.md`  
**Status:** ✨ NEW  
**Size:** ~400 lines

**Includes:**
- System overview diagrams
- Component architecture
- Data flow visualization
- Message structures
- State management
- Security considerations
- Performance metrics

---

### 10. Documentation: Integration Summary
**File:** `AI-INTEGRATION-SUMMARY.md`  
**Status:** ✨ NEW  
**Size:** ~300 lines

**Overview:** What was implemented and why

---

### 11. Backup: Old Intro Component
**File:** `src/MiD/AboutMiD.jsx.backup-old`  
**Status:** ARCHIVED  
**Size:** Original 1554 lines

For reference if you need to revert or compare.

---

## Code Statistics

| Aspect | Count |
|--------|-------|
| Files Created | 6 |
| Files Modified | 3 |
| Files Archived | 1 |
| **New Lines of Code** | ~1500 |
| **Documentation** | ~2000 lines |
| **Total Added** | ~3500 lines |

---

## Import Dependencies

### New NPM Package
```bash
npm install @google/generative-ai
```

### New Backend Routes
```javascript
import aiRoutes from "./routes/ai.js";
```

### New Frontend Service
```javascript
import geminiService from "../services/geminiService";
import api from "../services/api";
```

### Existing Dependencies Used
```javascript
// Already in your project:
- React hooks (useState, useEffect, useRef)
- React Router (useNavigate, useLocation)
- Framer Motion (motion, animation)
- Lucide Icons (ChevronRight, Smile, Loader2)
- Type Animation (TypeAnimation)
- Express.js
- Dotenv
```

---

## Configuration Flow

```
User Gets API Key
    ↓
Copy API Key
    ↓
Edit .env file
    ↓
Add GEMINI_API_KEY=xxx
    ↓
npm install @google/generative-ai
    ↓
npm start (backend)
    ↓
Server loads dotenv
    ↓
Routes check for API key
    ↓
POST /api/ai/status returns configured=true
    ↓
Frontend detects AI enabled
    ↓
User sees live AI responses
```

---

## Testing & Verification

### Test AI Service Status
```bash
curl http://localhost:3000/api/ai/status
```

### Test Chat Endpoint
```bash
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "How do I create a memory?",
    "conversationHistory": [],
    "context": {"username": "Test", "isNewUser": true}
  }'
```

### Browser Testing
1. Open DevTools (F12)
2. Go to Network tab
3. Login and go to intro
4. Send message to Mother
5. Observe API request/response

---

## Error Handling Implementation

### Frontend Errors (AboutMiD.jsx)
```javascript
try {
  const response = await geminiService.generateResponse(...);
  if (response.success) {
    // Display message
  } else {
    // Show error, user can retry
  }
} catch (error) {
  // Graceful fallback
  setAiEnabled(false);
}
```

### Backend Errors (ai.js)
```javascript
try {
  // Process Gemini API call
} catch (error) {
  if (error.message.includes("API key")) {
    return res.status(500).json({ error: "Configuration error" });
  }
  if (error.message.includes("quota")) {
    return res.status(429).json({ error: "Rate limit reached" });
  }
  return res.status(500).json({ error: "API error" });
}
```

---

## Deployment Checklist

- [ ] Get Gemini API key
- [ ] Add to environment variables
- [ ] Run `npm install` in backend-node
- [ ] Test with `npm start`
- [ ] Verify `/api/ai/status` returns configured
- [ ] Test intro with user interaction
- [ ] Check browser console for errors
- [ ] Check backend logs for issues
- [ ] Review conversation in DevTools Network tab

---

## File Tree (AI-Related)

```
mid-rep/
├── src/
│   ├── services/
│   │   ├── geminiService.js          (NEW)
│   │   └── api.js                    (unchanged)
│   └── MiD/
│       ├── AboutMiD.jsx              (MODIFIED)
│       └── AboutMiD.jsx.backup-old   (ARCHIVED)
│
├── backend-node/
│   ├── routes/
│   │   ├── ai.js                     (NEW)
│   │   └── ...other routes...
│   ├── server.js                     (MODIFIED)
│   ├── package.json                  (MODIFIED)
│   ├── .env.example                  (NEW)
│   └── .env                          (user creates)
│
├── GEMINI-AI-SETUP.md                (NEW)
├── AI-QUICK-START.md                 (NEW)
├── AI-ARCHITECTURE.md                (NEW)
└── AI-INTEGRATION-SUMMARY.md         (NEW)
```

---

**Reference Last Updated:** January 23, 2026  
**Matches Implementation:** AI Integration v1.0
