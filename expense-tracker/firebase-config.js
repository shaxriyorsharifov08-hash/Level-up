// ─────────────────────────────────────────────────────────────────────────
//  Firebase configuration
// ─────────────────────────────────────────────────────────────────────────
//
//  These values are SAFE to commit publicly — they identify your project,
//  they are not secrets. Access is protected by Firestore security rules
//  (see firestore.rules), not by hiding these keys.
//
//  HOW TO FILL THIS IN:  see SETUP.md in this folder. In short:
//    1. Create a free project at https://console.firebase.google.com
//    2. Add a Web App, then copy its config values below.
//    3. Enable Google sign-in and create a Firestore database.
//
//  Until real values are filled in, the app runs in LOCAL-ONLY mode
//  (data saved in this browser, no sync). Nothing breaks.
// ─────────────────────────────────────────────────────────────────────────

export const firebaseConfig = {
  apiKey: "AIzaSyBZ1WRVXc3dhuIlZa4HjuqF9li-OdEOsts",
  authDomain: "level-up-manage-money.firebaseapp.com",
  projectId: "level-up-manage-money",
  storageBucket: "level-up-manage-money.firebasestorage.app",
  messagingSenderId: "580966090398",
  appId: "1:580966090398:web:08b6f9abb34f40793a1d8f",
};

// Version of the Firebase JS SDK loaded from the CDN when sync is enabled.
export const FIREBASE_SDK_VERSION = "10.12.0";

// True once the placeholders above have been replaced with real values.
export function isFirebaseConfigured() {
  return (
    !!firebaseConfig.apiKey &&
    !firebaseConfig.apiKey.startsWith("YOUR_") &&
    !!firebaseConfig.projectId &&
    !firebaseConfig.projectId.startsWith("YOUR_")
  );
}
