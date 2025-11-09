'use client';

import React, { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function DebugResetPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<string>('');

  const handleTestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResponse(null);

    try {
      if (!auth) {
        throw new Error('Firebase Auth not initialized');
      }

      const actionCodeSettings = {
        url: typeof window !== 'undefined' 
          ? `${window.location.origin}/auth/reset-password` 
          : 'http://localhost:3000/auth/reset-password',
        handleCodeInApp: false,
      };

      console.log('Sending reset email with settings:', actionCodeSettings);
      await sendPasswordResetEmail(auth as any, email, actionCodeSettings);
      
      setResponse({
        success: true,
        message: `✅ Email sent successfully to ${email}. Check your inbox!`,
        timestamp: new Date().toLocaleString(),
      });
    } catch (error: any) {
      console.error('Reset error:', error);
      setError(`❌ Error: ${error.code || 'Unknown'} - ${error.message || error}`);
      setResponse({
        success: false,
        errorCode: error.code,
        errorMessage: error.message,
        timestamp: new Date().toLocaleString(),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 p-8">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-6">🔧 Password Reset Debugger</h1>
        
        <form onSubmit={handleTestReset} className="space-y-4 bg-neutral-900 p-6 rounded-lg border border-neutral-800">
          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="test@example.com"
              className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-50 placeholder-neutral-500 focus:border-neutral-600 focus:outline-none"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-neutral-700 hover:bg-neutral-600 disabled:opacity-50 text-neutral-950 font-bold py-2 px-4 rounded-lg transition"
          >
            {loading ? 'Sending...' : 'Test Reset Email'}
          </button>
        </form>

        {error && (
          <div className="mt-6 bg-red-500/10 border border-red-500/50 p-4 rounded-lg">
            <p className="text-red-400 font-mono text-sm">{error}</p>
          </div>
        )}

        {response && (
          <div className={`mt-6 p-4 rounded-lg border font-mono text-sm ${
            response.success 
              ? 'bg-green-500/10 border-green-500/50 text-green-400' 
              : 'bg-red-500/10 border-red-500/50 text-red-400'
          }`}>
            <p className="font-bold mb-2">Response:</p>
            <pre className="whitespace-pre-wrap break-words text-xs">
              {JSON.stringify(response, null, 2)}
            </pre>
          </div>
        )}

        <div className="mt-8 p-4 bg-neutral-800 border border-neutral-700 rounded-lg text-xs text-neutral-400 space-y-2">
          <p className="font-bold text-neutral-300">🔍 Common Errors:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>auth/operation-not-allowed</strong> → Email/Password not enabled in Firebase Console</li>
            <li><strong>auth/user-not-found</strong> → Email doesn't exist in your system</li>
            <li><strong>auth/invalid-email</strong> → Invalid email format</li>
            <li><strong>auth/invalid-api-key</strong> → Firebase config issue</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
