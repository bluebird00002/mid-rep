# CORS Fix Instructions

## Problem
Frontend is running on `http://localhost:3001` but backend CORS only allows `http://localhost:5173`.

## Solution Applied
Updated `server.js` to allow all localhost ports for development.

## Manual Fix (If Needed)

### Option 1: Create .env file
Create `backend-node/.env` with:
```env
ALLOWED_ORIGIN=http://localhost:3001,http://localhost:5173
```

### Option 2: Restart Server
After updating server.js, restart:
```bash
# Stop current server (Ctrl+C)
npm run dev
```

The server now automatically allows:
- http://localhost:3001
- http://localhost:5173
- http://localhost:5174
- Any other localhost port (development only)

## Verify
1. Restart backend: `npm run dev`
2. Check console shows: "CORS: Allowing localhost origins"
3. Try registering again

---

**The CORS issue should now be fixed!** ✅

