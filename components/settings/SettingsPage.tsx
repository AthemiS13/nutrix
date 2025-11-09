'use client';

import React, { useState } from 'react';
import { UserProfile } from '@/lib/types';
import { updateUserProfile } from '@/lib/user-service';
import { Loader2, Save, LogOut } from 'lucide-react';

interface SettingsPageProps {
  userId: string;
  userProfile: UserProfile;
  onUpdate: () => void;
  onLogout: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  userId,
  userProfile,
  onUpdate,
  onLogout,
}) => {
  const [formData, setFormData] = useState({
    bodyWeight: userProfile.bodyWeight.toString(),
    dailyCalorieGoal: userProfile.dailyCalorieGoal.toString(),
    targetMonthlyWeightChange: userProfile.targetMonthlyWeightChange?.toString() || '0',
    preferredUnit: userProfile.preferredUnit || 'grams',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const updatedProfile: Partial<UserProfile> = {
        bodyWeight: parseFloat(formData.bodyWeight),
        dailyCalorieGoal: parseInt(formData.dailyCalorieGoal),
        targetMonthlyWeightChange: parseFloat(formData.targetMonthlyWeightChange) || undefined,
        preferredUnit: formData.preferredUnit as 'grams' | 'tablespoons',
      };

      await updateUserProfile(userId, updatedProfile);
      setSuccess('Profile updated successfully!');
      onUpdate();
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-gray-800 p-6 rounded-lg">
        <h2 className="text-2xl font-bold mb-6 text-white">Settings</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-500/10 border border-green-500 text-green-500 px-4 py-3 rounded">
              {success}
            </div>
          )}

          {/* Account Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">
              Account Information
            </h3>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
              <input
                type="text"
                value={userProfile.email}
                disabled
                className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-gray-500 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
            </div>
          </div>

          {/* Body & Goals */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">
              Body & Goals
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Body Weight (kg)</label>
              <input
                type="number"
                name="bodyWeight"
                value={formData.bodyWeight}
                onChange={handleChange}
                required
                min="1"
                step="0.1"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Daily Calorie Goal</label>
              <input
                type="number"
                name="dailyCalorieGoal"
                value={formData.dailyCalorieGoal}
                onChange={handleChange}
                required
                min="1"
                step="1"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Target Monthly Weight Change (kg)
              </label>
              <input
                type="number"
                name="targetMonthlyWeightChange"
                value={formData.targetMonthlyWeightChange}
                onChange={handleChange}
                step="0.1"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Positive for weight gain, negative for weight loss, 0 to maintain
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Preferred Measurement Unit
              </label>
              <select
                name="preferredUnit"
                value={formData.preferredUnit}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="grams">Grams (g)</option>
                <option value="tablespoons">Tablespoons (tbsp)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Your preferred unit for ingredient measurements (countable items like eggs will use natural units)
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 pt-4 border-t border-gray-700">
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Save Changes
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2"
            >
              <LogOut className="w-5 h-5" />
              Logout
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
