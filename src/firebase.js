import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyD0JBogECMBrEusDGJ5EjBRJ0ONFpYAhas",
  authDomain: "planner-financeiro-37e99.firebaseapp.com",
  projectId: "planner-financeiro-37e99",
  storageBucket: "planner-financeiro-37e99.firebasestorage.app",
  messagingSenderId: "226579932936",
  appId: "1:226579932936:web:11eb44d5d05da4e4916ebd",
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
