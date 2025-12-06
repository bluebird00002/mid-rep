# Fix Port 3000 Already in Use

## Quick Fix Options

### Option 1: Kill Process Using Port 3000 (Windows)

1. **Find the process:**

   ```powershell
   netstat -ano | findstr :3000
   ```

   This will show something like: `TCP    0.0.0.0:3000    0.0.0.0:0    LISTENING    12345`
   The last number (12345) is the Process ID (PID)

2. **Kill the process:**

   ```powershell
   taskkill /PID 12345 /F
   ```

   Replace 12345 with the actual PID from step 1

3. **Restart your server:**
   ```bash
   npm run dev
   ```

### Option 2: Change Port (Easier)

1. **Edit `.env` file:**

   ```env
   PORT=3001
   ```

2. **Update frontend API URL** in `src/services/api.js`:

   ```javascript
   const API_BASE_URL = "http://localhost:3001/api";
   ```

3. **Restart backend:**
   ```bash
   npm run dev
   ```

### Option 3: One-Line Kill (Windows PowerShell)

```powershell
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process -Force
```

Then restart: `npm run dev`

---

**Recommended**: Use Option 2 (change port) if you want to avoid conflicts in the future.
