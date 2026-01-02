import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { GOOGLE_MAPS_API_KEY } from '../config';

// Standard Firebase configuration using central key or environment variable
const firebaseConfig = {
  apiKey: GOOGLE_MAPS_API_KEY || process.env.API_KEY,
  authDomain: "velocitymetrics-pwa.firebaseapp.com",
  projectId: "velocitymetrics-pwa",
  storageBucket: "velocitymetrics-pwa.appspot.com",
  messagingSenderId: "987654321098",
  appId: "1:987654321098:web:abcdef1234567890"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);