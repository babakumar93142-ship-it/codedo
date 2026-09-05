// ===== CodeDo — Firebase config =====
// Ye values apne Firebase project se lo:
// Firebase Console -> Project Settings -> General -> "Your apps" -> Web app -> Config

export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Admin ka email yaha daalo — yehi account "admin" bankar
// dusre users ko suspend/delete kar payega (Firestore rules bhi
// isi email ko match karke check karte hain, README dekho).
export const ADMIN_EMAIL = "your-admin-email@gmail.com";
