import { initializeApp } from "firebase/app";
import {
    initializeAuth,
    getReactNativePersistence,
    signOut,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import AsyncStorage from "@react-native-async-storage/async-storage"; // ⬅️ Add this

const firebaseConfig = {
    apiKey: "AIzaSyAKpQKqeVU0DJGORwRbqSa8JHam4XOhGoc",
    authDomain: "admin-login-244c5.firebaseapp.com",
    projectId: "admin-login-244c5",
    storageBucket: "admin-login-244c5.appspot.com",
    messagingSenderId: "941394599113",
    appId: "1:941394599113:web:414b4500f2569232660118",
    measurementId: "G-741749BB0N",
};

export const app = initializeApp(firebaseConfig);

// ✅ Use persistent authentication for React Native
export const auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
});

export const db = getFirestore(app);
export const storage = getStorage(app);

// Logout helper
export const logout = () => {
    signOut(auth)
        .then(() => console.log("User signed out successfully."))
        .catch((error) => console.error("Error signing out: ", error.message));
};
