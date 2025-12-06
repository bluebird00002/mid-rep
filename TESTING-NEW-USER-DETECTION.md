# Testing New User Detection - Step by Step

## Quick Test Instructions

### Prerequisites

- Backend running on port 3000 ✅
- Frontend running on port 5173 ✅
- Browser developer tools ready (F12)

---

## Test 1: Brand New User (First Time)

### Step 1: Clear All Previous Data

```javascript
// Open browser console (F12) and run:
localStorage.clear();
sessionStorage.clear();
```

### Step 2: Create New Account

1. Go to http://localhost:5173/MiD/Home
2. Click "Create Account"
3. Fill form:
   - Username: `testuser_001` (unique, timestamp based)
   - Password: `Password123!`
   - Security Questions: Answer all 3 with any responses
4. Click "Create Account" button
5. Should be redirected to login page

### Step 3: First Login

1. Enter credentials:
   - Username: `testuser_001`
   - Password: `Password123!`
2. Open **Browser Console** (F12 → Console tab)
3. Look for logs:
   ```
   DEBUG: User testuser_001 (ID: X) has 0 previous logins
   ✅ Login tracked for user: testuser_001 (ID: X). IP: ...
   ```

### Step 4: Welcome Page Check

1. Should be on Welcome page with intro animation
2. Watch for log:
   ```
   🔍 isNewUser API result: {
     success: true,
     data: {
       isNew: true,
       loginCount: 1,
       createdAt: "..."
     }
   }
   ✅ User status determined - isNew: true loginCount: 1
   ```

### Step 5: Intro Message Check

1. Press any key or touch screen to proceed from Welcome
2. Should see AboutMiD stage messages
3. At stage 11, Mother should say:
   ```
   "My processes indicate you are accessing MiD for the first time.
    Welcome to your personal memory archive."
   ```
4. Look for console log:
   ```
   📍 AboutMiD received isNewUser from Welcome: true
   ```

### ✅ Test 1 Success Criteria

- [x] Login count shows as 0 before login
- [x] Login record inserted successfully
- [x] isNewUser API returns isNew: true, loginCount: 1
- [x] Stage 11 message says "first time"
- [x] No console errors

---

## Test 2: Returning User (Second Login)

### Step 1: Same User Logs In Again

1. Logout (or clear token from localStorage)
2. Go back to login page
3. Enter same credentials:
   - Username: `testuser_001`
   - Password: `Password123!`
4. Open **Browser Console** again

### Step 2: Second Login Check

1. Look for logs:
   ```
   DEBUG: User testuser_001 (ID: X) has 1 previous logins
   ✅ Login tracked for user: testuser_001 (ID: X). IP: ...
   ```
   (Notice: "has 1 previous logins" instead of 0)

### Step 3: Welcome Page Check

1. Watch for log:
   ```
   🔍 isNewUser API result: {
     success: true,
     data: {
       isNew: false,
       loginCount: 2,
       createdAt: "..."
     }
   }
   ✅ User status determined - isNew: false loginCount: 2
   ```

### Step 4: Intro Message Check

1. Proceed from Welcome page
2. At stage 11, Mother should say:
   ```
   "Glad to see you again! It is good to know you are back to explore MiD
    further and strengthen your understanding of your personal history database."
   ```
3. Console log should show:
   ```
   📍 AboutMiD received isNewUser from Welcome: false
   ```

### ✅ Test 2 Success Criteria

- [x] Login count shows as 1 before second login
- [x] New login record inserted (now 2 total)
- [x] isNewUser API returns isNew: false, loginCount: 2
- [x] Stage 11 message says "Glad to see you again"
- [x] No console errors

---

## Test 3: Skip Intro Button

### Step 1: Start Fresh Login

1. Login with new or existing user
2. Should be on Welcome page
3. Proceed to intro (press any key)
4. On intro page, look for "Skip Intro" button

### Step 2: Locate Button

- **Position**: Top-right corner of screen
- **Appearance**: Semi-transparent gray button
- **Text**: "Skip Intro"
- Should appear after animation completes (~2 seconds)

### Step 3: Click Skip Button

1. Click "Skip Intro" button
2. Should immediately redirect to MyDiary
3. No stage transitions
4. No loading delays

### ✅ Test 3 Success Criteria

- [x] Skip button appears in top-right corner
- [x] Button is visible and clickable
- [x] Clicking redirects to MyDiary immediately
- [x] Session data preserved (user logged in)
- [x] No console errors during redirect

---

## Test 4: Database Verification

### Option A: MySQL Command Line

```sql
-- Connect to database
mysql -u root -p
USE mid_diary;

-- Check login_track table exists
SHOW TABLES LIKE 'login_track';

-- View all login records
SELECT * FROM login_track ORDER BY login_time DESC;

-- Count logins per user
SELECT user_id, COUNT(*) as total_logins
FROM login_track
GROUP BY user_id;

-- Check first login for specific user
SELECT * FROM login_track
WHERE user_id = 1
ORDER BY login_time ASC LIMIT 1;
```

### Option B: Check Table Structure

```sql
DESCRIBE login_track;
-- Should show columns: id, user_id, login_time, ip_address, user_agent, login_count
```

### Expected Output

```
| id | user_id | login_time          | ip_address    | user_agent              | login_count |
|----|---------|---------------------|----------------|------------------------|-------------|
| 1  | 1       | 2024-12-05 10:30:00 | 127.0.0.1     | Mozilla/5.0...Chrome   | 1          |
| 2  | 1       | 2024-12-05 10:35:00 | 127.0.0.1     | Mozilla/5.0...Chrome   | 1          |
| 3  | 2       | 2024-12-05 10:40:00 | 192.168.1.100 | Mozilla/5.0...Firefox  | 1          |
```

---

## Console Log Reference

### During Login

```javascript
// Login Endpoint Logs
DEBUG: User username (ID: 42) has 0 previous logins        // First login
DEBUG: User username (ID: 42) has 1 previous logins        // Second login
✅ Login tracked for user: username (ID: 42). IP: 127.0.0.1
```

### During Welcome Page

```javascript
🔍 isNewUser API result: Object
  success: true
  data: Object
    isNew: true                    // First login
    loginCount: 1                  // Number of total logins
    createdAt: "2024-12-05T..."
✅ User status determined - isNew: true loginCount: 1
```

### During isNewUser Check

```javascript
✅ isNewUser check - user_id: 42, loginCount: 1, isNew: true
```

### During AboutMiD

```javascript
📍 AboutMiD received isNewUser from Welcome: true
📍 AboutMiD checking localStorage - userVisited: null
```

---

## Troubleshooting

### Issue: isNew Always Shows false

**Solution**:

1. Check browser console for errors
2. Verify login_track table exists: `SHOW TABLES LIKE 'login_track';`
3. Check backend logs for query errors
4. Verify user_id matches between logins

### Issue: Skip Button Doesn't Appear

**Solution**:

1. Clear browser cache (Ctrl+Shift+Delete)
2. Hard refresh page (Ctrl+Shift+R)
3. Check that currentStage < 230
4. Verify AboutMiD.jsx has latest code

### Issue: Wrong Message Appears

**Solution**:

1. Check browser console for isNewUser value
2. Verify location.state.isNewUser is passed correctly
3. Check stage 11 implementation in AboutMiD
4. Verify Welcome page passes `{ isNewUser, fromWelcome: true }`

### Issue: Login Count Not Incrementing

**Solution**:

1. Verify login records are being inserted:
   `SELECT * FROM login_track WHERE user_id = X;`
2. Check backend console for INSERT errors
3. Verify database connection is working
4. Check MySQL permissions for INSERT

---

## Expected Behavior Summary

| Scenario                  | isNew | Message                                                             |
| ------------------------- | ----- | ------------------------------------------------------------------- |
| Brand new user, 1st login | true  | "My processes indicate you are accessing MiD for the first time..." |
| Same user, 2nd login      | false | "Glad to see you again!..."                                         |
| Same user, 3rd+ login     | false | "Glad to see you again!..."                                         |
| After skip intro          | N/A   | (Direct to MyDiary, no intro shown)                                 |

---

## Test Results Template

### Test Case 1: First Login

- [ ] Login successful
- [ ] Console shows "has 0 previous logins"
- [ ] isNewUser API returns isNew: true, loginCount: 1
- [ ] Stage 11 shows "first time" message
- [ ] No errors in console

**Result**: ✅ PASS / ❌ FAIL

### Test Case 2: Second Login

- [ ] Login successful
- [ ] Console shows "has 1 previous logins"
- [ ] isNewUser API returns isNew: false, loginCount: 2
- [ ] Stage 11 shows "Glad to see you again" message
- [ ] No errors in console

**Result**: ✅ PASS / ❌ FAIL

### Test Case 3: Skip Button

- [ ] Skip button visible
- [ ] Click redirects to MyDiary
- [ ] Session preserved
- [ ] No errors

**Result**: ✅ PASS / ❌ FAIL

---

**Testing Status**: Ready for execution
**All Fixes**: Applied and ready to test
