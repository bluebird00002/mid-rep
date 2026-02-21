# Username Migration & Uniqueness Guide

This document explains how to migrate existing `users` documents into a `usernames` collection to enforce case-insensitive uniqueness and enable fast checks.

Why a `usernames` collection?
- Firestore does not support case-insensitive unique constraints. We create a `usernames` collection where each document ID is the lowercase username. This enables atomic transactional checks on registration.

Migration steps
1. Review current `users` collection for username collisions when lowercased.
2. Run the migration script (dry-run first):

```bash
cd backend-node
node scripts/migrate_usernames.js --dry-run
```

3. If dry-run output looks correct, run without `--dry-run` to populate `usernames`:

```bash
node scripts/migrate_usernames.js
```

Notes on race conditions
- Registration uses a Firestore transaction which checks `usernames/{lowercase}` and creates it alongside `users/{generatedId}`. This prevents two concurrent registrations from creating the same username.

Production considerations
- Use a strong monitoring and rate-limiting strategy. The in-memory rate limiter is a dev helper; in production use Redis (see `utils/redisRateLimiter.js` suggestion) or an API gateway for throttling.
- Consider writing a one-off script to detect near-duplicates (John.Doe vs johndoe) if you plan to hard-merge accounts.
