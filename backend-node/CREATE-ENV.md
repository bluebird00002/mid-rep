# Create .env File

## Quick Setup

Create a file named `.env` in the `backend-node` folder with this content:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=mid_diary

# JWT Configuration (IMPORTANT!)
JWT_SECRET=mid-super-secret-jwt-key-change-this-in-production-2024
JWT_EXPIRES_IN=7d

# File Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760

# CORS
ALLOWED_ORIGIN=http://localhost:3001,http://localhost:5173,http://localhost:5174
```

## Steps

1. Navigate to `backend-node` folder
2. Create new file named `.env` (no extension, just `.env`)
3. Copy the content above
4. Update `DB_PASSWORD` if your MySQL has a password
5. Restart server: `npm run dev`

## Note

The server will work without .env file (uses defaults), but for production you MUST set a strong JWT_SECRET!

---

**After creating .env, restart the server!**

