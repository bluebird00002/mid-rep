# MiD (My Individual Diary) – Complete Deployment Guide

This guide walks you through deploying both the frontend (React + Vite) and backend (Node.js/Express) **for free** with a lifetime-free domain option.

---

## Table of Contents

1. [Hosting Stack Overview](#hosting-stack-overview)
2. [Prerequisites](#prerequisites)
3. [Part 1: Prepare Your Repository](#part-1-prepare-your-repository)
4. [Part 2: Set Up GitHub](#part-2-set-up-github)
5. [Part 3: Create a Database (PlanetScale)](#part-3-create-a-database-planetscale)
6. [Part 4: Set Up File Storage (Cloudinary)](#part-4-set-up-file-storage-cloudinary)
7. [Part 5: Deploy Frontend (Cloudflare Pages)](#part-5-deploy-frontend-cloudflare-pages)
8. [Part 6: Deploy Backend (Cloudflare Workers)](#part-6-deploy-backend-cloudflare-workers)
9. [Part 7: Wire Everything Together](#part-7-wire-everything-together)
10. [Part 8: Custom Domain (Optional)](#part-8-custom-domain-optional)
11. [Troubleshooting](#troubleshooting)

---

## Hosting Stack Overview

| Component                 | Provider                    | Tier     | Cost  | Notes                                          |
| ------------------------- | --------------------------- | -------- | ----- | ---------------------------------------------- |
| **Frontend (React)**      | Cloudflare Pages            | Free     | $0/mo | Static site hosting, auto-deployments from Git |
| **Backend (Node.js API)** | Cloudflare Workers          | Free     | $0/mo | Serverless functions, global edge execution    |
| **Database (MySQL)**      | PlanetScale                 | Free     | $0/mo | 5GB storage, MySQL-compatible                  |
| **File Storage**          | Cloudinary                  | Free     | $0/mo | 25 GB/month, images + uploads                  |
| **Domain**                | Provider's subdomain (free) | Free     | $0/mo | `yourapp.pages.dev` — lifetime free            |
| **Custom Domain**         | Cloudflare                  | Free DNS | $0/mo | Optional; buy domain separately (~$10–15/year) |

**Why this stack:**

- **Cloudflare Pages + Workers**: Industry-standard, performant, deeply integrated.
- **PlanetScale**: MySQL-compatible, easy migration of existing schema, free tier is generous.
- **Cloudinary**: Handles image uploads and transformations; frees you from managing server storage.
- **Free subdomain**: No hidden costs; you own the full service, not a rented subdomain.

---

## Prerequisites

You'll need accounts for:

- **GitHub** (free)
- **Cloudflare** (free)
- **PlanetScale** (free)
- **Cloudinary** (free)

Download/have ready:

- Git installed on your computer
- Node.js v16+ installed
- PowerShell (Windows) or Terminal (Mac/Linux)
- Text editor or IDE (VS Code recommended)

---

## Part 1: Prepare Your Repository

### Step 1a: Create `.env.example` file (for reference)

In the root of your project, create `.env.example`:

```bash
# Frontend (Vite)
VITE_API_BASE=https://your-api.example.com/api

# Backend (Node.js)
PORT=3000
DB_HOST=your-db-host.psdb.cloud
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=mid_diary
JWT_SECRET=your-super-secret-key-here
ALLOWED_ORIGINS=https://your-app.pages.dev,http://localhost:5173

# Cloudinary (for image uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

**Note:** Do NOT commit `.env` itself — only `.env.example`. Add `.env` to `.gitignore`:

```
# .gitignore (add these lines)
.env
.env.local
.env.*.local
node_modules/
dist/
```

### Step 1b: Update frontend API configuration

Edit `src/services/api.js` to support environment-based API URLs:

**Find this section (around line 6–17):**

```javascript
function getAPIBaseURL() {
  const host = window.location.hostname;
  const port = import.meta.env.VITE_API_PORT || 3000;

  if (host === "localhost" || host === "127.0.0.1") {
    return `http://localhost:${port}/api`;
  }

  return `http://${host}:${port}/api`;
}

const API_BASE_URL = getAPIBaseURL();
```

**Replace with:**

```javascript
function getAPIBaseURL() {
  // Use environment variable if set (for production)
  if (import.meta.env.VITE_API_BASE) {
    return import.meta.env.VITE_API_BASE;
  }

  // Fallback for local development
  const host = window.location.hostname;
  const port = import.meta.env.VITE_API_PORT || 3000;

  if (host === "localhost" || host === "127.0.0.1") {
    return `http://localhost:${port}/api`;
  }

  return `http://${host}:${port}/api`;
}

const API_BASE_URL = getAPIBaseURL();
```

### Step 1c: Backend environment variables are already set up ✓

Your `backend-node/config/database.js` and `backend-node/server.js` already read from `.env`:

- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `JWT_SECRET`
- `ALLOWED_ORIGINS`
- `PORT`

No changes needed here — the backend is deployment-ready.

### Step 1d: Test locally (optional but recommended)

```powershell
cd 'D:\kusirye-u web'

# Install dependencies
npm install
cd backend-node
npm install
cd ..

# Build frontend
npm run build

# Verify build output
ls dist/
```

---

## Part 2: Set Up GitHub

### Step 2a: Initialize Git (if not already done)

```powershell
cd 'D:\kusirye-u web'

# Check if Git is already initialized
git status

# If not, initialize:
git init
git add .
git commit -m "Initial commit: MiD diary project ready for deployment"
```

### Step 2b: Create a GitHub repository

1. Go to [github.com](https://github.com) → Sign in or create a free account.
2. Click **New Repository** (top right).
3. Name it `mid-diary` (or your choice).
4. Choose **Public** (free tier requires public for Pages CI/CD).
5. Click **Create repository**.

### Step 2c: Push your code to GitHub

```powershell
cd 'D:\kusirye-u web'

# Add GitHub remote
git remote add origin https://github.com/YOUR_USERNAME/mid-diary.git

# Rename branch to main (if needed)
git branch -M main

# Push code
git push -u origin main
```

**Note:** You'll be prompted for GitHub credentials. Use a Personal Access Token (PAT) instead of your password:

- Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic).
- Generate a token with `repo` scope, copy it, and paste when prompted for password.

---

## Part 3: Create a Database (PlanetScale)

### Step 3a: Create a PlanetScale account

1. Visit [planetscale.com](https://planetscale.com) → Sign up (free).
2. Verify your email.

### Step 3b: Create a database

1. In PlanetScale dashboard, click **Create a database**.
2. Name it `mid-diary`.
3. Choose region closest to you.
4. Click **Create database**.

### Step 3c: Set up credentials

1. In your database, go to **Passwords** tab.
2. Click **Create password**.
3. Choose **General** access level.
4. Copy the credentials:
   - **Host**: `xxxxx.psdb.cloud`
   - **Username**: `xxxxx`
   - **Password**: (copy and save securely)

### Step 3d: Run migrations (create tables)

1. Go to **Console** tab in PlanetScale.
2. Open the web console.
3. Copy the entire contents of `backend-node/database.sql` from your project.
4. Paste into the PlanetScale console and run.

**Tables created:**

- `users` (authentication)
- `memories` (diary entries)
- `tags` (entry tags)
- `categories` (memory categories)
- `images` (image metadata)
- `login_track` (login history)

---

## Part 4: Set Up File Storage (Cloudinary)

### Step 4a: Create a Cloudinary account

1. Visit [cloudinary.com](https://cloudinary.com) → Sign up (free).
2. Verify your email.

### Step 4b: Get your credentials

1. In the dashboard, find your **Cloud name**.
2. Go to **Settings** → **API Keys**.
3. Copy:
   - **Cloud name**
   - **API Key**
   - **API Secret** (keep secret!)

### Step 4c: Update backend to use Cloudinary (optional, if you store images)

For now, file uploads in your `backend-node/routes/images.js` save to disk. To switch to Cloudinary:

1. Install Cloudinary SDK:

   ```powershell
   cd backend-node
   npm install cloudinary
   ```

2. Update your image upload route to use Cloudinary instead of local storage.
   - This is optional for deployment; your current approach works if you don't expect heavy image volume.

---

## Part 5: Deploy Frontend (Cloudflare Pages)

### Step 5a: Connect to Cloudflare Pages

1. Visit [dash.cloudflare.com](https://dash.cloudflare.com) → Create account (free) or sign in.
2. In the dashboard, click **Pages** (left sidebar).
3. Click **Create a project** → **Connect to Git**.
4. Authorize GitHub and select your `mid-diary` repository.

### Step 5b: Configure build settings

1. **Project name**: `mid-diary` (or your choice) — this becomes `mid-diary.pages.dev`.
2. **Production branch**: `main`.
3. **Build command**: `npm run build`
4. **Build output directory**: `dist`
5. Leave other fields blank.
6. Click **Save and Deploy**.

### Step 5c: Set environment variables

1. In Cloudflare Pages dashboard, go to your project → **Settings** → **Environment variables**.
2. Add **Production** variable:

   - **Name**: `VITE_API_BASE`
   - **Value**: `https://your-backend-worker.example.com/api` (you'll fill this in after deploying the backend in Part 6)

3. Click **Save**.

### Step 5d: Trigger initial deploy

Cloudflare will automatically deploy your `main` branch. You should see a deployment in progress. Once complete, your app is live at `https://mid-diary.pages.dev` (or your chosen name).

---

## Part 6: Deploy Backend (Cloudflare Workers)

### Step 6a: Install Wrangler

Wrangler is the CLI tool for deploying Cloudflare Workers. Install globally:

```powershell
npm install -g wrangler
```

### Step 6b: Create `wrangler.toml` in backend-node/

In `backend-node/`, create a new file named `wrangler.toml`:

```toml
name = "mid-diary-api"
type = "javascript"
main = "server.js"
compatibility_date = "2024-01-01"

[env.production]
name = "mid-diary-api"
route = "https://api.yourdomain.com/*"

[[triggers.crons]]
cron = "0 */6 * * *"

[build]
command = "npm install"
cwd = "."

[env.production.vars]
PORT = "8787"

[[env.production.r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "mid-diary-uploads"

[triggers]
# No triggers for now
```

### Step 6c: Create `worker.js` adapter

Create `backend-node/worker.js`:

```javascript
import server from "./server.js";

export default {
  fetch: server.fetch.bind(server),
};
```

### Step 6d: Deploy to Cloudflare Workers

```powershell
cd backend-node

# Authenticate (opens browser)
wrangler login

# Deploy
wrangler deploy
```

Once deployed, your API is live at `https://mid-diary-api.YOUR_CLOUDFLARE_ACCOUNT.workers.dev`.

### Step 6e: Set environment variables in Cloudflare Workers

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **mid-diary-api**.
2. Click **Settings** → **Variables**.
3. Add these secrets (use **Encrypt** for sensitive values):

| Name              | Value                                                | Notes                                             |
| ----------------- | ---------------------------------------------------- | ------------------------------------------------- |
| `DB_HOST`         | Your PlanetScale host                                | From Part 3                                       |
| `DB_USER`         | Your PlanetScale username                            | From Part 3                                       |
| `DB_PASSWORD`     | Your PlanetScale password                            | **Encrypt this**                                  |
| `DB_NAME`         | `mid_diary`                                          | Same as PlanetScale DB name                       |
| `JWT_SECRET`      | Generate a strong random string                      | Use: `openssl rand -hex 32` or a password manager |
| `ALLOWED_ORIGINS` | `https://mid-diary.pages.dev,https://yourdomain.com` | Update with your frontend URL                     |

4. Click **Save and deploy**.

---

## Part 7: Wire Everything Together

### Step 7a: Update frontend environment variable

1. Go to Cloudflare Pages → **mid-diary** → **Settings** → **Environment variables**.
2. Update **Production**:

   - **Name**: `VITE_API_BASE`
   - **Value**: `https://mid-diary-api.YOUR_CLOUDFLARE_ACCOUNT.workers.dev/api`

3. Click **Save**.

### Step 7b: Redeploy frontend

1. In Cloudflare Pages, go to **Deployments**.
2. Click the most recent deployment → **...** → **Retry deployment**.
   - Or: push a new commit to GitHub to trigger auto-deploy.

### Step 7c: Test the live app

1. Open `https://mid-diary.pages.dev` in your browser.
2. Try signing up / logging in.
3. Check browser console (F12) for any errors.
4. Verify that API calls go to your Workers URL.

---

## Part 8: Custom Domain (Optional)

### Option A: Use Free Subdomain (Recommended)

Your app is **already live and free forever** at `https://mid-diary.pages.dev`. No additional setup needed.

### Option B: Use a Custom Domain (Optional, ~$10–15/year)

1. **Buy a domain**:

   - Registrars: Namecheap, GoDaddy, Google Domains (~$10–15/year).
   - Avoid "free" domains (Freenom, etc.) — they're unreliable and may be reclaimed.

2. **Point domain to Cloudflare Pages**:

   - In Cloudflare Pages, go to **Settings** → **Custom domain**.
   - Enter your domain (e.g., `mydiary.com`).
   - Follow Cloudflare's DNS setup instructions.

3. **SSL/TLS**:
   - Cloudflare provides **free SSL** — no extra steps needed.
   - Your domain is now accessible at `https://mydiary.com`.

---

## Troubleshooting

### Issue: Frontend builds but shows 404 on deployment

**Solution:** Ensure `build` output directory in Cloudflare Pages matches your Vite config (`dist`).

### Issue: API calls return 401 or CORS errors

**Solution:**

- Check `ALLOWED_ORIGINS` in Cloudflare Workers environment variables.
- Ensure it includes your Cloudflare Pages URL.
- Restart Workers deployment after updating variables.

### Issue: Database connection fails

**Solution:**

- Verify PlanetScale credentials (`DB_HOST`, `DB_USER`, `DB_PASSWORD`).
- Check that your IP is allowed (PlanetScale → **Settings** → **Allowed IP addresses**).
- Ensure `DB_NAME` matches the database name in PlanetScale.

### Issue: Images don't upload

**Solution:**

- Currently, uploads save locally on the server. For serverless (Workers), you must use Cloudinary or R2.
- To use Cloudinary: install SDK, update `routes/images.js`, set Cloudinary credentials in Workers.

### Issue: JWT token errors or auth failing

**Solution:**

- Ensure `JWT_SECRET` is set and identical in Cloudflare Workers.
- Check that login/signup endpoints in your backend are working (test locally first).

### Issue: Build fails on Cloudflare Pages

**Solution:**

- Check deployment logs in Cloudflare Pages → **Deployments** → Click deployment.
- Common issues:
  - Missing dependencies: ensure `npm install` runs.
  - Build command incorrect: verify `npm run build` works locally.
  - Environment variables not set: re-check Part 5c.

---

## Quick Checklist

- [ ] Repository pushed to GitHub (`main` branch)
- [ ] `.env` in `.gitignore` (not committed)
- [ ] `.env.example` created (for reference)
- [ ] `src/services/api.js` updated to read `VITE_API_BASE`
- [ ] PlanetScale database created and migrations run
- [ ] PlanetScale credentials saved securely
- [ ] Cloudflare account created
- [ ] Frontend deployed to Cloudflare Pages
- [ ] Backend deployed to Cloudflare Workers
- [ ] Environment variables set in both Pages and Workers
- [ ] Frontend can reach backend API (test in browser console)
- [ ] Login/signup flow works end-to-end
- [ ] (Optional) Custom domain set up

---

## Production Best Practices

1. **Keep `.env` secret**: Never commit credentials to Git.
2. **Use strong JWT_SECRET**: Generate with `openssl rand -hex 32` or a password manager.
3. **Enable HTTPS**: Cloudflare auto-enables; ensure `ALLOWED_ORIGINS` uses `https://`.
4. **Monitor logs**: Check Cloudflare Pages and Workers dashboards regularly.
5. **Database backups**: PlanetScale provides automatic backups; test restore procedures.
6. **Rate limiting**: Consider adding rate limiting to API routes for security.
7. **Update dependencies**: Periodically run `npm update` and test.

---

## Support & Next Steps

- **Cloudflare Docs**: https://developers.cloudflare.com/pages/
- **PlanetScale Docs**: https://planetscale.com/docs
- **Express.js Docs**: https://expressjs.com/

For issues or questions, check the **Troubleshooting** section above or refer to the provider's documentation.

---

**Deployment Complete!** Your MiD app is now live, free, and ready for users. 🎉
