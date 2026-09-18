import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyD1dFITRJaxu_65ivN2T3OhVJP25ViaEOc",
  authDomain: "oak-portal-bde61.firebaseapp.com",
  projectId: "oak-portal-bde61",
  storageBucket: "oak-portal-bde61.firebasestorage.app",
  messagingSenderId: "770376753394",
  appId: "1:770376753394:web:bb56612b8c8370e3bb706b",
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
