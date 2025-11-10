'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface AuthFormsProps {
  onAuthSuccess?: () => void;
}

export const AuthForms: React.FC<AuthFormsProps> = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const { signup, login, resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (isResetPassword) {
        await resetPassword(email);
        setMessage('Password reset email sent! Check your inbox.');
        setIsResetPassword(false);
      } else if (isLogin) {
        await login(email, password);
        onAuthSuccess?.();
      } else {
        await signup(email, password);
        onAuthSuccess?.();
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (isResetPassword) {
    return (
      <div className="w-full">
        <h2 className="text-2xl font-bold mb-6 text-neutral-50 text-center">Reset Password</h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          {message && (
            <div className="bg-green-500/10 border border-green-500 text-green-500 px-4 py-3 rounded-lg text-sm">
              {message}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3.5 bg-neutral-800 border border-neutral-700 rounded-xl text-neutral-50 text-base focus:ring-2 focus:ring-neutral-600 focus:border-transparent"
              placeholder="you@example.com"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-neutral-700 hover:bg-neutral-600 active:bg-neutral-500 text-neutral-50 font-semibold py-3.5 px-4 rounded-xl transition disabled:opacity-50 text-base"
          >
            {loading ? 'Sending...' : 'Send Reset Email'}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsResetPassword(false);
              setError('');
              setMessage('');
            }}
            className="w-full text-neutral-400 hover:text-neutral-50 active:text-neutral-200 text-sm py-2"
          >
            Back to login
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="w-full">
      <h2 className="text-2xl font-bold mb-6 text-neutral-50 text-center">
        {isLogin ? 'Welcome Back' : 'Create Account'}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-neutral-400 mb-2">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3.5 bg-neutral-800 border border-neutral-700 rounded-xl text-neutral-50 text-base focus:ring-2 focus:ring-neutral-600 focus:border-transparent"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-400 mb-2">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full px-4 py-3.5 bg-neutral-800 border border-neutral-700 rounded-xl text-neutral-50 text-base focus:ring-2 focus:ring-neutral-600 focus:border-transparent"
            placeholder="••••••••"
          />
          {!isLogin && (
            <p className="text-xs text-neutral-500 mt-1.5">Minimum 6 characters</p>
          )}
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-neutral-700 hover:bg-neutral-600 active:bg-neutral-500 text-neutral-50 font-semibold py-3.5 px-4 rounded-xl transition disabled:opacity-50 text-base mt-6"
        >
          {loading ? 'Loading...' : isLogin ? 'Login' : 'Sign Up'}
        </button>
        
        {isLogin && (
          <button
            type="button"
            onClick={() => {
              setIsResetPassword(true);
              setError('');
            }}
            className="w-full text-neutral-400 hover:text-neutral-50 active:text-neutral-200 text-sm py-2"
          >
            Forgot password?
          </button>
        )}
        
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-neutral-800"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-2 bg-neutral-900 text-neutral-500">
              {isLogin ? "Don't have an account?" : "Already have an account?"}
            </span>
          </div>
        </div>
        
        <button
          type="button"
          onClick={() => {
            setIsLogin(!isLogin);
            setError('');
          }}
          className="w-full bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600 text-neutral-50 font-medium py-3.5 px-4 rounded-xl transition text-base"
        >
          {isLogin ? 'Create Account' : 'Login'}
        </button>
      </form>
    </div>
  );
};
