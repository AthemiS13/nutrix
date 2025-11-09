'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthForms } from '@/components/auth/AuthForms';
import { ProfileSetup } from '@/components/profile/ProfileSetup';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { RecipeForm } from '@/components/recipe/RecipeForm';
import { MealLogForm } from '@/components/meals/MealLogForm';
import { SettingsPage } from '@/components/settings/SettingsPage';
import { getUserProfile } from '@/lib/user-service';
import { getUserRecipes, deleteRecipe } from '@/lib/recipe-service';
import { UserProfile, Recipe } from '@/lib/types';
import { 
  Home, 
  BookOpen, 
  PlusCircle, 
  Loader2,
  Trash2,
  Edit,
  Settings
} from 'lucide-react';

type View = 'dashboard' | 'recipes' | 'log-meal' | 'create-recipe' | 'settings';

export default function HomePage() {
  const { user, loading: authLoading, logout } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);

  useEffect(() => {
    if (user) {
      loadProfile();
    } else {
      setProfileLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user && currentView === 'recipes') {
      loadRecipes();
    }
  }, [user, currentView]);

  const loadProfile = async () => {
    if (!user) return;
    
    setProfileLoading(true);
    try {
      const profile = await getUserProfile(user.uid);
      setUserProfile(profile);
    } catch (error) {
      console.error('Error loading profile:', error);
      // If profile doesn't exist, user needs to set it up
      setUserProfile(null);
    } finally {
      setProfileLoading(false);
    }
  };

  const loadRecipes = async () => {
    if (!user) return;
    
    try {
      const userRecipes = await getUserRecipes(user.uid);
      setRecipes(userRecipes);
    } catch (error) {
      console.error('Error loading recipes:', error);
    }
  };

  const handleDeleteRecipe = async (recipeId: string) => {
    if (!user || !confirm('Are you sure you want to delete this recipe?')) return;
    
    try {
      await deleteRecipe(user.uid, recipeId);
      loadRecipes();
    } catch (error) {
      console.error('Error deleting recipe:', error);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUserProfile(null);
    setCurrentView('dashboard');
  };

  if (authLoading || (user && profileLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl p-6">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center mb-3">
                <img src="/nutrix.svg" alt="Nutrix Logo" className="w-96 h-96 brightness-0 invert" />
              </div>
              <p className="text-zinc-400 text-sm">Track your nutrition, reach your goals</p>
            </div>
            <AuthForms />
          </div>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl p-6">
          <ProfileSetup
            uid={user.uid}
            email={user.email || ''}
            onComplete={loadProfile}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 pb-24">
      {/* Header */}
      <header className="bg-zinc-950 border-b border-zinc-800 sticky top-0 z-50">
        <div className="px-4 py-1">
          <div className="flex items-center justify-center">
            <img src="/nutrix.svg" alt="Nutrix" className="h-24 brightness-0 invert" />
          </div>
        </div>
      </header>

      <div className="px-4 py-4">
        {/* Main Content */}
        <main>
          {currentView === 'dashboard' && (
            <Dashboard userId={user.uid} userProfile={userProfile} />
          )}

          {currentView === 'log-meal' && (
            <MealLogForm
              userId={user.uid}
              onSuccess={() => setCurrentView('dashboard')}
            />
          )}

          {currentView === 'recipes' && !editingRecipe && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">My Recipes</h2>
                <button
                  onClick={() => setCurrentView('create-recipe')}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium text-sm"
                >
                  <PlusCircle className="w-4 h-4" />
                  New
                </button>
              </div>

              {recipes.length === 0 ? (
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 text-center">
                  <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-3">
                    <BookOpen className="w-6 h-6 text-zinc-600" />
                  </div>
                  <h3 className="text-base font-semibold text-white mb-1">No recipes yet</h3>
                  <p className="text-zinc-400 text-sm mb-4">Create your first recipe to get started</p>
                  <button
                    onClick={() => {
                      setEditingRecipe(null);
                      setCurrentView('create-recipe');
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition text-sm"
                  >
                    <PlusCircle className="w-4 h-4" />
                    Create Recipe
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {recipes.map((recipe) => (
                    <div key={recipe.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-zinc-700 transition">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="text-lg font-bold text-white">{recipe.name}</h3>
                          <p className="text-zinc-500 text-xs">{recipe.totalMass}g total</p>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => {
                              setEditingRecipe(recipe);
                              setCurrentView('create-recipe');
                            }}
                            className="p-2 text-blue-400 hover:bg-zinc-800 rounded-lg transition"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteRecipe(recipe.id)}
                            className="p-2 text-red-400 hover:bg-zinc-800 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        <div className="bg-zinc-800 p-3 rounded-lg">
                          <p className="text-zinc-500 text-xs font-medium mb-0.5">Cal</p>
                          <p className="text-white text-lg font-bold">
                            {recipe.nutrientsPer100g.calories.toFixed(0)}
                          </p>
                        </div>
                        <div className="bg-zinc-800 p-3 rounded-lg">
                          <p className="text-zinc-500 text-xs font-medium mb-0.5">Protein</p>
                          <p className="text-white text-lg font-bold">
                            {recipe.nutrientsPer100g.protein.toFixed(1)}g
                          </p>
                        </div>
                        <div className="bg-zinc-800 p-3 rounded-lg">
                          <p className="text-zinc-500 text-xs font-medium mb-0.5">Fats</p>
                          <p className="text-white text-lg font-bold">
                            {recipe.nutrientsPer100g.fats.toFixed(1)}g
                          </p>
                        </div>
                        <div className="bg-zinc-800 p-3 rounded-lg">
                          <p className="text-zinc-500 text-xs font-medium mb-0.5">Carbs</p>
                          <p className="text-white text-lg font-bold">
                            {recipe.nutrientsPer100g.carbohydrates.toFixed(1)}g
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {currentView === 'create-recipe' && (
            <RecipeForm
              userId={user.uid}
              recipeId={editingRecipe?.id}
              initialName={editingRecipe?.name}
              initialIngredients={editingRecipe?.ingredients}
              onSuccess={() => {
                setEditingRecipe(null);
                setCurrentView('recipes');
                loadRecipes();
              }}
              onCancel={() => {
                setEditingRecipe(null);
                setCurrentView('recipes');
              }}
            />
          )}

          {currentView === 'settings' && (
            <SettingsPage
              userId={user.uid}
              userProfile={userProfile}
              onUpdate={loadProfile}
              onLogout={handleLogout}
            />
          )}
        </main>
      </div>

      {/* Bottom Navigation for Mobile */}
      <nav className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 z-50">
        <div className="grid grid-cols-4 gap-1 p-2 pb-3">
          <button
            onClick={() => setCurrentView('dashboard')}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition ${
              currentView === 'dashboard'
                ? 'bg-blue-600 text-white'
                : 'text-zinc-400'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-xs font-medium">Dashboard</span>
          </button>
          <button
            onClick={() => {
              setCurrentView('log-meal');
              setEditingRecipe(null);
            }}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition ${
              currentView === 'log-meal'
                ? 'bg-blue-600 text-white'
                : 'text-zinc-400'
            }`}
          >
            <PlusCircle className="w-5 h-5" />
            <span className="text-xs font-medium">Log Meal</span>
          </button>
          <button
            onClick={() => {
              setCurrentView('recipes');
              setEditingRecipe(null);
            }}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition ${
              currentView === 'recipes' || currentView === 'create-recipe'
                ? 'bg-blue-600 text-white'
                : 'text-zinc-400'
            }`}
          >
            <BookOpen className="w-5 h-5" />
            <span className="text-xs font-medium">Recipes</span>
          </button>
          <button
            onClick={() => {
              setCurrentView('settings');
              setEditingRecipe(null);
            }}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition ${
              currentView === 'settings'
                ? 'bg-blue-600 text-white'
                : 'text-zinc-400'
            }`}
          >
            <Settings className="w-5 h-5" />
            <span className="text-xs font-medium">Settings</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
