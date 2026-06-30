import { initializeApp } from 'firebase/app';
import { getAnalytics } from "firebase/analytics";
import {
  getAuth,
  signInWithCustomToken,
  signInAnonymously,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';

// Vite에서는 환경변수가 build-time에 주입됩니다.
// 프로젝트 루트의 .env(.local) 파일에 아래 변수들을 정의하세요. (.env.example 참고)
const firebaseConfig = {
  apiKey: "AIzaSyAW0OcWHnxP08uAULpKUbatsSPib214Mnc",
  authDomain: "basecamp-40f23.firebaseapp.com",
  projectId: "basecamp-40f23",
  storageBucket: "basecamp-40f23.firebasestorage.app",
  messagingSenderId: "382680839449",
  appId: "1:382680839449:web:fa06abc1ea13bd43c24188",
  measurementId: "G-54X8K71TMW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);


if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  // eslint-disable-next-line no-console
  console.error(
    '[firebase] 환경변수가 설정되지 않았습니다. .env 파일을 확인하세요. (.env.example 참고)'
  );
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export {
  app,
  auth,
  db,
  signInWithCustomToken,
  signInAnonymously,
  onAuthStateChanged,
  collection,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
};
