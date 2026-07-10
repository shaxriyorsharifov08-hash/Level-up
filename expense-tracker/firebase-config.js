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
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
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
