import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDyi0gYdxk8l2occz_iMP0hUtzTJAkPysk",
  authDomain: "football-stats-tracker-585c9.firebaseapp.com",
  databaseURL: "https://football-stats-tracker-585c9-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "football-stats-tracker-585c9",
  storageBucket: "football-stats-tracker-585c9.firebasestorage.app",
  messagingSenderId: "756760552926",
  appId: "1:756760552926:web:36e94d71f03c43839ba94f",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);