// 🔑 PASTE FIREBASE CONFIG HERE
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {

  apiKey: "API KEY",

  authDomain: "gdg-attendance-system.firebaseapp.com",

  projectId: "gdg-attendance-system",

  storageBucket: "gdg-attendance-system.firebasestorage.app",

  messagingSenderId: "SENDERID",

  appId: "APPID",

  measurementId: "MEASUREMENTID"

};


const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);