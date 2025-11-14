import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCKV1Z5-0rTXf1Mlj_uU0rxMp2Z9C2nAt0",
  authDomain: "game-center-c47c8.firebaseapp.com",
  projectId: "game-center-c47c8",
  storageBucket: "game-center-c47c8.firebasestorage.app",
  messagingSenderId: "307468239626",
  appId: "1:307468239626:web:3ededa78a87bd4712a30f3",
  measurementId: "G-M7RYG4ECZ3"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db: Firestore = getFirestore(app);

export { db };