# MiD — My Individual Diary

MiD is a secure, multi-user memory platform with a command-line interface. Install the repository on any supported computer, sign in to the same account, and retrieve the same Firestore memories and Cloudinary images.

The original React website remains in `src/`. MiD CLI 2 is the recommended interface and uses the hardened Node API in `backend-node/`.

## Architecture

```text
MiD CLI on any PC
  ├─ account sign-in (session stays in memory only)
  └─ HTTPS
          ↓
Node / Express API
  ├─ Firebase Authentication Data + Firestore memories
  └─ authenticated Cloudinary image assets
```

Each account is isolated by the user ID inside its signed JWT. The account password and session token are never stored by the normal online CLI. Legacy offline vaults remain available explicitly with `--local`.

## Install the CLI

Node.js 20.9 or newer is required.

```powershell
git clone <repository-url>
cd mid-rep\cli
npm install
npm install -g .
mid
```

The Sharp image library and platform binary install automatically. See [the complete CLI guide](./cli/README.md) for terminal compatibility and troubleshooting.

## Connect and use

```text
mid> register yourname
mid> add "My first online memory" --tags personal
mid> show --tags personal
mid> image add "C:\Pictures\memory.jpg" --description "A good day"
mid> image list
mid> image show <id>
```

Existing accounts use `login <username>`. Existing MiD CLI 1 local entries can be uploaded once with `sync`.

Run `about` for the platform introduction and `help` for the complete command list.

## Deploy the online API

The backend requires:

- `NODE_ENV=production`
- `JWT_SECRET`
- `FIREBASE_SERVICE_ACCOUNT`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `ALLOWED_ORIGINS`
- `GROQ_API_KEY` for Mother (server-side only)
- optionally `GROQ_MODEL` (defaults to `openai/gpt-oss-120b`)
- `MID_BOOTSTRAP_ADMIN_USERNAME` for the initial trusted superadmin, if administration is enabled

Render configuration is provided in [`render.yaml`](./render.yaml). The web SPA can be built with Vite and deployed using [`vercel.json`](./vercel.json).

```powershell
cd backend-node
npm install
npm start
```

For local development, copy `backend-node/.env.example` to `.env`, configure Firebase and Cloudinary, then connect the CLI to `http://127.0.0.1:3000/api`. Remote HTTP URLs are rejected; production must use HTTPS.

## Image portability

MiD decodes JPEG, PNG, WebP, and GIF files and renders them as terminal pixels:

- True-color ANSI half blocks in capable terminals
- Portable monochrome characters in limited terminals, redirected output, or `--mono` mode
- Full-resolution system viewer through `image show <id> --open`

Windows Terminal with Cascadia Mono gives the best Windows presentation. `MID_ASCII=1` replaces Unicode interface borders when using an older console.

## Security status

The current implementation includes:

- Authenticated and ownership-checked memory/image operations
- Authenticated Cloudinary assets with short-lived signed delivery URLs
- Login, recovery, registration, and AI rate limiting
- Production JWT-secret enforcement
- Production CORS restriction
- Secret-gated legacy administration routes
- Real image-file signature validation
- Multer 2 upload handling
- No request-body or diary-content logging
- Encrypted local session-token storage

Firestore memory text is protected by provider access controls and HTTPS, but is not end-to-end encrypted from server operators. Do not describe the online database as zero-knowledge encryption.

## Tests

```powershell
npm run cli:test
cd backend-node
npm test
```

See [cli/README.md](./cli/README.md) for usage, installation requirements, backup behavior, security boundaries, and all commands.
