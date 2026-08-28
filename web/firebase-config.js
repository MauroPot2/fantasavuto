export const firebaseConfig = {
  apiKey: "AIzaSyBENiEVSWjSr6Hy-rK1ejzHWF2iv39ZQOQ",
  authDomain: "fantasavuto.firebaseapp.com",
  projectId: "fantasavuto",
  storageBucket: "fantasavuto.firebasestorage.app",
  messagingSenderId: "963998490875",
  appId: "1:963998490875:web:2f805d50bda519199f105e",
};

export const isFirebaseConfigured = Object.values(firebaseConfig).every(
  (value) => value && !value.startsWith("REPLACE_WITH_"),
);
