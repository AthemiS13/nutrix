'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signup: (email: string, password: string) => Promise<User>;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Guard: `auth` may be undefined during static build / server-side execution.
    // We only register the listener on the client when auth is available.
    if (!auth) {
      // No auth available (likely during build). Stop loading so UI can render.
      setLoading(false);
      return () => {};
    }

    const unsubscribe = onAuthStateChanged(auth as any, (user) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signup = async (email: string, password: string): Promise<User> => {
    if (!auth) throw new Error('Firebase Auth not initialized');
    try {
      const userCredential = await createUserWithEmailAndPassword(auth as any, email, password);
      return userCredential.user;
    } catch (error: any) {
      // Provide user-friendly error messages for common Firebase auth errors
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('This email is already registered. Please log in or use a different email.');
      } else if (error.code === 'auth/weak-password') {
        throw new Error('Password is too weak. Please use at least 6 characters.');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Please enter a valid email address.');
      }
      throw error;
    }
  };

  const login = async (email: string, password: string): Promise<User> => {
    if (!auth) throw new Error('Firebase Auth not initialized');
    try {
      const userCredential = await signInWithEmailAndPassword(auth as any, email, password);
      return userCredential.user;
    } catch (error: any) {
      // Provide user-friendly error messages for common Firebase auth errors
      if (error.code === 'auth/user-not-found') {
        throw new Error('No account found with this email. Please sign up first.');
      } else if (error.code === 'auth/wrong-password') {
        throw new Error('Incorrect password. Please try again.');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Please enter a valid email address.');
      } else if (error.code === 'auth/user-disabled') {
        throw new Error('This account has been disabled. Please contact support.');
      }
      throw error;
    }
  };

  const logout = async () => {
    if (!auth) throw new Error('Firebase Auth not initialized');
    await signOut(auth as any);
  };

  const resetPassword = async (email: string) => {
    if (!auth) throw new Error('Firebase Auth not initialized');
    try {
      // Configure action code settings for the password reset email
      const actionCodeSettings = {
        url: typeof window !== 'undefined' 
          ? `${window.location.origin}/auth/reset-password` 
          : 'http://localhost:3000/auth/reset-password',
        handleCodeInApp: false, // User will click link to reset in browser
      };
      
      await sendPasswordResetEmail(auth as any, email, actionCodeSettings);
    } catch (error: any) {
      // Provide user-friendly error messages for common Firebase auth errors
      if (error.code === 'auth/user-not-found') {
        throw new Error('No account found with this email. Please check and try again.');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Please enter a valid email address.');
      } else if (error.code === 'auth/invalid-api-key') {
        throw new Error('Email sending is not properly configured. Please contact support.');
      } else if (error.code === 'auth/operation-not-allowed') {
        throw new Error('Password reset is not enabled. Please contact support.');
      }
      throw new Error('Failed to send reset email. Please check your email address and try again.');
    }
  };

  const value = {
    user,
    loading,
    signup,
    login,
    logout,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
