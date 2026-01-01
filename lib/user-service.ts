import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { UserProfile } from './types';

/**
 * Generate a unique 6-character friend code
 */
const generateFriendCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

/**
 * Check if a friend code already exists in the database
 */
const checkFriendCodeExists = async (friendCode: string): Promise<boolean> => {
  try {
    if (!db) return false;
    const usersCollection = collection(db as any, 'users');
    const q = query(usersCollection, where('friendCode', '==', friendCode));
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error('Error checking friend code existence:', error);
    return false;
  }
};

/**
 * Generate a unique friend code that doesn't exist in the database
 */
export const generateUniqueFriendCode = async (): Promise<string> => {
  let code = generateFriendCode();
  let attempts = 0;
  const maxAttempts = 10;

  while (await checkFriendCodeExists(code) && attempts < maxAttempts) {
    code = generateFriendCode();
    attempts++;
  }

  return code;
};

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

    // Generate unique friend code if not provided
    const friendCode = profile.friendCode || await generateUniqueFriendCode();

    const docRef = doc(db as any, 'users', profile.uid);
    const now = new Date().toISOString();

    await setDoc(docRef, {
      ...profile,
      email: profile.email.toLowerCase(), // Store email in lowercase for consistency
      friendCode,
      friends: profile.friends || [], // Initialize empty friends array
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

/**
 * Find a user by their friend code
 */
export const getUserByFriendCode = async (friendCode: string): Promise<UserProfile | null> => {
  try {
    if (!db) throw new Error('Firestore not initialized');
    const usersCollection = collection(db as any, 'users');
    const q = query(usersCollection, where('friendCode', '==', friendCode.toUpperCase()));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return null;
    }

    return querySnapshot.docs[0].data() as UserProfile;
  } catch (error) {
    console.error('Error finding user by friend code:', error);
    throw error;
  }
};

/**
 * Add a friend using their friend code
 */
export const addFriendByCode = async (userId: string, friendCode: string): Promise<void> => {
  try {
    if (!db) throw new Error('Firestore not initialized');

    // Find the friend by their code
    const friendProfile = await getUserByFriendCode(friendCode);

    if (!friendProfile) {
      throw new Error('No user found with this friend code');
    }

    if (friendProfile.uid === userId) {
      throw new Error('You cannot add yourself as a friend');
    }

    // Get current user's profile
    const userProfile = await getUserProfile(userId);

    if (!userProfile) {
      throw new Error('User profile not found');
    }

    // Check if already friends
    if (userProfile.friends?.includes(friendProfile.uid)) {
      throw new Error('This user is already your friend');
    }

    // Add friend to user's friends list
    const updatedFriends = [...(userProfile.friends || []), friendProfile.uid];
    await updateUserProfile(userId, { friends: updatedFriends });

    // Add user to friend's friends list (mutual friendship)
    const friendUpdatedFriends = [...(friendProfile.friends || []), userId];
    await updateUserProfile(friendProfile.uid, { friends: friendUpdatedFriends });

  } catch (error) {
    console.error('Error adding friend:', error);
    throw error;
  }
};

/**
 * Get profiles for all friends
 */
export const getFriendsProfiles = async (friendIds: string[]): Promise<UserProfile[]> => {
  try {
    if (!db || !friendIds || friendIds.length === 0) return [];

    const friendProfiles = await Promise.all(
      friendIds.map(friendId => getUserProfile(friendId))
    );

    return friendProfiles.filter(profile => profile !== null) as UserProfile[];
  } catch (error) {
    console.error('Error fetching friends profiles:', error);
    return [];
  }
};

/**
 * Remove a friend
 */
export const removeFriend = async (userId: string, friendId: string): Promise<void> => {
  try {
    if (!db) throw new Error('Firestore not initialized');

    // Get current user's profile
    const userProfile = await getUserProfile(userId);
    const friendProfile = await getUserProfile(friendId);

    if (!userProfile || !friendProfile) {
      throw new Error('User profile not found');
    }

    // Remove friend from user's friends list
    const updatedUserFriends = (userProfile.friends || []).filter(id => id !== friendId);
    await updateUserProfile(userId, { friends: updatedUserFriends });

    // Remove user from friend's friends list
    const updatedFriendFriends = (friendProfile.friends || []).filter(id => id !== userId);
    await updateUserProfile(friendId, { friends: updatedFriendFriends });

  } catch (error) {
    console.error('Error removing friend:', error);
    throw error;
  }
};
