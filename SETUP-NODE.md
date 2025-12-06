# MiD Multi-User System Setup Guide

## Complete Setup Instructions

### Backend Setup (Node.js/Express)

1. **Navigate to backend directory**
   ```bash
   cd backend-node
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` file:
   ```env
   PORT=3000
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=mid_diary
   JWT_SECRET=your-super-secret-jwt-key-change-this
   ALLOWED_ORIGIN=http://localhost:5173
   ```

4. **Create Database**
   - Start MySQL (XAMPP or standalone)
   - Open phpMyAdmin: http://localhost/phpmyadmin
   - Create database: `mid_diary`
   - Import `backend-node/database.sql` or run:
     ```sql
     source backend-node/database.sql
     ```

5. **Start Backend Server**
   ```bash
   npm run dev
   ```
   
   Server runs on: `http://localhost:3000`

### Frontend Setup

1. **Install dependencies** (if not already done)
   ```bash
   npm install
   ```

2. **Update API URL** (if needed)
   - Check `src/services/api.js`
   - Should be: `http://localhost:3000/api`

3. **Start Frontend**
   ```bash
   npm run dev
   ```

### First Time Use

1. **Create Account**
   - Navigate to Create Account page
   - Enter username (min 3 chars) and password (min 6 chars)
   - Click "Create"

2. **Login**
   - Use your credentials on Login page
   - You'll be redirected to MyDiary

3. **Start Using**
   - Your username will appear in the CLI prompt
   - All memories are isolated to your account
   - Type `help` for available commands

## Features

✅ **Multi-User Support**
- Each user has isolated data
- Secure authentication with JWT
- Password hashing with bcrypt

✅ **User Interface**
- Username displayed in CLI: `john>` instead of `User>`
- Logout button in terminal header
- Protected routes (redirects to login if not authenticated)

✅ **Security**
- JWT token-based authentication
- Password hashing
- SQL injection protection
- User data isolation

## Troubleshooting

**Backend won't start:**
- Check Node.js is installed: `node --version`
- Verify MySQL is running
- Check database credentials in `.env`
- Ensure port 3000 is available

**Can't connect to database:**
- Verify MySQL is running
- Check credentials in `.env`
- Ensure database `mid_diary` exists
- Test connection: `mysql -u root -p mid_diary`

**Login/Register not working:**
- Check backend is running on port 3000
- Verify CORS settings in `.env`
- Check browser console for errors
- Verify API URL in `src/services/api.js`

**Username not showing:**
- Check user is logged in
- Verify token is stored: `localStorage.getItem('mid_token')`
- Check browser console for auth errors

## API Testing

Test backend is working:
```bash
# Health check
curl http://localhost:3000/api/health

# Register (test)
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"test123"}'
```

## Production Deployment

1. Set `NODE_ENV=production` in `.env`
2. Use strong `JWT_SECRET` (random string)
3. Update `ALLOWED_ORIGIN` to your domain
4. Use HTTPS
5. Set up process manager (PM2)
6. Configure reverse proxy (nginx)

---

**Your MiD system is now ready with full multi-user support!** 🎉

