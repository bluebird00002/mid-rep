# MiD Backend Setup Guide

## Quick Setup for XAMPP

### Step 1: Copy Files
1. Copy the entire `backend` folder to your XAMPP htdocs directory:
   ```
   C:\xampp\htdocs\MiD\
   ```

2. Your structure should look like:
   ```
   C:\xampp\htdocs\MiD\
   ├── api\
   │   ├── config.php
   │   ├── memories.php
   │   ├── images.php
   │   ├── search.php
   │   ├── stats.php
   │   ├── tags.php
   │   ├── categories.php
   │   └── .htaccess
   └── uploads\  (will be created automatically)
   ```

### Step 2: Create Database
1. Open phpMyAdmin: http://localhost/phpmyadmin
2. Create a new database named `mid_diary`
3. Import the SQL file:
   - Go to the `mid_diary` database
   - Click "Import"
   - Select `backend/api/database.sql`
   - Click "Go"

### Step 3: Configure Database
1. Open `backend/api/config.php`
2. Update database credentials if needed:
   ```php
   define('DB_HOST', 'localhost');
   define('DB_USER', 'root');
   define('DB_PASS', '');  // Your MySQL password
   define('DB_NAME', 'mid_diary');
   ```

### Step 4: Set Permissions
1. Create the uploads directory:
   ```
   C:\xampp\htdocs\MiD\uploads\
   ```
2. Make sure it's writable (Windows usually handles this automatically)

### Step 5: Update Frontend API URL
1. Open `src/services/api.js`
2. Verify the API base URL:
   ```javascript
   const API_BASE_URL = 'http://localhost/MiD/api';
   ```

### Step 6: Test the API
1. Start XAMPP (Apache and MySQL)
2. Test the API endpoint:
   ```
   http://localhost/MiD/api/stats.php
   ```
   You should see JSON response with statistics

## Troubleshooting

### CORS Errors
- Make sure `.htaccess` is in the `api` folder
- Check Apache `mod_headers` is enabled

### Database Connection Errors
- Verify MySQL is running in XAMPP
- Check database credentials in `config.php`
- Ensure database `mid_diary` exists

### File Upload Errors
- Check `uploads` directory exists and is writable
- Verify PHP upload limits in `.htaccess`
- Check PHP error logs in XAMPP

### 404 Errors
- Verify file paths are correct
- Check Apache rewrite module is enabled
- Ensure files are in correct location

## Production Deployment

For production:
1. Change `ENCRYPTION_KEY` in `config.php` to a strong random key
2. Update database credentials
3. Set proper file permissions
4. Enable HTTPS
5. Implement authentication
6. Add rate limiting
7. Set up proper error logging

