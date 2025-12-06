# MiD Troubleshooting Guide

## Common Errors and Solutions

### 1. 404 Error / "Failed to fetch" / "Cannot connect to server"

**Problem**: Backend server is not running or API URL is incorrect.

**Solution**:
1. Check if Node.js backend is running:
   ```bash
   cd backend-node
   npm run dev
   ```
   Should see: `MiD API Server running on port 3000`

2. Verify API URL in `src/services/api.js`:
   ```javascript
   const API_BASE_URL = 'http://localhost:3000/api';
   ```

3. Check if port 3000 is available:
   - Windows: `netstat -ano | findstr :3000`
   - If port is in use, change PORT in `backend-node/.env`

### 2. JSON Parse Error / "Unexpected end of JSON input"

**Problem**: Server returned empty response or non-JSON response.

**Solution**:
- This is now fixed in the API service
- Check backend logs for errors
- Verify database connection
- Ensure all required environment variables are set

### 3. Database Connection Error

**Problem**: Cannot connect to MySQL database.

**Solution**:
1. Verify MySQL is running (XAMPP or standalone)
2. Check `.env` file in `backend-node/`:
   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=mid_diary
   ```
3. Test connection:
   ```bash
   mysql -u root -p mid_diary
   ```

### 4. "Username already exists" Error

**Problem**: Trying to register with existing username.

**Solution**: Choose a different username.

### 5. Login Fails / "Invalid username or password"

**Problem**: Wrong credentials or user doesn't exist.

**Solution**:
- Verify username and password
- Check if account was created successfully
- Check backend logs for detailed error

### 6. Token Verification Fails

**Problem**: JWT token expired or invalid.

**Solution**:
- Clear localStorage: `localStorage.removeItem('mid_token')`
- Login again
- Check JWT_SECRET in `.env` matches

### 7. CORS Errors

**Problem**: Browser blocks API requests.

**Solution**:
1. Check `ALLOWED_ORIGIN` in `backend-node/.env`:
   ```env
   ALLOWED_ORIGIN=http://localhost:5173
   ```
   (Match your frontend URL exactly)

2. Restart backend server after changing `.env`

### 8. Images Not Uploading

**Problem**: File upload fails.

**Solution**:
1. Check `uploads` directory exists in `backend-node/`
2. Verify write permissions
3. Check file size (max 10MB)
4. Verify file type (JPEG, PNG, GIF, WebP only)

### 9. Forms Not Submitting

**Problem**: Submit button does nothing.

**Solution**:
- Check browser console for errors
- Verify backend is running
- Check network tab for failed requests
- Ensure all form fields are filled

### 10. Notification Not Showing

**Problem**: Success/error messages not appearing.

**Solution**:
- Check if Notification component is imported
- Verify `useNotification` hook is used
- Check browser console for errors

## Quick Diagnostic Steps

1. **Backend Running?**
   ```bash
   curl http://localhost:3000/api/health
   ```
   Should return: `{"status":"ok","message":"MiD API is running"}`

2. **Database Connected?**
   - Check backend console for connection errors
   - Verify database exists: `SHOW DATABASES;`
   - Check tables: `USE mid_diary; SHOW TABLES;`

3. **Frontend Connected?**
   - Open browser DevTools → Network tab
   - Try login/register
   - Check if requests go to `http://localhost:3000/api/...`

4. **Token Valid?**
   - Check localStorage: `localStorage.getItem('mid_token')`
   - Should be a long JWT string
   - If null, login again

## Still Having Issues?

1. Check backend console for detailed errors
2. Check browser console (F12) for frontend errors
3. Verify all dependencies installed: `npm install` in both frontend and backend
4. Clear browser cache and localStorage
5. Restart both frontend and backend servers

---

**Most Common Issue**: Backend not running!
Always ensure `npm run dev` is running in `backend-node/` directory.

