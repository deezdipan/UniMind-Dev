// frontend/src/firebaseConfig.js
import { initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: "AIzaSyCLAUNGcA6y4PcRErePEawdQd8zI5gH1kQ",
  authDomain: "unimind-401ef.firebaseapp.com",
  projectId: "unimind-401ef",
  storageBucket: "unimind-401ef.firebasestorage.app",
  messagingSenderId: "908715228760",
  appId: "1:908715228760:web:d46fb7674ce37e1b30942d"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
