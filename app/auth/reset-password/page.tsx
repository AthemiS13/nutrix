'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import Link from 'next/link';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

export const dynamic = 'force-dynamic';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const oobCode = searchParams.get('oobCode');

  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const verifyCode = async () => {
      if (!oobCode) {
        setError('Invalid password reset link - no reset code found');
        setVerifying(false);
        setLoading(false);
        return;
      }

      try {
        // Verify the reset code is valid and get the email
        const userEmail = await verifyPasswordResetCode(auth as any, oobCode);
        setEmail(userEmail);
        setError('');
      } catch (err: any) {
        let errorMessage = 'Invalid or expired password reset link';
        
        if (err.code === 'auth/expired-oob-code') {
          errorMessage = 'This password reset link has expired. Please request a new one.';
        } else if (err.code === 'auth/invalid-oob-code') {
          errorMessage = 'Invalid password reset link. Please request a new one.';
        } else if (err.code === 'auth/user-disabled') {
          errorMessage = 'This account has been disabled.';
        }
        
        setError(errorMessage);
      } finally {
        setVerifying(false);
        setLoading(false);
      }
    };

    verifyCode();
  }, [oobCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!newPassword) {
      setError('Please enter a new password');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!oobCode) {
      setError('Invalid password reset link');
      return;
    }

    setResetting(true);

    try {
      // Confirm the password reset
      await confirmPasswordReset(auth as any, oobCode, newPassword);
      setSuccess(true);
      setError('');
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/');
      }, 2000);
    } catch (err: any) {
      let errorMessage = 'Failed to reset password';
      
      if (err.code === 'auth/expired-oob-code') {
        errorMessage = 'This password reset link has expired. Please request a new one.';
      } else if (err.code === 'auth/invalid-oob-code') {
        errorMessage = 'Invalid password reset link. Please request a new one.';
      } else if (err.code === 'auth/user-disabled') {
        errorMessage = 'This account has been disabled.';
      } else if (err.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please use a stronger password.';
      }
      
      setError(errorMessage);
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-neutral-400 mx-auto mb-4" />
          <p className="text-neutral-400">Verifying reset link...</p>
        </div>
      </div>
    );
  }

  if (verifying || !oobCode) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-lg p-8">
          <div className="text-center">
            {error && (
              <>
                <p className="text-red-400 font-semibold mb-4">{error}</p>
                <Link
                  href="/"
                  className="inline-block bg-neutral-700 hover:bg-neutral-600 text-neutral-950 font-bold py-2 px-6 rounded-lg transition"
                >
                  Back to Login
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-lg p-8 text-center">
          <div className="mb-4">
            <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-neutral-50 mb-2">Password Reset Successful!</h2>
            <p className="text-neutral-400 mb-6">Your password has been reset. Redirecting you to login...</p>
          </div>
          <Link
            href="/"
            className="inline-block bg-neutral-700 hover:bg-neutral-600 text-neutral-950 font-bold py-2 px-6 rounded-lg transition"
          >
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-lg p-8">
        <h1 className="text-2xl font-bold text-neutral-50 mb-2 text-center">Reset Password</h1>
        <p className="text-neutral-400 text-center text-sm mb-6">
          Enter your new password for: <span className="font-semibold text-neutral-300">{email}</span>
        </p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* New Password */}
          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-2">
              New Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-50 placeholder-neutral-500 focus:border-neutral-600 focus:outline-none"
                placeholder="Enter new password"
                disabled={resetting}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-300"
                disabled={resetting}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
            <p className="text-xs text-neutral-500 mt-1">Minimum 6 characters</p>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-2">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-50 placeholder-neutral-500 focus:border-neutral-600 focus:outline-none"
                placeholder="Confirm new password"
                disabled={resetting}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-300"
                disabled={resetting}
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={resetting}
            className="w-full bg-neutral-700 hover:bg-neutral-600 disabled:bg-neutral-800 text-neutral-950 font-bold py-3 px-4 rounded-lg transition text-base disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {resetting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Resetting...
              </>
            ) : (
              'Reset Password'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-neutral-400 text-sm">
            Remember your password?{' '}
            <Link href="/" className="text-neutral-300 hover:text-neutral-100 font-semibold transition">
              Back to Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-neutral-950 flex items-center justify-center"><Loader2 className="animate-spin text-neutral-400" /></div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
