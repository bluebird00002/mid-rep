**Integration Guide**

- **Purpose**: This document explains how to wire the full MiD stack together using Vercel (frontend), Render (backend), Cloudinary (image storage), and Firebase (Firestore for app data). It lists required environment variables, deployment steps, and quick tests.

**Overview**
- **Frontend (Vercel)**: Hosts the React + Vite app built into `dist`. Uses `VITE_API_BASE` to call the API.
- **Backend (Render)**: Runs the Node backend from `backend/` and listens on `process.env.PORT`.
- **Cloudinary**: Stores uploaded image files and serves secure URLs.
- **Firebase (Firestore)**: Stores app data (images metadata, tags, optionally users/memories).

**Environment variables (summary)**
- **Frontend (Vercel)**: `VITE_API_BASE` — URL of your backend API (e.g. `https://mid-api.onrender.com/api`).
- **Backend (Render)**: set these in Render Dashboard → Environment:
  - **`FIREBASE_SERVICE_ACCOUNT`**: base64-encoded Firebase service account JSON (recommended) or raw JSON.
  - **`CLOUDINARY_CLOUD_NAME`**, **`CLOUDINARY_API_KEY`**, **`CLOUDINARY_API_SECRET`**
  - **`CLOUDINARY_FOLDER`** (optional)
  - **`JWT_SECRET`**
  - **`ALLOWED_ORIGINS`** (comma-separated, include your frontend domain)
  - **Optional**: `MAX_FILE_SIZE`, `NODE_ENV`

**Step-by-step integration**

1) Cloudinary setup
- **Create account**: Sign in at `https://cloudinary.com` and obtain `cloud_name`, `api_key`, `api_secret`.
- **Render**: Add `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` to your Render service environment variables.

2) Firebase setup (Firestore)
- **Create project** in Firebase Console → Firestore (Native mode).
- **Create a service account**: Console → Project settings → Service accounts → Generate new private key.
- **Encode and add to Render**: Base64-encode the JSON and set `FIREBASE_SERVICE_ACCOUNT` in Render.

3) Backend (Render) configuration
- **Render service**: Use `render.yaml` (included) or configure web service manually.
- **Build & Start**: The repository contains a `render.yaml` configured to run the backend from `backend/`:
  - Build command: `cd backend && npm install`
  - Start command: `cd backend && npm start` (the repo root `start` runs `backend/index.js`)
- **Env vars**: Add Firebase and Cloudinary vars as above, plus `JWT_SECRET` and `ALLOWED_ORIGINS`.
- **Post-deploy migrations**: If you need SQL tables (legacy MySQL), the repo includes `backend-node/run_migrations.js` which can execute `backend-node/database.sql` — but if you migrate to Firestore for all data you can skip SQL migrations.

4) Frontend (Vercel) configuration
- **Vercel project**: Connect the repo, set `dist` as the output directory (the repo includes `vercel.json`).
- **Environment variable**: Set `VITE_API_BASE` to your backend API, e.g. `https://your-render-service.onrender.com/api`.
- **Deploy**: Vercel will build and deploy the `dist` output.

5) Local tests (before or after deploy)
- Build frontend locally and run backend locally (requires env vars set):
```powershell
# Install deps
npm install
cd backend-node
npm install
# Start backend (reads .env or environment)
node server.js
# In another terminal, build frontend
cd ..
npm run build
# Serve preview (optional)
npm run preview
```

6) Quick API image upload test (curl)
- Use the frontend or curl to POST an image to the API (replace host):
```powershell
$api = "http://localhost:3000/api/images"
curl -X POST $api -H "Authorization: Bearer <TOKEN>" -F "image=@C:\path\to\photo.jpg" -F "description=Test upload"
```

**Data model & migration notes**
- The project now stores image metadata in Firestore (`images` collection) and files in Cloudinary.
- If you want Firestore for all data (recommended): migrate `users`, `memories`, `tags`, `categories` from MySQL to Firestore.
- For a staged migration: keep auth/users in MySQL and migrate other collections to Firestore gradually. I can provide migration scripts on request.

**Security & best practices**
- **Secrets**: Never commit service account JSON or API keys. Use Render and Vercel encrypted env vars.
- **CORS**: Set `ALLOWED_ORIGINS` to include your Vercel domain and localhost for testing.
- **JWT_SECRET**: Use a strong random string and keep it secret.

**Troubleshooting**
- If images fail to upload:
  - Confirm Cloudinary env vars are present in Render.
  - Check backend logs for `Upload image error:` and Cloudinary error messages.
- If Firebase initialization fails:
  - Ensure `FIREBASE_SERVICE_ACCOUNT` is set and correctly encoded; check backend logs for the error printed by the initializer.
- If Vercel build says "No Output Directory named 'build'": ensure `vercel.json` exists (the repo already contains a correct `vercel.json`) or set Output Directory to `dist` in Vercel UI.

**Files added/modified by integration**
- `vercel.json` — makes Vercel use `dist` output.
- `render.yaml` — instructs Render to deploy the backend.
- `backend/index.js` — backend entry used by Render.
- `backend-node/config/firebase.js` — Firebase Admin initializer.
- `backend-node/routes/images.js` — uses Cloudinary + Firestore for images metadata.

**If you want me to continue**
- I can migrate `memories` and `users` to Firestore and provide migration scripts.
- I can add automated deploy hooks to run migrations on Render deploy (if you keep MySQL).

---

If you want, I will commit this file to the repo now.