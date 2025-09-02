// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA5TK4SPdlD3yPYdQGYOJ5oRYCRA8bpEFE",
  authDomain: "uaidecants.firebaseapp.com",
  projectId: "uaidecants",
  storageBucket: "uaidecants.firebasestorage.app",
  messagingSenderId: "557662716722",
  appId: "1:557662716722:web:2d2dbc0ecc97238eb88d2b",
  measurementId: "G-4TT5WV429E"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const storage = getStorage(app, "gs://uaidecants.firebasestorage.app");

export { app, auth, storage };