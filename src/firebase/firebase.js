// 🔑 PASTE FIREBASE CONFIG HERE
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableMultiTabIndexedDbPersistence } from 'firebase/firestore';
import { getMessaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyBJMdV_uvqIsSaQ4QY4fIhtpJpIo3apaxU",
  authDomain: "gdg-attendance-system.firebaseapp.com",
  projectId: "gdg-attendance-system",
  storageBucket: "gdg-attendance-system.firebasestorage.app",
  messagingSenderId: "155580839828",
  appId: "1:155580839828:web:26479e6b9de40d4747c181",
  measurementId: "G-PJVRR5S0F8"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Enable offline persistence
enableMultiTabIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
        // Multiple tabs open, persistence can only be enabled in one tab at a time.
        console.warn('Firestore persistence failed: Multiple tabs open');
    } else if (err.code === 'unimplemented') {
        // The current browser doesn't support all of the features required to enable persistence
        console.warn('Firestore persistence failed: Browser not supported');
    }
});

export const messaging = getMessaging(app);