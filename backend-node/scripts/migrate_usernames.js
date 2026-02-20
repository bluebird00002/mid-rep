import { admin, db } from "../config/firebase.js";

// Migration script: populate `usernames` collection from existing `users`
// Usage: node scripts/migrate_usernames.js --dry-run

async function run() {
  const dryRun = process.argv.includes('--dry-run');
  console.log('Starting migration of usernames collection. dryRun=', dryRun);

  const usersSnap = await db.collection('users').get();
  console.log(`Found ${usersSnap.size} users`);
  let created = 0;
  for (const doc of usersSnap.docs) {
    const data = doc.data();
    const username = (data.username || '').toString().toLowerCase().trim();
    if (!username) continue;
    const unameRef = db.collection('usernames').doc(username);
    const unameSnap = await unameRef.get();
    if (unameSnap.exists) continue;
    console.log(`Will create mapping for ${username} -> ${doc.id}`);
    if (!dryRun) {
      await unameRef.set({ user_id: doc.id, migrated_at: admin.firestore.FieldValue.serverTimestamp() });
      created += 1;
    }
  }
  console.log(`Migration complete. created=${created}`);
  process.exit(0);
}

run().catch((err) => {
  console.error('Migration failed', err);
  process.exit(1);
});
