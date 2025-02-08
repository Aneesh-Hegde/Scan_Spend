import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDOPD7SnEccWHLouLOeqdI4gCrQ9vz_UEU",
  authDomain: "scanspend.firebaseapp.com",
  projectId: "scanspend",
  storageBucket: "scanspend.firebasestorage.app",
  messagingSenderId: "19979600666",
  appId: "1:19979600666:web:d9cd951e45f51460af22a3"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app)
export const googleAuth = new GoogleAuthProvider()
