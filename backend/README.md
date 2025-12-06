# MiD Backend API Documentation

## Setup Instructions for XAMPP

1. Copy the `api` folder to your XAMPP `htdocs` directory:
   ```
   C:\xampp\htdocs\MiD\api\
   ```

2. Create the MySQL database:
   ```sql
   CREATE DATABASE mid_diary;
   USE mid_diary;
   ```

3. Import the database schema (see `database.sql`)

4. Update database credentials in `config.php`

5. Ensure PHP extensions are enabled:
   - mysqli
   - json
   - fileinfo

## API Endpoints

### Base URL
```
http://localhost/MiD/api
```

### Memories

#### Create Memory
```
POST /memories.php
Content-Type: application/json

{
  "type": "text|table|list|timeline",
  "content": "Memory content",
  "category": "happy",
  "tags": ["tag1", "tag2"],
  "columns": ["col1", "col2"],  // for table type
  "rows": [["row1", "row2"]],    // for table type
  "items": ["item1", "item2"],   // for list type
  "events": [                    // for timeline type
    {"time": "8:00", "description": "Event"}
  ]
}
```

#### Get All Memories
```
GET /memories.php?category=happy&tags=family&date=2024-01
```

#### Get Single Memory
```
GET /memories.php?id=1
```

#### Update Memory
```
PUT /memories.php?id=1
Content-Type: application/json

{
  "content": "Updated content",
  "category": "sad"
}
```

#### Delete Memory
```
DELETE /memories.php?id=1
```

### Images

#### Upload Image
```
POST /images.php
Content-Type: multipart/form-data

image: [file]
description: "Image description"
tags: ["tag1", "tag2"]
```

#### Get All Images
```
GET /images.php?tags=family&date=2024-01
```

#### Get Single Image
```
GET /images.php?id=1
```

#### Delete Image
```
DELETE /images.php?id=1
```

### Search

#### Search Memories
```
GET /search.php?q=search+term&category=happy&tags=family
```

### Statistics

#### Get Statistics
```
GET /stats.php
```

Returns:
```json
{
  "total_memories": 100,
  "total_images": 25,
  "categories": {"happy": 30, "sad": 10},
  "tags": {"family": 20, "work": 15}
}
```

### Tags

#### Get All Tags
```
GET /tags.php
```

### Categories

#### Get All Categories
```
GET /categories.php
```

## Response Format

All endpoints return JSON:

**Success:**
```json
{
  "success": true,
  "data": {...},
  "message": "Operation successful"
}
```

**Error:**
```json
{
  "success": false,
  "error": "Error message"
}
```

## Security Notes

- All data is encrypted using AES-256
- Images are stored in `uploads/` directory
- Database credentials should be in environment variables
- Implement authentication for production use

