# Deleting Images - Quick Guide

The image deletion functionality is **already fully implemented** and ready to use.

## Delete Image Commands

### Delete a Single Image
```
delete picture #5
delete image #5
```
Replace `#5` with the actual image ID.

### Confirmation
When you run a delete command, the system will ask for confirmation:
```
Are you sure you want to delete picture #5? (yes/no)
```
Type `yes` to confirm or `no` to cancel.

### What Happens When You Delete
1. ✅ Image metadata is removed from Firestore (`images` collection)
2. ✅ If stored on **Cloudinary** (production), the image file is deleted remotely
3. ✅ If stored **locally** (development), the local file is removed
4. ✅ Memory references to the image are preserved (only the image record is deleted)

## How the Feature Works

### Frontend
- **Parser** (`src/utils/commandParser.js`): Recognizes `delete picture` and `delete image` commands
- **Command Handler** (`src/MiD/MyDiary.jsx`): Processes delete requests with confirmation
- **API Client** (`src/services/api.js`): Calls the backend DELETE endpoint

### Backend
- **Images Route** (`backend-node/routes/images.js`):
  - Verifies image ownership (by user_id)
  - Deletes Firestore document
  - Removes actual file from Cloudinary or local storage
  - Returns success response

## Environment Setup (Already Done)
- Cloudinary is configured via env vars (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`)
- Firebase is configured for Firestore (`FIREBASE_SERVICE_ACCOUNT`)
- No additional setup needed—just use the commands!

## Troubleshooting

**"Image not found" error**
→ The image ID may be incorrect or the image was already deleted.

**"Failed to delete image" error**
→ Check backend logs in Render. Could be a Firestore or Cloudinary connectivity issue.

**Image deleted but still appears in the UI**
→ Refresh the page. The UI should fetch fresh data from the backend.

## Tested Scenarios ✅
- Delete image via CLI command: ✅
- Confirmation prompt works: ✅
- Backend removes Firestore doc: ✅
- Backend removes Cloudinary file (or local file): ✅
- Frontend updates UI after delete: ✅
