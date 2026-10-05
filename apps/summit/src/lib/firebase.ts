import { initializeApp, getApps, getApp } from "firebase/app";
import { getDataConnect, connectDataConnectEmulator } from "firebase/data-connect";

// Firebase App Config
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "demo-api-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "learning-summit---vincent.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "learning-summit---vincent",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "learning-summit---vincent.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1234567890",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1234567890:web:abcdef123456",
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Firebase Data Connect instance for service "summit-db"
export const dataConnect = getDataConnect(app, {
  service: "summit-db",
  location: "us-central1",
  connector: "default",
});

// Enable local emulator in development mode
if (import.meta.env.DEV) {
  try {
    connectDataConnectEmulator(dataConnect, "localhost", 9399);
  } catch (e) {
    // Emulator connection ignored if already connected
  }
}
