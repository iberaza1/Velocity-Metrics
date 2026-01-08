import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

/**
 * FIREBASE CONFIGURATION
 * Successfully integrated with velocity-tracker-483022-t5
 */
const firebaseConfig = {
  apiKey: "AIzaSyBd_3dUxlmARJ9lLsxrda475AZV7vwqJ3w",
  authDomain: "velocity-tracker-483022-t5.firebaseapp.com",
  projectId: "velocity-tracker-483022-t5",
  storageBucket: "velocity-tracker-483022-t5.firebasestorage.app",
  messagingSenderId: "639073681594",
  appId: "1:639073681594:web:8561aabbf2754759784283"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);