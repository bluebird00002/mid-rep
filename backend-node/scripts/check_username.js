#!/usr/bin/env node
import { admin, db } from "../config/firebase.js";

async function run() {
  const username = process.argv[2];
  if (!username) {
    console.log("Usage: node scripts/check_username.js <username>");
    process.exit(2);
  }

  const lower = username.toLowerCase().trim();
  console.log(`Checking username: ${username} -> normalized: ${lower}`);

  try {
    const nameDoc = await db.collection("usernames").doc(lower).get();
    console.log(`usernames/${lower} exists:`, nameDoc.exists);
    if (nameDoc.exists) console.log("usernames doc data:", nameDoc.data());

    const usersSnap = await db
      .collection("users")
      .where("username", "==", lower)
      .limit(1)
      .get();

    console.log(`users query returned: ${usersSnap.size} result(s)`);
    if (!usersSnap.empty) console.log("user doc:", { id: usersSnap.docs[0].id, ...usersSnap.docs[0].data() });

    if (nameDoc.exists || !usersSnap.empty) {
      console.log(`\nRESULT: "${username}" is currently taken.`);
      process.exit(0);
    }

    console.log(`\nRESULT: "${username}" is available.`);
    process.exit(1);
  } catch (err) {
    console.error("Error checking username:", err);
    process.exit(3);
  }
}

run();
