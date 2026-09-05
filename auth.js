// ===== CodeDo — Auth =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig, ADMIN_EMAIL } from "./firebase-config.js";

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
const provider = new GoogleAuthProvider();

export async function loginWithGoogle() {
  const result = await signInWithPopup(auth, provider);
  const user = result.user;
  const userRef = doc(db, "users", user.uid);
  const existing = await getDoc(userRef);

  if (!existing.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      name: user.displayName || "User",
      email: user.email,
      photo: user.photoURL || "",
      role: user.email === ADMIN_EMAIL ? "admin" : "user",
      banned: false,
      createdAt: serverTimestamp()
    });
  }
  return user;
}

export function logout() {
  return signOut(auth);
}

// Ek chhota helper — current logged-in user ka firestore profile deta hai
export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}

// Har page pe call karo taaki login state pata chale, aur banned
// user ko turant logout kar diya jaaye.
export function watchAuth(onUser) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) return onUser(null, null);
    const profile = await getUserProfile(user.uid);
    if (profile && profile.banned) {
      alert("Aapka account suspend kar diya gaya hai.");
      await logout();
      return onUser(null, null);
    }
    onUser(user, profile);
  });
}
