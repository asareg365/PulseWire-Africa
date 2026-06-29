import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBwsQfYEUZkdT8kT9eVKv2OFrZ2lA4C_IM",
  authDomain: "pulsewireafrica.firebaseapp.com",
  projectId: "pulsewireafrica",
  storageBucket: "pulsewireafrica.firebasestorage.app",
  messagingSenderId: "152570020464",
  appId: "1:152570020464:web:20f6c3a8bcf47a3609eab5"
};

const databaseId = "ai-studio-pulsewireafrica-ce7cc083-15ac-489c-b8ff-506dc3277285";

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app, databaseId);

export default app;
