import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage";

const fallbackFirebaseConfig = {
  apiKey: "AIzaSyAsSkDiFZpk1eqMWS4qDDxx5ksZBONSJ4Q",
  authDomain: "odigyan-a5d08.firebaseapp.com",
  projectId: "odigyan-a5d08",
  storageBucket: "odigyan-a5d08.firebasestorage.app",
  messagingSenderId: "25985064791",
  appId: "1:25985064791:web:b935dbf321dbc0b2c5e812",
} as const;

function envOrDefault(value: string | undefined, fallback: string): string {
  return value?.trim() ? value : fallback;
}

const firebaseConfig = {
  apiKey: envOrDefault(
    import.meta.env.VITE_FIREBASE_API_KEY,
    fallbackFirebaseConfig.apiKey,
  ),
  authDomain: envOrDefault(
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    fallbackFirebaseConfig.authDomain,
  ),
  projectId: envOrDefault(
    import.meta.env.VITE_FIREBASE_PROJECT_ID,
    fallbackFirebaseConfig.projectId,
  ),
  storageBucket: envOrDefault(
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    fallbackFirebaseConfig.storageBucket,
  ),
  messagingSenderId: envOrDefault(
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    fallbackFirebaseConfig.messagingSenderId,
  ),
  appId: envOrDefault(import.meta.env.VITE_FIREBASE_APP_ID, fallbackFirebaseConfig.appId),
  // Optional for analytics-enabled projects.
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

export const firebaseApp = initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(firebaseApp);
export const firestore = getFirestore(firebaseApp);
export const firebaseStorage = getStorage(firebaseApp);
export const firebaseFunctions = getFunctions(firebaseApp);
