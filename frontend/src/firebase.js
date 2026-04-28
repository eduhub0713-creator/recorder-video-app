import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCeEAEIqmXNV_ueH7DZ6uk0_NJyslJ2Y-s",
  authDomain: "recorder-video-app.firebaseapp.com",
  projectId: "recorder-video-app",
  storageBucket: "recorder-video-app.firebasestorage.app",
  messagingSenderId: "978233121625",
  appId: "1:978233121625:web:1758ba9555a2b514218a48"
};

const app = initializeApp(firebaseConfig);

// ✅ THIS WAS MISSING OR WRONG
export const storage = getStorage(app);
export const db = getFirestore(app);
