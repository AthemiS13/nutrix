import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { UserProfile } from './types';

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    if (!db) {
      console.warn('Firestore not initialized. Returning null for user profile.');
      return null;
    }
    const docRef = doc(db as any, 'users', uid);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data() as UserProfile;
    }
    return null;
  } catch (error: any) {
    // Handle offline or connection errors more gracefully
    if (error.code === 'unavailable' || error.message?.includes('offline')) {
      console.warn('Firestore is offline or unavailable. Please check your connection and ensure Firestore is initialized in Firebase Console.');
      return null;
    }
    console.error('Error fetching user profile:', error);
    return null;
  }
};

/**
 * Check if an email is already registered in the system
 */
export const checkEmailExists = async (email: string): Promise<boolean> => {
  try {
    if (!db) throw new Error('Firestore not initialized');
    const usersCollection = collection(db as any, 'users');
    const q = query(usersCollection, where('email', '==', email.toLowerCase()));
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error('Error checking email existence:', error);
    throw new Error('Failed to verify email. Please try again.');
  }
};

export const createUserProfile = async (profile: Omit<UserProfile, 'createdAt' | 'updatedAt'>): Promise<void> => {
  try {
    if (!db) throw new Error('Firestore not initialized. Cannot create user profile.');
    
    // Check if profile already exists for this UID
    const existingProfile = await getUserProfile(profile.uid);
    if (existingProfile) {
      throw new Error('A profile already exists for this account. Please log in instead.');
    }
    
    // Check if email is already registered
    const emailExists = await checkEmailExists(profile.email);
    if (emailExists) {
      throw new Error('This email is already registered. Please use a different email or log in with your existing account.');
    }
    
    const docRef = doc(db as any, 'users', profile.uid);
    const now = new Date().toISOString();
    
    await setDoc(docRef, {
      ...profile,
      email: profile.email.toLowerCase(), // Store email in lowercase for consistency
      createdAt: now,
      updatedAt: now,
    });
  } catch (error) {
    console.error('Error creating user profile:', error);
    throw error;
  }
};

export const updateUserProfile = async (
  uid: string,
  updates: Partial<Omit<UserProfile, 'uid' | 'email' | 'createdAt'>>
): Promise<void> => {
  try {
    if (!db) throw new Error('Firestore not initialized. Cannot update user profile.');
    const docRef = doc(db as any, 'users', uid);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};
