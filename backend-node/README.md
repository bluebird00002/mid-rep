# MiD Node.js Backend

Modern, secure backend for MiD Diary System with multi-user support and JWT authentication.

## Features

- ✅ JWT Authentication
- ✅ Multi-user support with data isolation
- ✅ Secure password hashing (bcrypt)
- ✅ Protected API routes
- ✅ File upload handling
- ✅ MySQL database integration
- ✅ CORS configuration
- ✅ Error handling

## Setup

### 1. Install Dependencies
```bash
cd backend-node
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```

Edit `.env` file:
```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=mid_diary
JWT_SECRET=your-super-secret-jwt-key
ALLOWED_ORIGIN=http://localhost:5173
```

### 3. Create Database
1. Open phpMyAdmin or MySQL client
2. Import `database.sql`:
   ```sql
   source backend-node/database.sql
   ```
   Or manually create database and import the SQL file

### 4. Start Server
```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

Server will run on `http://localhost:3000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/verify` - Verify token

### Memories (Protected)
- `GET /api/memories` - Get all memories
- `GET /api/memories/:id` - Get single memory
- `POST /api/memories` - Create memory
- `PUT /api/memories/:id` - Update memory
- `DELETE /api/memories/:id` - Delete memory

### Images (Protected)
- `POST /api/images` - Upload image
- `GET /api/images` - Get all images
- `GET /api/images/:id` - Get single image
- `DELETE /api/images/:id` - Delete image

### Search (Protected)
- `GET /api/search?q=query` - Search memories

### Stats (Protected)
- `GET /api/stats` - Get user statistics

### Tags & Categories (Protected)
- `GET /api/tags` - Get all tags
- `GET /api/categories` - Get all categories

## Authentication

All protected routes require JWT token in header:
```
Authorization: Bearer <token>
```

## Database Schema

- `users` - User accounts
- `memories` - User memories (with user_id)
- `images` - User images (with user_id)
- `tags` - User tags (with user_id)
- `categories` - User categories (with user_id)

All data is isolated by `user_id` foreign key.

## Security Features

- Password hashing with bcrypt (10 rounds)
- JWT tokens with expiration
- SQL injection protection (prepared statements)
- File type validation
- File size limits
- CORS restrictions
- User data isolation

## Development

```bash
# Install dependencies
npm install

# Run with auto-reload
npm run dev

# Run production
npm start
```

## Production Deployment

1. Set `NODE_ENV=production` in `.env`
2. Use strong `JWT_SECRET`
3. Configure proper `ALLOWED_ORIGIN`
4. Use HTTPS
5. Set up process manager (PM2)
6. Configure reverse proxy (nginx)

## Troubleshooting

**Port already in use:**
- Change `PORT` in `.env`

**Database connection error:**
- Check MySQL is running
- Verify credentials in `.env`
- Ensure database exists

**CORS errors:**
- Update `ALLOWED_ORIGIN` in `.env`
- Match frontend URL exactly

**File upload errors:**
- Check `uploads` directory exists
- Verify write permissions
- Check `MAX_FILE_SIZE` in `.env`

