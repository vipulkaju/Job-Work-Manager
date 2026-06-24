import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAaKoiGdALerLQMms43Qex8uyVfb8O6qqg",
  authDomain: "jobwork-87bd5.firebaseapp.com",
  projectId: "jobwork-87bd5",
  storageBucket: "jobwork-87bd5.firebasestorage.app",
  messagingSenderId: "624256200279",
  appId: "1:624256200279:web:2ee2b1f59af8d3327f7d12",
  measurementId: "G-QPNWV2EX60"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google", error);
    throw error;
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out", error);
    throw error;
  }
};
