'use client';

import React, { useState } from 'react';
import { UserProfile } from '@/lib/types';
import { updateUserProfile } from '@/lib/user-service';
import { Loader2, Save, LogOut, ChevronDown, Copy } from 'lucide-react';

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
    displayName: userProfile.displayName || '',
    bodyWeight: userProfile.bodyWeight.toString(),
    dailyCalorieGoal: userProfile.dailyCalorieGoal.toString(),
    dailyProteinGoal: userProfile.dailyProteinGoal?.toString() || '',
    targetMonthlyWeightChange: userProfile.targetMonthlyWeightChange?.toString() || '0',
    preferredUnit: userProfile.preferredUnit || 'grams',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

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
        displayName: formData.displayName.trim() || undefined,
        bodyWeight: parseFloat(formData.bodyWeight),
        dailyCalorieGoal: parseInt(formData.dailyCalorieGoal),
        ...(formData.dailyProteinGoal && {
          dailyProteinGoal: parseInt(formData.dailyProteinGoal),
        }),
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

  const handleCopyFriendCode = async () => {
    if (!userProfile.friendCode) return;
    
    try {
      // Try modern clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(userProfile.friendCode);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } else {
        // Fallback for older browsers or non-secure contexts
        const textArea = document.createElement('textarea');
        textArea.value = userProfile.friendCode;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
          document.execCommand('copy');
          textArea.remove();
          setCopySuccess(true);
          setTimeout(() => setCopySuccess(false), 2000);
        } catch (err) {
          console.error('Fallback copy failed:', err);
          textArea.remove();
          alert('Could not copy to clipboard. Please copy manually: ' + userProfile.friendCode);
        }
      }
    } catch (err) {
      console.error('Failed to copy:', err);
      // Last resort: show alert with the code
      alert('Could not copy to clipboard. Please copy manually: ' + userProfile.friendCode);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-neutral-900 p-6 rounded-lg">
        <h2 className="text-2xl font-bold mb-6 text-neutral-50">Settings</h2>

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
            <h3 className="text-lg font-semibold text-neutral-50 border-b border-neutral-800 pb-2">
              Account Information
            </h3>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-2">Email</label>
              <input
                type="text"
                value={userProfile.email}
                disabled
                className="w-full px-4 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-400 cursor-not-allowed"
              />
              <p className="text-xs text-neutral-400 mt-1">Email cannot be changed</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-2">Display Name</label>
              <input
                type="text"
                name="displayName"
                value={formData.displayName}
                onChange={handleChange}
                maxLength={50}
                className="w-full px-4 py-2 bg-neutral-800 border border-neutral-800 rounded-lg text-neutral-50 focus:ring-2 focus:ring-neutral-600 focus:border-transparent"
                placeholder="Your name"
              />
              <p className="text-xs text-neutral-400 mt-1">This name will be visible to your friends</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-2">Friend Code</label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={userProfile.friendCode || 'Generating...'}
                    disabled
                    className="w-full px-4 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-50 font-mono text-lg tracking-wider cursor-not-allowed"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleCopyFriendCode}
                  disabled={!userProfile.friendCode}
                  className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-neutral-50 rounded-lg transition disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
                  title="Copy friend code"
                >
                  <Copy className="w-4 h-4" />
                  {copySuccess ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <p className="text-xs text-neutral-400 mt-1">
                Share this code with friends so they can add you. This code is permanent and unique to your account.
              </p>
            </div>
          </div>

          {/* Body & Goals */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-neutral-50 border-b border-neutral-800 pb-2">
              Body & Goals
            </h3>

            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-2">Body Weight (kg)</label>
              <input
                type="number"
                name="bodyWeight"
                value={formData.bodyWeight}
                onChange={handleChange}
                required
                min="1"
                step="0.1"
                className="w-full px-4 py-2 bg-neutral-800 border border-neutral-800 rounded-lg text-neutral-50 focus:ring-2 focus:ring-neutral-600 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-2">Daily Calorie Goal</label>
              <input
                type="number"
                name="dailyCalorieGoal"
                value={formData.dailyCalorieGoal}
                onChange={handleChange}
                required
                min="1"
                step="1"
                className="w-full px-4 py-2 bg-neutral-800 border border-neutral-800 rounded-lg text-neutral-50 focus:ring-2 focus:ring-neutral-600 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-2">
                Daily Protein Goal (grams) - Optional
              </label>
              <input
                type="number"
                name="dailyProteinGoal"
                value={formData.dailyProteinGoal}
                onChange={handleChange}
                min="0"
                step="1"
                className="w-full px-4 py-2 bg-neutral-800 border border-neutral-800 rounded-lg text-neutral-50 focus:ring-2 focus:ring-neutral-600 focus:border-transparent"
                placeholder="150"
              />
              <p className="text-xs text-neutral-400 mt-1">
                A common recommendation is 0.8-1.0g per lb of body weight. Leave empty to disable protein tracking.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-2">
                Target Monthly Weight Change (kg)
              </label>
              <input
                type="number"
                name="targetMonthlyWeightChange"
                value={formData.targetMonthlyWeightChange}
                onChange={handleChange}
                step="0.1"
                className="w-full px-4 py-2 bg-neutral-800 border border-neutral-800 rounded-lg text-neutral-50 focus:ring-2 focus:ring-neutral-600 focus:border-transparent"
              />
              <p className="text-xs text-neutral-400 mt-1">
                Positive for weight gain, negative for weight loss, 0 to maintain
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-2">
                Preferred Measurement Unit
              </label>
              <div className="relative">
                <select
                  name="preferredUnit"
                  value={formData.preferredUnit}
                  onChange={handleChange}
                  className="w-full appearance-none px-4 py-2 pr-10 bg-neutral-800 border border-neutral-800 rounded-lg text-neutral-50 focus:ring-2 focus:ring-neutral-600 focus:border-transparent"
                >
                  <option value="grams">Grams (g)</option>
                  <option value="tablespoons">Tablespoons (tbsp)</option>
                </select>
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-neutral-400">
                  <ChevronDown className="w-4 h-4" />
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-1">
                Your preferred unit for ingredient measurements (countable items like eggs will use natural units)
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 pt-4 border-t border-neutral-800">
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-neutral-700 hover:bg-neutral-600 text-neutral-50 font-semibold py-3 px-4 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
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
              className="w-full bg-neutral-800 hover:bg-neutral-700 text-neutral-50 font-semibold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2"
            >
              <LogOut className="w-5 h-5 text-red-400" />
              Logout
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
