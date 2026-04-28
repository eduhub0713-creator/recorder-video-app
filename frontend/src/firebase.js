// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCeEAEIqmXNV_ueH7DZ6uk0_NJyslJ2Y-s",
  authDomain: "recorder-video-app.firebaseapp.com",
  projectId: "recorder-video-app",
  storageBucket: "recorder-video-app.firebasestorage.app",
  messagingSenderId: "978233121625",
  appId: "1:978233121625:web:1758ba9555a2b514218a48",
  measurementId: "G-1LNS185ZTJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
