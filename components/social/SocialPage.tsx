'use client';

import React, { useState, useEffect } from 'react';
import { UserProfile, DailyStats } from '@/lib/types';
import { addFriendByCode, getFriendsProfiles, removeFriend } from '@/lib/user-service';
import { getDailyStats } from '@/lib/meal-service';
import { UserPlus, Users, Trash2, Loader2, Trophy, Flame, ChevronLeft, ChevronRight, X, ArrowLeft } from 'lucide-react';
import { format, subDays, addDays } from 'date-fns';
import { getColorFromPct } from '@/lib/color-utils';
import { MacroChart } from '@/components/charts/MacroChart';
import { CalorieChart } from '@/components/charts/CalorieChart';

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
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<UserProfile | null>(null);
  const [friendStats, setFriendStats] = useState<DailyStats | null>(null);
  const [friendWeeklyData, setFriendWeeklyData] = useState<DailyStats[]>([]);
  const [viewDate, setViewDate] = useState(new Date());
  const [loadingFriendData, setLoadingFriendData] = useState(false);

  useEffect(() => {
    loadFriends();
  }, [userProfile.friends]);

  useEffect(() => {
    if (selectedFriend) {
      loadFriendData();
    }
  }, [selectedFriend, viewDate]);

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

  const loadFriendData = async () => {
    if (!selectedFriend) return;
    
    setLoadingFriendData(true);
    try {
      const dailyStats = await getDailyStats(selectedFriend.uid, viewDate);
      setFriendStats(dailyStats);

      // Load last 7 days for trend
      const weekData: DailyStats[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = subDays(viewDate, i);
        const dayStats = await getDailyStats(selectedFriend.uid, date);
        weekData.push(dayStats);
      }
      setFriendWeeklyData(weekData);
    } catch (error) {
      console.error('Error loading friend data:', error);
    } finally {
      setLoadingFriendData(false);
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
      setShowAddFriend(false);
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
      if (selectedFriend?.uid === friendId) {
        setSelectedFriend(null);
      }
      onUpdate();
    } catch (err: any) {
      setError(err.message || 'Failed to remove friend');
    }
  };

  const changeDate = (days: number) => {
    setViewDate(prev => addDays(prev, days));
  };

  // Friend detail view
  if (selectedFriend && friendStats) {
    const calorieProgress = (friendStats.totalCalories / selectedFriend.dailyCalorieGoal) * 100;
    const remainingCalories = selectedFriend.dailyCalorieGoal - friendStats.totalCalories;
    const proteinProgress = selectedFriend.dailyProteinGoal
      ? (friendStats.totalProtein / selectedFriend.dailyProteinGoal) * 100
      : undefined;

    const chartCalorieData = friendWeeklyData.map((day) => ({
      date: format(new Date(day.date), 'EEE'),
      calories: Math.round(day.totalCalories),
      goal: selectedFriend.dailyCalorieGoal,
    }));

    const chartProteinData = friendWeeklyData.map((day) => ({
      date: format(new Date(day.date), 'EEE'),
      protein: Math.round(day.totalProtein),
      goal: selectedFriend.dailyProteinGoal || 0,
    }));

    const isToday = format(viewDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
    const isYesterday = format(viewDate, 'yyyy-MM-dd') === format(subDays(new Date(), 1), 'yyyy-MM-dd');

    return (
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={() => setSelectedFriend(null)}
            className="p-2 hover:bg-neutral-800 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5 text-neutral-400" />
          </button>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-neutral-50">{selectedFriend.displayName || 'Friend'}</h2>
            <div className="flex items-center gap-3 text-sm text-neutral-400">
              <div className="flex items-center gap-1">
                <Flame className="w-4 h-4 text-orange-400" />
                <span>{selectedFriend.currentStreak || 0} day streak</span>
              </div>
              <div className="flex items-center gap-1">
                <Trophy className="w-4 h-4 text-yellow-400" />
                <span>{selectedFriend.longestStreak || 0} best</span>
              </div>
            </div>
          </div>
        </div>

        {/* Date Navigation */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => changeDate(-1)}
              className="p-2 hover:bg-neutral-800 rounded-lg transition"
            >
              <ChevronLeft className="w-5 h-5 text-neutral-400" />
            </button>
            <div className="text-center">
              <p className="text-neutral-50 font-semibold">
                {isToday ? 'Today' : isYesterday ? 'Yesterday' : format(viewDate, 'MMM d, yyyy')}
              </p>
              <p className="text-xs text-neutral-400">{format(viewDate, 'EEEE')}</p>
            </div>
            <button
              onClick={() => changeDate(1)}
              disabled={isToday}
              className="p-2 hover:bg-neutral-800 rounded-lg transition disabled:opacity-30"
            >
              <ChevronRight className="w-5 h-5 text-neutral-400" />
            </button>
          </div>
        </div>

        {loadingFriendData ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
          </div>
        ) : (
          <>
            {/* Stats Overview */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
                <p className="text-neutral-400 text-xs font-medium mb-1">Calories</p>
                <p className="text-neutral-50 text-2xl font-bold">
                  {Math.round(friendStats.totalCalories)}
                </p>
                <p className="text-xs mt-1" style={{ color: getColorFromPct(calorieProgress) }}>
                  {remainingCalories > 0 ? `${Math.round(remainingCalories)} left` : `${Math.abs(Math.round(remainingCalories))} over`}
                </p>
              </div>

              <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
                <p className="text-neutral-400 text-xs font-medium mb-1">Protein</p>
                <p className="text-neutral-50 text-2xl font-bold">
                  {Math.round(friendStats.totalProtein)}g
                </p>
                {selectedFriend.dailyProteinGoal && (
                  <p className="text-xs mt-1 text-neutral-400">
                    of {selectedFriend.dailyProteinGoal}g
                  </p>
                )}
              </div>

              <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
                <p className="text-neutral-400 text-xs font-medium mb-1">Carbs</p>
                <p className="text-neutral-50 text-2xl font-bold">
                  {Math.round(friendStats.totalCarbohydrates)}g
                </p>
              </div>

              <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
                <p className="text-neutral-400 text-xs font-medium mb-1">Fats</p>
                <p className="text-neutral-50 text-2xl font-bold">
                  {Math.round(friendStats.totalFats)}g
                </p>
              </div>
            </div>

            {/* Progress Bars */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-neutral-50 mb-3">Daily Goals</h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs text-neutral-400 mb-1">
                    <span>Calories</span>
                    <span>{Math.round(calorieProgress)}%</span>
                  </div>
                  <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className="h-full transition-all duration-300"
                      style={{
                        width: `${Math.min(calorieProgress, 100)}%`,
                        backgroundColor: getColorFromPct(calorieProgress),
                      }}
                    />
                  </div>
                </div>

                {selectedFriend.dailyProteinGoal && proteinProgress !== undefined && (
                  <div>
                    <div className="flex justify-between text-xs text-neutral-400 mb-1">
                      <span>Protein</span>
                      <span>{Math.round(proteinProgress)}%</span>
                    </div>
                    <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                      <div
                        className="h-full transition-all duration-300"
                        style={{
                          width: `${Math.min(proteinProgress, 100)}%`,
                          backgroundColor: getColorFromPct(proteinProgress),
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Charts */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-neutral-50 mb-3">7-Day Calorie Trend</h3>
              <CalorieChart data={chartCalorieData} />
            </div>

            {selectedFriend.dailyProteinGoal && (
              <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-neutral-50 mb-3">7-Day Protein Trend</h3>
                <div className="h-48 flex items-end justify-between gap-2">
                  {chartProteinData.map((day, idx) => {
                    const percentage = day.goal > 0 ? (day.protein / day.goal) * 100 : 0;
                    const height = Math.min(percentage, 100);
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                        <div className="text-xs text-neutral-400 mb-1">{Math.round(day.protein)}g</div>
                        <div className="w-full bg-neutral-800 rounded-t relative flex-1 flex items-end">
                          <div
                            className="w-full rounded-t transition-all"
                            style={{
                              height: `${height}%`,
                              backgroundColor: getColorFromPct(percentage),
                            }}
                          />
                        </div>
                        <div className="text-xs text-neutral-500 mt-1">{day.date}</div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-2 text-center text-xs text-neutral-500">
                  Goal: {selectedFriend.dailyProteinGoal}g
                </div>
              </div>
            )}

            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-neutral-50 mb-3">Macro Distribution</h3>
              <MacroChart
                protein={friendStats.totalProtein}
                carbs={friendStats.totalCarbohydrates}
                fats={friendStats.totalFats}
              />
            </div>

            {/* Meals */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-neutral-50 mb-3">
                Meals ({friendStats.meals.length})
              </h3>
              {friendStats.meals.length === 0 ? (
                <p className="text-neutral-400 text-sm text-center py-4">No meals logged</p>
              ) : (
                <div className="space-y-2">
                  {friendStats.meals.map((meal) => (
                    <div key={meal.id} className="bg-neutral-800 rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="text-neutral-50 font-medium text-sm">{meal.recipeName}</h4>
                        <span className="text-neutral-400 text-xs">{meal.mass}g</span>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-xs">
                        <div>
                          <p className="text-neutral-500">Cal</p>
                          <p className="text-neutral-50 font-semibold">{Math.round(meal.nutrients.calories)}</p>
                        </div>
                        <div>
                          <p className="text-neutral-500">Protein</p>
                          <p className="text-neutral-50 font-semibold">{Math.round(meal.nutrients.protein)}g</p>
                        </div>
                        <div>
                          <p className="text-neutral-500">Carbs</p>
                          <p className="text-neutral-50 font-semibold">{Math.round(meal.nutrients.carbohydrates)}g</p>
                        </div>
                        <div>
                          <p className="text-neutral-500">Fats</p>
                          <p className="text-neutral-50 font-semibold">{Math.round(meal.nutrients.fats)}g</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  // Friends list view
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Header with Add Friend Button */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-neutral-50 flex items-center gap-2">
          <Users className="w-5 h-5" />
          Friends ({friends.length})
        </h2>
        <button
          onClick={() => setShowAddFriend(!showAddFriend)}
          className="p-2 bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 rounded-lg transition"
          title="Add friend"
        >
          {showAddFriend ? <X className="w-5 h-5 text-neutral-50" /> : <UserPlus className="w-5 h-5 text-neutral-50" />}
        </button>
      </div>

      {/* Add Friend Section (Collapsible) */}
      {showAddFriend && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded mb-4 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-500/10 border border-green-500 text-green-500 px-4 py-3 rounded mb-4 text-sm">
              {success}
            </div>
          )}

          <form onSubmit={handleAddFriend} className="space-y-3">
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
                      Add
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Friends List */}
      {loadingFriends ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
        </div>
      ) : friends.length === 0 ? (
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-8 text-center">
          <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-3">
            <Users className="w-8 h-8 text-neutral-400" />
          </div>
          <h3 className="text-base font-semibold text-neutral-50 mb-1">No friends yet</h3>
          <p className="text-neutral-400 text-sm mb-4">Add friends using their friend code</p>
          <button
            onClick={() => setShowAddFriend(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-neutral-700 hover:bg-neutral-600 text-neutral-50 rounded-lg font-medium transition text-sm"
          >
            <UserPlus className="w-4 h-4" />
            Add Friend
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {friends.map((friend) => (
            <div
              key={friend.uid}
              className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 hover:border-neutral-700 transition cursor-pointer"
              onClick={() => {
                setSelectedFriend(friend);
                setViewDate(new Date());
              }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-base font-semibold text-neutral-50">
                      {friend.displayName || 'Anonymous'}
                    </h3>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm mb-2">
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

                  <div className="text-xs text-neutral-500">
                    Goal: {friend.dailyCalorieGoal} kcal
                    {friend.dailyProteinGoal && ` / ${friend.dailyProteinGoal}g protein`}
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFriend(friend.uid, friend.displayName || 'this friend');
                  }}
                  className="p-2 text-red-400 hover:bg-neutral-800 rounded-lg transition"
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
  );
};
