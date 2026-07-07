import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "DUMMY_KEY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "dummy.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "dummy-project",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "dummy.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "12345678",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:12345678:web:dummy"
};

const databaseId = import.meta.env.VITE_FIREBASE_DATABASE_ID;

let app: any;
let auth: any;
let db: any;
let storage: any;

try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
} catch (error) {
  console.error("Firebase app initialization failed:", error);
  app = {};
}

try {
  auth = getAuth(app);
} catch (error) {
  console.error("Firebase auth initialization failed, creating safe mock fallback:", error);
  auth = {
    currentUser: null,
    onAuthStateChanged: (callback: any) => {
      setTimeout(() => callback(null), 0);
      return () => {};
    },
    signOut: async () => {},
  };
}

try {
  db = getFirestore(app, databaseId);
} catch (error) {
  console.error("Firebase firestore initialization failed, creating safe mock fallback:", error);
  db = {};
}

try {
  storage = getStorage(app);
} catch (error) {
  console.error("Firebase storage initialization failed, creating safe mock fallback:", error);
  storage = {};
}

export { app, auth, db, storage };
export default app;

