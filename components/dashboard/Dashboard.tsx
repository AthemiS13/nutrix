'use client';

import React, { useEffect, useState } from 'react';
import { getDailyStats, deleteMeal } from '@/lib/meal-service';
import { DailyStats, MealLog, UserProfile } from '@/lib/types';
import { MacroChart } from '@/components/charts/MacroChart';
import { CalorieChart } from '@/components/charts/CalorieChart';
import { ProteinProgress } from '@/components/charts/ProteinProgress';
import { StreakCard } from '@/components/dashboard/StreakCard';
import { updateStreak, metDailyGoals } from '@/lib/streak-service';
import { format, subDays } from 'date-fns';
import { getColorFromPct } from '@/lib/color-utils';
import { Trash2, Loader2, ChevronLeft, ChevronRight, Sparkles, MessageSquareQuote, Lightbulb } from 'lucide-react';
import { rateDailyIntake, suggestNextMeal } from '@/lib/gemini';

interface DashboardProps {
  userId: string;
  userProfile: UserProfile;
}

export const Dashboard: React.FC<DashboardProps> = ({ userId, userProfile }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [stats, setStats] = useState<DailyStats | null>(null);
  const [weeklyData, setWeeklyData] = useState<DailyStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [streakData, setStreakData] = useState({
    currentStreak: userProfile.currentStreak || 0,
    longestStreak: userProfile.longestStreak || 0,
  });

  const [aiRating, setAiRating] = useState<string | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [ratingLoading, setRatingLoading] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [userId, currentDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const dailyStats = await getDailyStats(userId, currentDate);
      setStats(dailyStats);

      // Update streak if viewing today's date
      const today = format(new Date(), 'yyyy-MM-dd');
      const viewingToday = format(currentDate, 'yyyy-MM-dd') === today;

      if (viewingToday) {
        const updatedStreak = await updateStreak(userId, dailyStats, userProfile);
        setStreakData(updatedStreak);
      }

      // Load last 7 days for trend
      const weekData: DailyStats[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = subDays(currentDate, i);
        const dayStats = await getDailyStats(userId, date);
        weekData.push(dayStats);
      }
      setWeeklyData(weekData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMeal = async (mealId: string) => {
    if (!confirm('Are you sure you want to delete this meal?')) return;

    try {
      await deleteMeal(userId, mealId);
      loadData();
    } catch (error) {
      console.error('Error deleting meal:', error);
    }
  };

  const changeDate = (days: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + days);
    setCurrentDate(newDate);
  };


  const handleRateMyDay = async () => {
    if (!stats) return;
    if (!userProfile.geminiApiKey) {
      alert('Please add your Gemini API Key in Settings first.');
      return;
    }
    setRatingLoading(true);
    setAiRating(null);
    try {
      const rating = await rateDailyIntake(stats, userProfile, userProfile.geminiApiKey);
      setAiRating(rating);
    } catch (error) {
      console.error(error);
      alert('Failed to rate intake. Please try again.');
    } finally {
      setRatingLoading(false);
    }
  };

  const handleSuggestFood = async () => {
    if (!stats) return;
    if (!userProfile.geminiApiKey) {
      alert('Please add your Gemini API Key in Settings first.');
      return;
    }
    setSuggestLoading(true);
    setAiSuggestion(null);
    try {
      const suggestion = await suggestNextMeal(stats, userProfile, userProfile.geminiApiKey);
      setAiSuggestion(suggestion);
    } catch (error) {
      console.error(error);
      alert('Failed to suggest food. Please try again.');
    } finally {
      setSuggestLoading(false);
    }
  };
  if (loading || !stats) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  const calorieProgress = (stats.totalCalories / userProfile.dailyCalorieGoal) * 100;
  const remainingCalories = userProfile.dailyCalorieGoal - stats.totalCalories;

  const proteinProgress = userProfile.dailyProteinGoal
    ? (stats.totalProtein / userProfile.dailyProteinGoal) * 100
    : undefined;

  // use shared color util for goal/gradient colors

  // Prepare data for recharts
  const chartCalorieData = weeklyData.map((day) => ({
    date: format(new Date(day.date), 'EEE'),
    calories: day.totalCalories,
    goal: userProfile.dailyCalorieGoal,
    protein: day.totalProtein,
  }));

  const proteinColor = getColorFromPct(proteinProgress ?? 0);

  return (
    <div className="space-y-6">
      {/* Date Navigation */}
      <div className="bg-neutral-900 p-4 rounded-lg flex items-center justify-between">
        <button
          onClick={() => changeDate(-1)}
          className="p-2 hover:bg-neutral-800 rounded-lg transition"
        >
          <ChevronLeft className="w-5 h-5 text-neutral-50" />
        </button>
        <h2 className="text-xl font-bold text-neutral-50">
          {format(currentDate, 'EEE, MMM d')}
        </h2>
        <button
          onClick={() => changeDate(1)}
          className="p-2 hover:bg-neutral-800 rounded-lg transition"
          disabled={format(currentDate, 'yyyy-MM-dd') >= format(new Date(), 'yyyy-MM-dd')}
        >
          <ChevronRight className="w-5 h-5 text-neutral-50" />
        </button>
      </div>

      {/* Calories Overview (styled like ProteinProgress) */}
      <div className="grid grid-cols-1 gap-4">
        <div className="bg-neutral-900 p-6 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-neutral-400 text-sm mb-1">Calories Intake</p>
              <p className="text-3xl font-bold text-neutral-50">
                {stats.totalCalories.toFixed(0)}
                <span className="text-lg text-neutral-400 ml-2">/ {userProfile.dailyCalorieGoal} kcal</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-neutral-50">
                {calorieProgress > 100 ? '✓' : `${Math.round(calorieProgress)}%`}
              </p>
              <p className="text-xs text-neutral-400 mt-1">{stats.totalCalories > userProfile.dailyCalorieGoal ? 'goal met' : 'of goal'}</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="bg-neutral-800 rounded-full h-3 overflow-hidden">
              <div
                className="h-3 rounded-full transition-all"
                style={{
                  width: `${Math.min(calorieProgress, 200)}%`,
                  backgroundColor: getColorFromPct(calorieProgress),
                }}
              />
            </div>

            {/* keep the top-right small label; remove the duplicate under the bar */}
          </div>
        </div>
      </div>

      {/* Protein progress directly below Calories as requested */}
      {userProfile.dailyProteinGoal && (
        <div className="mt-2">
          <ProteinProgress
            current={stats.totalProtein}
            goal={userProfile.dailyProteinGoal}
            color={proteinColor}
          />
        </div>
      )}
      {/* Macronutrients & Protein (stacked vertically) */}
      <div className="grid grid-cols-1 gap-6">
        <div className="bg-neutral-900 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-neutral-50 mb-4">Macronutrient Distribution</h3>
          <div className="h-64">
            <MacroChart
              protein={stats.totalProtein}
              fats={stats.totalFats}
              carbs={stats.totalCarbohydrates}
            />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-4">
            {/* Use same palette as MacroChart for the numeric figures */}
            {(() => {
              const MACRO_COLORS = ['#e5e5e5', '#a3a3a3', '#525252'];
              return (
                <>
                  <div className="text-center">
                    <p className="text-neutral-400 text-xs">Protein</p>
                    <p className="text-lg font-bold" style={{ color: MACRO_COLORS[0] }}>{stats.totalProtein.toFixed(1)}g</p>
                  </div>
                  <div className="text-center">
                    <p className="text-neutral-400 text-xs">Fats</p>
                    <p className="text-lg font-bold" style={{ color: MACRO_COLORS[1] }}>{stats.totalFats.toFixed(1)}g</p>
                  </div>
                  <div className="text-center">
                    <p className="text-neutral-400 text-xs">Carbs</p>
                    <p className="text-lg font-bold" style={{ color: MACRO_COLORS[2] }}>{stats.totalCarbohydrates.toFixed(1)}g</p>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Streak Card - below macronutrients */}
      <StreakCard
        currentStreak={streakData.currentStreak}
        longestStreak={streakData.longestStreak}
        goalsMet={metDailyGoals(stats, userProfile)}
      />

      {/* 7-Day Trends: Calories & Protein */}
      <div className="grid grid-cols-1 gap-4">
        <div className="bg-neutral-900 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-neutral-50 mb-4">7-Day Calories</h3>
          <div className="h-56">
            <CalorieChart data={chartCalorieData} metric="calories" goal={userProfile.dailyCalorieGoal} />
          </div>
        </div>

        {userProfile.dailyProteinGoal && (
          <div className="bg-neutral-900 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-neutral-50 mb-4">7-Day Protein</h3>
            <div className="h-56">
              <CalorieChart data={chartCalorieData} metric="protein" goal={userProfile.dailyProteinGoal} />
            </div>
          </div>
        )}
      </div>

      {/* Meal Log */}
      <div className="bg-neutral-900 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-neutral-50 mb-4">Today's Meals</h3>
        {stats.meals.length === 0 ? (
          <p className="text-neutral-400 text-center py-4">No meals logged yet today</p>
        ) : (
          <div className="grid gap-3">
            {stats.meals.map((meal) => (
              <div
                key={meal.id}
                className="bg-neutral-800 p-3 rounded-lg hover:bg-neutral-700 transition"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-neutral-50">{meal.recipeName}</h4>
                    <p className="text-neutral-400 text-xs">{meal.mass}g</p>
                  </div>
                  <div className="flex items-start">
                    {/* keep delete option, but remove colored accent */}
                    <button
                      onClick={() => handleDeleteMeal(meal.id)}
                      className="text-neutral-400 hover:text-neutral-50 p-1"
                      title="Delete meal"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2 pt-2 border-t border-neutral-800">
                  <div>
                    <p className="text-neutral-400 text-xs">Calories</p>
                    <p className="text-neutral-50 text-sm font-bold">{meal.nutrients.calories.toFixed(0)} kcal</p>
                  </div>
                  <div>
                    <p className="text-neutral-400 text-xs">Protein</p>
                    <p className="text-neutral-50 text-sm font-semibold">{meal.nutrients.protein.toFixed(1)}g</p>
                  </div>
                  <div>
                    <p className="text-neutral-400 text-xs">Fats</p>
                    <p className="text-neutral-50 text-sm font-semibold">{meal.nutrients.fats.toFixed(1)}g</p>
                  </div>
                  <div>
                    <p className="text-neutral-400 text-xs">Carbs</p>
                    <p className="text-neutral-50 text-sm font-semibold">{meal.nutrients.carbohydrates.toFixed(1)}g</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI Assistant Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-neutral-900 p-6 rounded-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center">
              <MessageSquareQuote className="w-5 h-5 text-neutral-400" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-50">Rate my Day</h3>
          </div>

          {aiRating ? (
            <div className="mb-4 p-4 bg-neutral-800 rounded-lg text-neutral-300 text-sm leading-relaxed animate-in fade-in slide-in-from-bottom-2">
              <p>{aiRating}</p>
              <button
                onClick={() => setAiRating(null)}
                className="mt-3 text-xs text-neutral-500 hover:text-neutral-300"
              >
                Clear
              </button>
            </div>
          ) : (
            <p className="text-neutral-400 text-sm mb-4">
              Get a quick analysis of your intake and helpful tips.
            </p>
          )}

          <button
            onClick={handleRateMyDay}
            disabled={ratingLoading}
            className="w-full bg-neutral-800 hover:bg-neutral-700 text-neutral-50 font-medium py-2.5 px-4 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {ratingLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 text-neutral-400" />
            )}
            {ratingLoading ? 'Analyzing...' : 'Rate Today'}
          </button>
        </div>

        <div className="bg-neutral-900 p-6 rounded-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center">
              <Lightbulb className="w-5 h-5 text-neutral-400" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-50">Suggest Food</h3>
          </div>

          {aiSuggestion ? (
            <div className="mb-4 p-4 bg-neutral-800 rounded-lg text-neutral-300 text-sm leading-relaxed animate-in fade-in slide-in-from-bottom-2">
              <p>{aiSuggestion}</p>
              <button
                onClick={() => setAiSuggestion(null)}
                className="mt-3 text-xs text-neutral-500 hover:text-neutral-300"
              >
                Clear
              </button>
            </div>
          ) : (
            <p className="text-neutral-400 text-sm mb-4">
              Stuck? Get a meal suggestion to hit your goals.
            </p>
          )}

          <button
            onClick={handleSuggestFood}
            disabled={suggestLoading}
            className="w-full bg-neutral-800 hover:bg-neutral-700 text-neutral-50 font-medium py-2.5 px-4 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {suggestLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 text-neutral-400" />
            )}
            {suggestLoading ? 'Thinking...' : 'Suggest Meal'}
          </button>
        </div>
      </div>
    </div>
  );
};
