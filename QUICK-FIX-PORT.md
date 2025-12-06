# Quick Fix: Port 3000 Already in Use

## ✅ Process Killed!

The process using port 3000 has been terminated. You can now:

```bash
cd backend-node
npm run dev
```

## For Future Reference

### Quick Kill (Windows PowerShell)
```powershell
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process -Force
```

### Or Use the Helper Script
```bash
cd backend-node
npm run kill-port
```

### Or Change Port
1. Edit `backend-node/.env`:
   ```env
   PORT=3001
   ```

2. Update `src/services/api.js`:
   ```javascript
   const API_BASE_URL = 'http://localhost:3001/api';
   ```

3. Restart server

---

**Your server should start now!** 🚀

