'use client';

import React, { useEffect, useState } from 'react';
import { getDailyStats, deleteMeal } from '@/lib/meal-service';
import { DailyStats, MealLog, UserProfile } from '@/lib/types';
import { MacroChart } from '@/components/charts/MacroChart';
import { CalorieChart } from '@/components/charts/CalorieChart';
import { ProteinProgress } from '@/components/charts/ProteinProgress';
import { format, subDays } from 'date-fns';
import { Trash2, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

interface DashboardProps {
  userId: string;
  userProfile: UserProfile;
}

export const Dashboard: React.FC<DashboardProps> = ({ userId, userProfile }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [stats, setStats] = useState<DailyStats | null>(null);
  const [weeklyData, setWeeklyData] = useState<DailyStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [userId, currentDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const dailyStats = await getDailyStats(userId, currentDate);
      setStats(dailyStats);

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

  const getHueForPct = (pct: number) => {
    // Map pct to hue: 0 -> red (0deg), 50 -> yellow (~60deg), 100 -> green (120deg).
    // If pct > 100, map back towards red: overPct fraction will reduce hue back to red.
    const clamp = (v: number, a = 0, b = 200) => Math.max(a, Math.min(b, v));
    pct = clamp(pct, 0, 200);
    if (pct <= 100) {
      return (pct / 100) * 120; // 0..120
    }
    // pct in (100..200] -> map 0..100 back to 120..0
    const over = (pct - 100) / 100; // 0..1
    return (1 - over) * 120;
  };

  const getColorFromPct = (pct: number) => {
    const hue = getHueForPct(pct);
    // Use slightly desaturated, not too bright
    return `hsl(${hue.toFixed(0)} 60% 50%)`;
  };

  // Prepare data for recharts
  const chartCalorieData = weeklyData.map((day) => ({
    date: format(new Date(day.date), 'EEE'),
    calories: day.totalCalories,
    goal: userProfile.dailyCalorieGoal,
    protein: day.totalProtein,
  }));

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
              <p className="text-xs text-neutral-400 mt-1">{stats.totalCalories > userProfile.dailyCalorieGoal ? 'goal met' : 'to go'}</p>
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

            {stats.totalCalories > userProfile.dailyCalorieGoal && (
              <p className="text-xs text-neutral-400">+{(stats.totalCalories - userProfile.dailyCalorieGoal).toFixed(0)} kcal over goal</p>
            )}
          </div>
        </div>
      </div>

      {/* Macronutrients & Protein */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
            <div className="text-center">
              <p className="text-neutral-400 text-xs">Protein</p>
              <p className="text-neutral-50 text-lg font-bold">{stats.totalProtein.toFixed(1)}g</p>
            </div>
            <div className="text-center">
              <p className="text-neutral-400 text-xs">Fats</p>
              <p className="text-neutral-50 text-lg font-bold">{stats.totalFats.toFixed(1)}g</p>
            </div>
            <div className="text-center">
              <p className="text-neutral-400 text-xs">Carbs</p>
              <p className="text-neutral-50 text-lg font-bold">{stats.totalCarbohydrates.toFixed(1)}g</p>
            </div>
          </div>
        </div>

        {userProfile.dailyProteinGoal && (
          <ProteinProgress
            current={stats.totalProtein}
            goal={userProfile.dailyProteinGoal}
          />
        )}
      </div>

      {/* 7-Day Calorie Trend */}
      <div className="bg-neutral-900 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-neutral-50 mb-4">7-Day Calorie Trend</h3>
        <div className="h-64">
          <CalorieChart data={chartCalorieData} />
        </div>
      </div>

      {/* Meal Log */}
      <div className="bg-neutral-900 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-neutral-50 mb-4">Today's Meals</h3>
        {stats.meals.length === 0 ? (
          <p className="text-neutral-400 text-center py-4">No meals logged yet today</p>
        ) : (
          <div className="space-y-3">
            {stats.meals.map((meal) => (
              <div key={meal.id} className="bg-neutral-800 p-4 rounded-lg flex justify-between items-start">
                <div className="flex-1">
                  <h4 className="text-neutral-50 font-semibold">{meal.recipeName}</h4>
                  <p className="text-neutral-400 text-sm">{meal.mass}g</p>
                  <div className="mt-2 flex gap-4 text-sm">
                    <span className="text-neutral-400">{meal.nutrients.calories.toFixed(0)} kcal</span>
                    <span className="text-neutral-400">P: {meal.nutrients.protein.toFixed(1)}g</span>
                    <span className="text-neutral-400">F: {meal.nutrients.fats.toFixed(1)}g</span>
                    <span className="text-neutral-400">C: {meal.nutrients.carbohydrates.toFixed(1)}g</span>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteMeal(meal.id)}
                  className="text-red-400 hover:text-red-300 p-2"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
