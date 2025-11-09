'use client';

import React, { useState } from 'react';
import { createUserProfile } from '@/lib/user-service';

interface ProfileSetupProps {
  uid: string;
  email: string;
  onComplete: () => void;
  onLogout?: () => void;
}

export const ProfileSetup: React.FC<ProfileSetupProps> = ({ uid, email, onComplete, onLogout }) => {
  const [bodyWeight, setBodyWeight] = useState('');
  const [dailyCalorieGoal, setDailyCalorieGoal] = useState('');
  const [targetMonthlyWeightChange, setTargetMonthlyWeightChange] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const profile = {
        uid,
        email,
        bodyWeight: parseFloat(bodyWeight),
        dailyCalorieGoal: parseInt(dailyCalorieGoal),
        ...(targetMonthlyWeightChange && {
          targetMonthlyWeightChange: parseFloat(targetMonthlyWeightChange),
        }),
      };

      await createUserProfile(profile);
      onComplete();
    } catch (err: any) {
      setError(err.message || 'Failed to create profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-neutral-900 p-8 rounded-lg shadow-xl">
      <h2 className="text-2xl font-bold mb-6 text-neutral-50">Complete Your Profile</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded">
            <p className="font-semibold text-sm">Error creating profile:</p>
            <p className="text-sm mt-1">{error}</p>
            <p className="text-xs text-red-400 mt-2">If the problem persists, try logging out and signing up again.</p>
          </div>
        )}
        
        <div>
          <label className="block text-sm font-medium text-neutral-400 mb-2">
            Current Body Weight (kg)
          </label>
          <input
            type="number"
            step="0.1"
            value={bodyWeight}
            onChange={(e) => setBodyWeight(e.target.value)}
            required
            className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-50 focus:ring-2 focus:ring-neutral-600 focus:border-transparent"
            placeholder="70.0"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-400 mb-2">
            Daily Calorie Goal (kcal)
          </label>
          <input
            type="number"
            value={dailyCalorieGoal}
            onChange={(e) => setDailyCalorieGoal(e.target.value)}
            required
            className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-50 focus:ring-2 focus:ring-neutral-600 focus:border-transparent"
            placeholder="2000"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-400 mb-2">
            Target Monthly Weight Change (kg) - Optional
          </label>
          <input
            type="number"
            step="0.1"
            value={targetMonthlyWeightChange}
            onChange={(e) => setTargetMonthlyWeightChange(e.target.value)}
            className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-50 focus:ring-2 focus:ring-neutral-600 focus:border-transparent"
            placeholder="0.5 (positive for gain, negative for loss)"
          />
          <p className="text-xs text-neutral-400 mt-1">
            Use positive numbers to gain weight, negative to lose weight
          </p>
        </div>

        <div className="flex gap-2 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-neutral-700 hover:bg-neutral-600 text-neutral-50 font-semibold py-2 px-4 rounded-lg transition disabled:opacity-50"
          >
            {loading ? 'Creating Profile...' : 'Complete Setup'}
          </button>
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200 font-semibold rounded-lg transition"
              title="Logout and try again"
            >
              Logout
            </button>
          )}
        </div>
      </form>
    </div>
  );
};
