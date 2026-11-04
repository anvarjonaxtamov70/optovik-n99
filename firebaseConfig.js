// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDHt-KJLFQDd1wOAr-dYm67VZksaSTdmSU",
  authDomain: "optovikn99.firebaseapp.com",
  databaseURL: "https://optovikn99-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "optovikn99",
  storageBucket: "optovikn99.firebasestorage.app",
  messagingSenderId: "220211635407",
  appId: "1:220211635407:web:8af6df7846ef7b66f883ba",
  measurementId: "G-PSTSX0T0HV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);