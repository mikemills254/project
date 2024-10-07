import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyC1kjj7_72AISUkJmSfq7izjpPn4g68DhI",
    authDomain: "elai-ba2d3.firebaseapp.com",
    projectId: "elai-ba2d3",
    storageBucket: "elai-ba2d3.appspot.com",
    messagingSenderId: "312765226192",
    appId: "1:312765226192:web:08c4620acbe5a394b592d5"
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

export const db = getFirestore(app);
export const storage = getStorage(app);
