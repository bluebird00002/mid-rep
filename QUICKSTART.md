# MiD Quick Start Guide

## Get Started in 5 Minutes

### 1. Frontend (React)
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### 2. Backend (XAMPP)
1. **Start XAMPP**
   - Open XAMPP Control Panel
   - Start Apache and MySQL

2. **Setup Database**
   - Open: http://localhost/phpmyadmin
   - Create database: `mid_diary`
   - Import: `backend/api/database.sql`

3. **Copy Files**
   - Copy `backend` folder to `C:\xampp\htdocs\MiD\`
   - Create folder: `C:\xampp\htdocs\MiD\uploads\`

4. **Test API**
   - Visit: http://localhost/MiD/api/stats.php
   - Should see JSON response

### 3. Start Using
1. Navigate to: http://localhost:5173 (or your dev server port)
2. Go through tutorial or skip to MyDiary
3. Start typing commands!

## First Commands to Try

```
create memory: "This is my first memory in MiD!"

create memory in category: happy "I'm excited to use this system!"

create list:
- Learn MiD commands
- Write daily entries
- Organize my memories

help
```

## Troubleshooting

**API not working?**
- Check XAMPP is running
- Verify database exists
- Check `backend/api/config.php` credentials
- System will use localStorage as fallback

**Images not uploading?**
- Check `uploads` folder exists and is writable
- Verify file size is under 10MB
- Check PHP upload limits

**Commands not working?**
- Type `help` to see available commands
- Check browser console for errors
- Verify API URL in `src/services/api.js`

## Next Steps

- Read full README.md for complete documentation
- Check backend/SETUP.md for detailed backend setup
- Explore all command types in the tutorial
- Customize categories and tags for your needs

---

**Happy Journaling! 📝**

