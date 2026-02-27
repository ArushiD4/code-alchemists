// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBn6LYBw6bEjdgeulj0KxT2Jrqd2MsC1Ig",
    authDomain: "code-alchemists-42913.firebaseapp.com",
    projectId: "code-alchemists-42913",
    storageBucket: "code-alchemists-42913.firebasestorage.app",
    messagingSenderId: "539930400656",
    appId: "1:539930400656:web:d0745f845f59cd9078c515"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app);

export { db };
