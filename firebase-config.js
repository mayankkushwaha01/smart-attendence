// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDBJVqOs7xdiLBYkNiVmxfXeH363Hot4Cw",
    authDomain: "smart-attendence0.firebaseapp.com",
    databaseURL: "https://smart-attendence0-default-rtdb.firebaseio.com",
    projectId: "smart-attendence0",
    storageBucket: "smart-attendence0.firebasestorage.app",
    messagingSenderId: "424874093065",
    appId: "1:424874093065:web:b5caf7c52c8c2770f7a6d8",
    measurementId: "G-1JE6L4BTFL"
};

// Initialize Firebase
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';

const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);
export const auth = getAuth(app);