import { initializeApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyAnYgRpalWUH284_REe_XKZTIclw_9Q69I',
  authDomain: 'rnrmassage-c2357.firebaseapp.com',
  projectId: 'rnrmassage-c2357',
  storageBucket: 'rnrmassage-c2357.firebasestorage.app',
  messagingSenderId: '158663037058',
  appId: '1:158663037058:web:17104e8d4563be8cd5249b',
  measurementId: 'G-47QFE3N51P',
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);

// Analytics depends on browser APIs that may be unavailable in some contexts.
export const analytics = isSupported()
  .then((supported) => (supported ? getAnalytics(firebaseApp) : null))
  .catch(() => null);
