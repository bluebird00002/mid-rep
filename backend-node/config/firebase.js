import admin from "firebase-admin";

function initFirebase() {
  if (admin.apps && admin.apps.length) return admin;

  // Prefer a base64-encoded service account JSON in FIREBASE_SERVICE_ACCOUNT
  const svc = process.env.FIREBASE_SERVICE_ACCOUNT;

  try {
    if (svc) {
      let parsed;
      try {
        // If the env var is base64-encoded JSON, decode it
        const maybeJson = Buffer.from(svc, "base64").toString("utf8");
        parsed = JSON.parse(maybeJson);
      } catch (e) {
        // Not base64, try raw JSON
        parsed = JSON.parse(svc);
      }

      admin.initializeApp({
        credential: admin.credential.cert(parsed),
      });
      console.log("✅ Firebase initialized from FIREBASE_SERVICE_ACCOUNT");
      return admin;
    }

    // Fallback to application default credentials (GOOGLE_APPLICATION_CREDENTIALS)
    admin.initializeApp();
    console.log("✅ Firebase initialized with application default credentials");
    return admin;
  } catch (err) {
    console.error(
      "Failed to initialize Firebase Admin SDK:",
      err.message || err
    );
    throw err;
  }
}

const firebaseAdmin = initFirebase();
const db = firebaseAdmin.firestore();

export { firebaseAdmin as admin, db };
