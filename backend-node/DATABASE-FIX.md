# Database SQL Fix

## Issue
MySQL/MariaDB treats `rows` and `columns` as reserved keywords, so they need to be escaped with backticks.

## Solution Applied

The database schema has been updated to use backticks:
```sql
`columns` JSON,
`rows` JSON,
```

## When Importing

If you're importing via phpMyAdmin:
1. The SQL file is already fixed
2. Just import `backend-node/database.sql` normally

If you're using command line:
```bash
mysql -u root -p mid_diary < backend-node/database.sql
```

## If You Already Created the Table

If you already ran the SQL and got an error, drop and recreate:

```sql
DROP TABLE IF EXISTS memories;
-- Then import the fixed database.sql file
```

Or manually fix:
```sql
ALTER TABLE memories 
  CHANGE COLUMN columns `columns` JSON,
  CHANGE COLUMN rows `rows` JSON;
```

## Backend Code

The backend code has been updated to handle these columns correctly:
- Uses backticks in SQL queries
- Uses bracket notation in JavaScript: `row[\`columns\`]`

Everything should work now! ✅

