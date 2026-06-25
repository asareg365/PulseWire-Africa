import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAgVjfQZShOjI48rENWsePqbcEnG3JkBDc",
  authDomain: "pulsewire-africa.firebaseapp.com",
  projectId: "pulsewire-africa",
  storageBucket: "pulsewire-africa.firebasestorage.app",
  messagingSenderId: "504216611238",
  appId: "1:504216611238:web:7b28edb04e165f85d14767"
};

const databaseId = "ai-studio-ce7cc083-15ac-489c-b8ff-506dc3277285";

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app, databaseId);

export default app;
