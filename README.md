# MiD - My Individual Diary

A powerful, CLI-style personal diary system with encrypted storage, visual memories, and advanced search capabilities.

## Features

### Core Features
- **CLI Interface**: Terminal-style command interface for natural interaction
- **Memory Types**: Support for text, tables, lists, timelines, and images
- **Encrypted Storage**: All memories are encrypted using AES-256
- **Visual Memories**: Upload and store images with descriptions and tags
- **Advanced Search**: Search by content, tags, categories, dates
- **Categories & Tags**: Organize memories with custom categories and tags
- **Command System**: Natural language commands for all operations

### Memory Types
1. **Text Memories**: Simple text entries
2. **Tables**: Structured data (expenses, items, etc.)
3. **Lists**: Task lists, reminders
4. **Timelines**: Chronological event sequences
5. **Images**: Photos with descriptions and tags

## Installation

### Frontend Setup
```bash
npm install
npm run dev
```

### Backend Setup (XAMPP)

1. **Copy Backend Files**
   - Copy `backend` folder to `C:\xampp\htdocs\MiD\`

2. **Create Database**
   - Open phpMyAdmin: http://localhost/phpmyadmin
   - Create database: `mid_diary`
   - Import `backend/api/database.sql`

3. **Configure**
   - Update `backend/api/config.php` with your database credentials
   - Create `uploads` directory: `C:\xampp\htdocs\MiD\uploads\`

4. **Start Services**
   - Start Apache and MySQL in XAMPP
   - Test API: http://localhost/MiD/api/stats.php

See `backend/SETUP.md` for detailed setup instructions.

## Usage

### Basic Commands

#### Create Memory
```
create memory: "Today I went to the park"
create memory in category: happy "I feel great today!"
create memory with tags: family, weekend "Had dinner with family"
```

#### Create Table
```
create table:
columns: item, price
rows:
  - lunch, 5000
  - transport, 2000
```

#### Create List
```
create list:
- finish assignment
- call mom
- buy groceries
```

#### Create Timeline
```
create timeline:
- 8:00 woke up
- 10:00 meeting
- 14:00 lunch
```

#### Save Image
```
save picture:
[select file]
description: "My birthday celebration"
tags: birthday, happy, cake
```

#### Edit Memory
```
edit memory #12: "Updated content"
update memory #5: add: "Additional notes"
```

#### Delete
```
delete memory #3
delete picture #5
```

#### Search/Retrieve
```
Mother, show me memories tagged: family
Mother, bring up my happy moments
Mother, open entries from: December 2023
Mother, search: "graduation"
```

#### System Commands
```
help - Show available commands
clear - Clear terminal
```

## Project Structure

```
kusirye-u web/
├── src/
│   ├── MiD/
│   │   ├── AboutMiD.jsx      # Tutorial system
│   │   ├── MyDiary.jsx       # Main diary interface
│   │   ├── Home.jsx          # Login page
│   │   └── ...
│   ├── components/
│   │   ├── MemoryCard.jsx    # Memory display component
│   │   └── MemoryCard.css
│   ├── services/
│   │   └── api.js            # API service layer
│   └── utils/
│       └── commandParser.js  # Command parser
├── backend/
│   ├── api/
│   │   ├── config.php        # Configuration
│   │   ├── memories.php      # Memory endpoints
│   │   ├── images.php        # Image endpoints
│   │   ├── search.php        # Search endpoint
│   │   └── ...
│   └── uploads/              # Image storage
└── package.json
```

## API Endpoints

### Base URL
```
http://localhost/MiD/api
```

### Endpoints
- `GET /memories.php` - Get all memories
- `POST /memories.php` - Create memory
- `PUT /memories.php?id={id}` - Update memory
- `DELETE /memories.php?id={id}` - Delete memory
- `POST /images.php` - Upload image
- `GET /search.php?q={query}` - Search memories
- `GET /stats.php` - Get statistics

See `backend/README.md` for complete API documentation.

## Development

### Local Storage Fallback
The system includes a local storage fallback for development. If the API is unavailable, memories are stored in browser localStorage.

### Adding New Features
1. Add command parsing in `src/utils/commandParser.js`
2. Add API endpoint in `backend/api/`
3. Update frontend handler in `src/MiD/MyDiary.jsx`
4. Add UI component if needed

## Security

- All data is encrypted using AES-256
- Images stored securely in uploads directory
- SQL injection protection via prepared statements
- CORS configured for API access
- File type validation for uploads

## Technologies

- **Frontend**: React, Vite, Framer Motion
- **Backend**: PHP, MySQL
- **Styling**: CSS3 with CLI aesthetics
- **Fonts**: JetBrains Mono

## License

Private project - All rights reserved

## Support

For issues or questions, refer to:
- `backend/SETUP.md` - Backend setup
- `backend/README.md` - API documentation
- Tutorial system in the app (type "help" in terminal)

---

**MiD** - Your memories, encrypted and organized.
