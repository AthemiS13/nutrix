import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { db } from './firebase';
import { MealLog, Recipe, DailyStats } from './types';
import { startOfDay, endOfDay } from 'date-fns';

export const logMeal = async (
  userId: string,
  recipeId: string,
  recipeName: string,
  mass: number,
  nutrientsPer100g: any
): Promise<string> => {
  try {
    const multiplier = mass / 100;
    const nutrients = {
      calories: nutrientsPer100g.calories * multiplier,
      protein: nutrientsPer100g.protein * multiplier,
      fats: nutrientsPer100g.fats * multiplier,
      carbohydrates: nutrientsPer100g.carbohydrates * multiplier,
    };

  if (!db) throw new Error('Firestore not initialized. Ensure NEXT_PUBLIC_FIREBASE_* env vars are set and Firebase initializes on the client.');
  const mealsRef = collection(db as any, 'users', userId, 'meals');
    const now = new Date().toISOString();
    
    const mealData = {
      userId,
      recipeId,
      recipeName,
      mass,
      nutrients,
      date: now.split('T')[0], // Store as YYYY-MM-DD
      createdAt: now,
    };

    const docRef = await addDoc(mealsRef, mealData);
    return docRef.id;
  } catch (error) {
    console.error('Error logging meal:', error);
    throw error;
  }
};

export const getMealsByDate = async (userId: string, date: Date): Promise<MealLog[]> => {
  try {
    const dateString = date.toISOString().split('T')[0];
    if (!db) throw new Error('Firestore not initialized. Ensure NEXT_PUBLIC_FIREBASE_* env vars are set and Firebase initializes on the client.');
    const mealsRef = collection(db as any, 'users', userId, 'meals');
    const q = query(
      mealsRef,
      where('date', '==', dateString)
    );
    
    const querySnapshot = await getDocs(q);
    const meals = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as MealLog[];
    
    // Sort in memory instead of using Firestore orderBy to avoid index requirement
    return meals.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch (error) {
    console.error('Error fetching meals:', error);
    throw error;
  }
};

export const getDailyStats = async (userId: string, date: Date): Promise<DailyStats> => {
  try {
    const meals = await getMealsByDate(userId, date);
    
    const stats: DailyStats = {
      date: date.toISOString().split('T')[0],
      totalCalories: 0,
      totalProtein: 0,
      totalFats: 0,
      totalCarbohydrates: 0,
      meals,
    };

    meals.forEach((meal) => {
      stats.totalCalories += meal.nutrients.calories;
      stats.totalProtein += meal.nutrients.protein;
      stats.totalFats += meal.nutrients.fats;
      stats.totalCarbohydrates += meal.nutrients.carbohydrates;
    });

    return stats;
  } catch (error) {
    console.error('Error calculating daily stats:', error);
    throw error;
  }
};

export const deleteMeal = async (userId: string, mealId: string): Promise<void> => {
  try {
    if (!db) throw new Error('Firestore not initialized. Ensure NEXT_PUBLIC_FIREBASE_* env vars are set and Firebase initializes on the client.');
    const docRef = doc(db as any, 'users', userId, 'meals', mealId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting meal:', error);
    throw error;
  }
};

export const getMealsByDateRange = async (
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<MealLog[]> => {
  try {
    if (!db) throw new Error('Firestore not initialized. Ensure NEXT_PUBLIC_FIREBASE_* env vars are set and Firebase initializes on the client.');
    const mealsRef = collection(db as any, 'users', userId, 'meals');
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];
    
    // Use single orderBy to avoid composite index requirement
    const q = query(
      mealsRef,
      where('date', '>=', startStr),
      where('date', '<=', endStr),
      orderBy('date', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as MealLog));
  } catch (error) {
    console.error('Error fetching meals:', error);
    throw error;
  }
};
