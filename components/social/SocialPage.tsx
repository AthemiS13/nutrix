'use client';

import React, { useState, useEffect } from 'react';
import { UserProfile } from '@/lib/types';
import { addFriendByCode, getFriendsProfiles, removeFriend } from '@/lib/user-service';
import { UserPlus, Users, Trash2, Loader2, Trophy, Flame } from 'lucide-react';

interface SocialPageProps {
  userId: string;
  userProfile: UserProfile;
  onUpdate: () => void;
}

export const SocialPage: React.FC<SocialPageProps> = ({ userId, userProfile, onUpdate }) => {
  const [friendCode, setFriendCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(true);

  useEffect(() => {
    loadFriends();
  }, [userProfile.friends]);

  const loadFriends = async () => {
    setLoadingFriends(true);
    try {
      const friendIds = userProfile.friends || [];
      const friendProfiles = await getFriendsProfiles(friendIds);
      setFriends(friendProfiles);
    } catch (err) {
      console.error('Error loading friends:', err);
    } finally {
      setLoadingFriends(false);
    }
  };

  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!friendCode.trim()) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await addFriendByCode(userId, friendCode.trim().toUpperCase());
      setSuccess('Friend added successfully!');
      setFriendCode('');
      onUpdate();
    } catch (err: any) {
      setError(err.message || 'Failed to add friend');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFriend = async (friendId: string, friendName: string) => {
    if (!confirm(`Remove ${friendName} from your friends?`)) return;

    try {
      await removeFriend(userId, friendId);
      setSuccess('Friend removed');
      onUpdate();
    } catch (err: any) {
      setError(err.message || 'Failed to remove friend');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Add Friend Section */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
        <h2 className="text-xl font-bold text-neutral-50 mb-4 flex items-center gap-2">
          <UserPlus className="w-5 h-5" />
          Add Friend
        </h2>

        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-500/10 border border-green-500 text-green-500 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}

        <form onSubmit={handleAddFriend} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-2">
              Enter Friend Code
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={friendCode}
                onChange={(e) => setFriendCode(e.target.value.toUpperCase())}
                placeholder="ABC123"
                maxLength={6}
                className="flex-1 px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-50 font-mono text-lg tracking-wider focus:ring-2 focus:ring-neutral-600 focus:border-transparent uppercase"
              />
              <button
                type="submit"
                disabled={loading || !friendCode.trim()}
                className="px-6 py-2 bg-neutral-700 hover:bg-neutral-600 text-neutral-50 font-semibold rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2 whitespace-nowrap"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Add Friend
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-neutral-400 mt-2">
              Get your friend code in Settings and share it with friends
            </p>
          </div>
        </form>
      </div>

      {/* Friends List */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
        <h2 className="text-xl font-bold text-neutral-50 mb-4 flex items-center gap-2">
          <Users className="w-5 h-5" />
          My Friends ({friends.length})
        </h2>

        {loadingFriends ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
          </div>
        ) : friends.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-3">
              <Users className="w-8 h-8 text-neutral-400" />
            </div>
            <p className="text-neutral-400 text-sm">No friends yet</p>
            <p className="text-neutral-500 text-xs mt-1">Add friends using their friend code</p>
          </div>
        ) : (
          <div className="space-y-3">
            {friends.map((friend) => (
              <div
                key={friend.uid}
                className="bg-neutral-800 border border-neutral-700 rounded-lg p-4 hover:border-neutral-600 transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-base font-semibold text-neutral-50">
                        {friend.displayName || 'Anonymous'}
                      </h3>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1.5 text-neutral-400">
                        <Flame className="w-4 h-4 text-orange-400" />
                        <span className="font-medium text-neutral-50">
                          {friend.currentStreak || 0}
                        </span>
                        <span>day streak</span>
                      </div>
                      
                      <div className="flex items-center gap-1.5 text-neutral-400">
                        <Trophy className="w-4 h-4 text-yellow-400" />
                        <span className="font-medium text-neutral-50">
                          {friend.longestStreak || 0}
                        </span>
                        <span>best</span>
                      </div>
                    </div>

                    <div className="mt-2 text-xs text-neutral-500">
                      Goal: {friend.dailyCalorieGoal} kcal
                      {friend.dailyProteinGoal && ` / ${friend.dailyProteinGoal}g protein`}
                    </div>
                  </div>

                  <button
                    onClick={() => handleRemoveFriend(friend.uid, friend.displayName || 'this friend')}
                    className="p-2 text-red-400 hover:bg-neutral-700 rounded-lg transition"
                    title="Remove friend"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Coming Soon Section */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
        <h3 className="text-base font-semibold text-neutral-50 mb-2">Coming Soon</h3>
        <ul className="text-sm text-neutral-400 space-y-1">
          <li>• Leaderboards and competitions</li>
          <li>• Share meals and recipes</li>
          <li>• Group challenges</li>
          <li>• Activity feed</li>
        </ul>
      </div>
    </div>
  );
};
