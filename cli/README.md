# MiD CLI 2

MiD is a secure, multi-user, command-driven memory library. The CLI keeps its credentials in a locally encrypted vault while memories and images live in the same Firestore and Cloudinary services used by the web application. Sign in from another computer to retrieve the same library.

The terminal uses MiD's website-inspired orange accent for its banner, prompt,
panels, identifiers, and command highlights. Set `NO_COLOR=1` when plain output
is required for accessibility, logging, or terminal compatibility.

## Requirements

- Node.js 20.9 or newer
- A deployed MiD Node backend using HTTPS
- Firebase Admin credentials on the backend
- Cloudinary credentials for durable image storage
- A monospaced terminal font; Cascadia Mono or JetBrains Mono is recommended

Image decoding is provided by Sharp, which is installed automatically with MiD. Sharp publishes prebuilt packages for current Windows, macOS, and common Linux systems. If installation reports a Sharp platform error, follow <https://sharp.pixelplumbing.com/install/>.

## Install from Git

```powershell
git clone <repository-url>
cd mid-rep\cli
npm install
npm install -g .
mid
```

For repository development:

```powershell
cd mid-rep
npm run cli
```

The first launch opens directly to account registration or login. MiD stores only
the server address and last username in `~/.mid/config.json`. Account passwords
and session tokens remain in process memory and are removed when MiD exits.
There is no separate master password for normal online use.

## Online storage

The distributed CLI connects to the shared MiD service at
`https://mid-rep.onrender.com/api` by default. On a new computer, start MiD and
sign in with the same account to access the same memories and images:

```text
mid> register yourname
```

If the account already exists:

```text
mid> login yourname
```

Registration validates each step before continuing. Usernames are 4-24
characters and use lowercase letters, numbers, periods, underscores, or
hyphens, with at least one letter. Account passwords are at least 8 characters
and contain uppercase and lowercase letters, a number, and a symbol, with no
spaces. MiD displays these rules before asking for either value.

A different user registers or logs in with a different username and receives an isolated Firestore library.

Legacy offline vaults still use their original master password and are available
only with `mid --local`. This keeps migration possible without placing a second
password in the normal account flow.

## Administration

`me admin` re-authenticates the signed-in account and works only when that
account already has an `admin` or `superadmin` role. The server issues a
15-minute admin token and audits management actions. Set the trusted account's
username in the server-only `MID_BOOTSTRAP_ADMIN_USERNAME` environment variable,
then complete one normal login to establish the initial superadmin. Never put
this setting or an admin token in the CLI source.

Use `admin help` after elevation. Admins can monitor totals and audit activity
and suspend or restore ordinary accounts. Only a superadmin can grant or revoke
admin roles. No login attempt can promote an unapproved user automatically.

## Mother AI

After signing in, the prompt uses the account name. Type `hello mother` to open
a private conversational session:

```text
elibariki> hello mother
Mother> Hi, elibariki. I'm here. What's on your mind?
elibariki> Remember that I launched my first CLI today, tagged milestone.
Mother> I've saved that memory for you.
```

Mother uses xAI Grok through the authenticated MiD backend. The `XAI_API_KEY`
must exist only in the backend environment; it is never accepted or stored by
the CLI. Mother can search the signed-in user's memories, save text memories
after a clear request, and count the library. Memory content is treated as
untrusted data, and Mother cannot access other users or delete memories. Use
`/exit` or `goodbye mother` to return to MiD commands.

If this computer contains memories created by MiD CLI 1, upload each unsynced entry once with:

```text
mid> sync
```

MiD records the returned online ID locally so repeating `sync` does not intentionally duplicate completed entries.

For local backend development only:

```text
connect http://127.0.0.1:3000/api
```

Self-hosted installations can use `connect https://your-server.example/api` or
set `MID_API_BASE`. A saved `connect` setting takes precedence over the default.

MiD refuses non-HTTPS remote API URLs.

MiD starts waking the configured server silently as soon as the terminal opens.
Safe read requests retry once after a temporary gateway failure. Press Ctrl+C
to cancel the current network command and return to `mid>`; create, update,
upload, and delete requests are never retried automatically because that could
duplicate or repeat a change.

## Memories

```text
add "Today I finished the online CLI" --category work --tags coding,success
list
show all
show f4ec9197
show --tags me
show #me
show --category work
search "finished"
edit f4ec9197 "Updated text"
delete f4ec9197
stats
```

IDs may be shortened to any unique prefix.

Use `--local` with a one-shot command to access memories created by MiD CLI 1 before connecting the online service.

## Images

```text
image add "C:\Pictures\memory.jpg" --description "Birthday" --tags family,happy
image list
image show a4b1c821
image show a4b1c821 --width 60
image show a4b1c821 --mono
image show a4b1c821 --open
image delete a4b1c821
```

MiD resizes the image in memory and renders it with ANSI true-color half blocks. When color is unavailable, `--mono`, `NO_COLOR=1`, `TERM=dumb`, redirected output, or a non-interactive terminal selects portable character rendering.

For the best Windows experience, use Windows Terminal with Cascadia Mono. Older Command Prompt windows may need UTF-8 enabled before launching MiD:

```cmd
chcp 65001
```

If box characters still render incorrectly:

```cmd
set MID_ASCII=1
mid
```

`image show <id> --open` launches the operating system’s full-resolution viewer. Temporary viewer files are private and are automatically removed after 24 hours on a later MiD launch.

## Interface and system commands

```text
about
status
help
clear
passwd
doctor
logout
sync
exit
```

`about` gives normal users a friendly introduction to MiD. `help` explains every
common option with examples; infrastructure details stay in this guide.

## Backend security requirements

Production deployment must define:

- `NODE_ENV=production`
- `JWT_SECRET` as a long random value
- `FIREBASE_SERVICE_ACCOUNT`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `ALLOWED_ORIGINS`
- `MID_BOOTSTRAP_ADMIN_USERNAME` when establishing the first trusted superadmin

The hardened backend rate-limits login, recovery, and AI calls; verifies image ownership; removes body logging; restricts production CORS; and refuses to start without `JWT_SECRET`.

New diary images are uploaded as Cloudinary `authenticated` assets. After checking ownership, the API returns a signed delivery URL that expires after five minutes. Older images uploaded by previous versions may still use public delivery URLs and should be migrated or re-uploaded. Images and Firestore memory text are protected by provider access controls and HTTPS, but are not end-to-end encrypted from the service operators.

## Session and legacy-vault security

- Normal account passwords and bearer tokens remain in memory and are cleared on exit.
- Device settings contain only the API address and last username.
- Admin sessions expire after 15 minutes, require password re-authentication,
  verify the server-side role on every request, and produce audit records.
- Legacy `--local` vaults still use AES-256-GCM, scrypt, atomic writes, and locks.

MiD cannot protect an active session from malware, keyloggers, screen capture,
or a compromised server. The legacy local-vault password cannot be recovered.

## Tests

```powershell
cd cli
npm test
```
