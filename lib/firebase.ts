import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase only on client side
let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;

if (typeof window !== 'undefined') {
  // Quick sanity checks to help debugging invalid-api-key during deploys
  if (!firebaseConfig.apiKey) {
    // Missing API key is the most common cause for auth/invalid-api-key in deployed builds
    // Log a clear message so you can see it in the browser console when the site loads.
    // Do NOT expose full keys in logs in production; this is intended as a short-term debug aid.
    // If you prefer, remove this log after verifying your Pages environment variables.
    console.error(
      'Firebase API key is missing. Ensure NEXT_PUBLIC_FIREBASE_API_KEY is set in your deployment environment (Cloudflare Pages environment variables).'
    );
  } else {
    try {
      app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
      auth = getAuth(app);
      db = getFirestore(app);
      console.log('Firebase initialized with project:', firebaseConfig.projectId);
    } catch (err) {
      // Re-throw after logging useful debug info
      console.error('Failed to initialize Firebase. Check your config and API key:', {
        projectId: firebaseConfig.projectId,
        authDomain: firebaseConfig.authDomain,
      });
      throw err;
    }
  }
}

export { app, auth, db };
