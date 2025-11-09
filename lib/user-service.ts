import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
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

export const createUserProfile = async (profile: Omit<UserProfile, 'createdAt' | 'updatedAt'>): Promise<void> => {
  try {
    if (!db) throw new Error('Firestore not initialized. Cannot create user profile.');
    const docRef = doc(db as any, 'users', profile.uid);
    const now = new Date().toISOString();
    
    await setDoc(docRef, {
      ...profile,
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
