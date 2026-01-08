import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth'; // NEW: For login

/**
 * FIREBASE CONFIGURATION
 * Successfully integrated with velocity-tracker-483022-t5
 */
const firebaseConfig = {
  apiKey: "AIzaSyABpdVJFvudPJTf2UV7sYkbmlxPirebJ-A",
  authDomain: "velocity-tracker-483022-t5.firebaseapp.com",
  projectId: "velocity-tracker-483022-t5",
  storageBucket: "velocity-tracker-483022-t5.firebasestorage.app",
  messagingSenderId: "639073681594",
  appId: "1:639073681594:web:8561aabbf2754759784283"
};

const app = initializeApp(firebaseConfig);

// Export for cloud saves (runs)
export const db = getFirestore(app);

// NEW: Export for Google login
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
