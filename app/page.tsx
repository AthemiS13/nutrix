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
  Settings,
  Users
} from 'lucide-react';

type View = 'dashboard' | 'recipes' | 'log-meal' | 'create-recipe' | 'settings' | 'social';

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
      <div className="app-container flex items-center justify-center bg-neutral-950">
        <Loader2 className="w-12 h-12 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="app-container bg-neutral-950 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center mb-4">
              <img src="/nutrix.svg" alt="Nutrix Logo" className="w-32 h-32 brightness-0 invert" />
            </div>
            <p className="text-neutral-400 text-base">Track your nutrition, reach your goals</p>
          </div>
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl p-6">
            <AuthForms />
          </div>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="app-container bg-neutral-950 flex items-center justify-center p-4">
        <div className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl p-6">
          <ProfileSetup
            uid={user.uid}
            email={user.email || ''}
            onComplete={loadProfile}
            onLogout={handleLogout}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="app-container bg-neutral-950">
      {/* Header (fixed) */}
      <header
        className="app-header border-b border-neutral-800"
        style={{
          backgroundColor: 'var(--app-bg)',
        }}
      >
        <div className="px-4 h-full flex items-end justify-center relative">
          {/* larger logo that overflows the header visually */}
          <img src="/nutrix.svg" alt="Nutrix" className="h-[5.5rem] brightness-0 invert" style={{position: 'relative', bottom: '-0.25rem'}} />
        </div>
      </header>

      {/* Main Content - scrollable area */}
      <main className="app-content">
        <div className="px-4 py-4">
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
                <h2 className="text-xl font-bold text-neutral-50">My Recipes</h2>
                <button
                  onClick={() => setCurrentView('create-recipe')}
                  className="flex items-center gap-2 px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-neutral-50 rounded-lg transition font-medium text-sm"
                >
                  <PlusCircle className="w-4 h-4" />
                  New
                </button>
              </div>

              {recipes.length === 0 ? (
                <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-8 text-center">
                  <div className="w-12 h-12 bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-3">
                    <BookOpen className="w-6 h-6 text-neutral-400" />
                  </div>
                  <h3 className="text-base font-semibold text-neutral-50 mb-1">No recipes yet</h3>
                  <p className="text-neutral-400 text-sm mb-4">Create your first recipe to get started</p>
                  <button
                    onClick={() => {
                      setEditingRecipe(null);
                      setCurrentView('create-recipe');
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-neutral-700 hover:bg-neutral-600 text-neutral-50 rounded-lg font-medium transition text-sm"
                  >
                    <PlusCircle className="w-4 h-4" />
                    Create Recipe
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {recipes.map((recipe) => (
                    <div key={recipe.id} className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 hover:border-neutral-700 transition">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="text-lg font-bold text-neutral-50">{recipe.name}</h3>
                          <p className="text-neutral-400 text-xs">{recipe.totalMass}g</p>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => {
                              setEditingRecipe(recipe);
                              setCurrentView('create-recipe');
                            }}
                            className="p-2 text-neutral-400 hover:bg-neutral-800 rounded-lg transition"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteRecipe(recipe.id)}
                            className="p-2 text-red-400 hover:bg-neutral-800 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        <div className="bg-neutral-800 p-3 rounded-lg">
                          <p className="text-neutral-400 text-xs font-medium mb-0.5">Cal</p>
                          <p className="text-neutral-50 text-lg font-bold">
                            {recipe.totalNutrients.calories.toFixed(0)}
                          </p>
                        </div>
                        <div className="bg-neutral-800 p-3 rounded-lg">
                          <p className="text-neutral-400 text-xs font-medium mb-0.5">Protein</p>
                          <p className="text-neutral-50 text-lg font-bold">
                            {recipe.totalNutrients.protein.toFixed(1)}g
                          </p>
                        </div>
                        <div className="bg-neutral-800 p-3 rounded-lg">
                          <p className="text-neutral-400 text-xs font-medium mb-0.5">Fats</p>
                          <p className="text-neutral-50 text-lg font-bold">
                            {recipe.totalNutrients.fats.toFixed(1)}g
                          </p>
                        </div>
                        <div className="bg-neutral-800 p-3 rounded-lg">
                          <p className="text-neutral-400 text-xs font-medium mb-0.5">Carbs</p>
                          <p className="text-neutral-50 text-lg font-bold">
                            {recipe.totalNutrients.carbohydrates.toFixed(1)}g
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
              preferredUnit={userProfile.preferredUnit || 'grams'}
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

          {currentView === 'social' && (
            <div className="space-y-4">
              <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 text-center">
                <h2 className="text-lg font-semibold text-neutral-50 mb-2">Social</h2>
                <p className="text-neutral-400 text-sm">Coming soon — friends, leaderboards and sharing.</p>
              </div>
            </div>
          )}

          {currentView === 'settings' && (
            <SettingsPage
              userId={user.uid}
              userProfile={userProfile}
              onUpdate={loadProfile}
              onLogout={handleLogout}
            />
          )}
        </div>
      </main>

      {/* Bottom Navigation for Mobile (fixed) */}
      <nav className="app-nav bg-neutral-900 border-t border-neutral-800">
        {/* compact nav: show color-only active state (no boxes) and add a Social tab */}
        <div className="grid grid-cols-5 gap-0 w-full items-center" style={{height: '100%'}}>
          <button
            onClick={() => setCurrentView('dashboard')}
            aria-current={currentView === 'dashboard' ? 'page' : undefined}
            className={`flex flex-col items-center justify-center gap-0 px-0 h-full transition ${
              currentView === 'dashboard' ? 'text-neutral-50 font-semibold' : 'text-neutral-400'
            }`}
          >
            <Home className="w-6 h-6 mt-2" />
            <span className="text-[9px]">Dashboard</span>
          </button>

          <button
            onClick={() => {
              setCurrentView('log-meal');
              setEditingRecipe(null);
            }}
            aria-current={currentView === 'log-meal' ? 'page' : undefined}
            className={`flex flex-col items-center justify-center gap-0 px-0 h-full transition ${
              currentView === 'log-meal' ? 'text-neutral-50 font-semibold' : 'text-neutral-400'
            }`}
          >
            <PlusCircle className="w-6 h-6 mt-2" />
            <span className="text-[9px]">Log Meal</span>
          </button>

          <button
            onClick={() => {
              setCurrentView('recipes');
              setEditingRecipe(null);
            }}
            aria-current={currentView === 'recipes' || currentView === 'create-recipe' ? 'page' : undefined}
            className={`flex flex-col items-center justify-center gap-0 px-0 h-full transition ${
              currentView === 'recipes' || currentView === 'create-recipe' ? 'text-neutral-50 font-semibold' : 'text-neutral-400'
            }`}
          >
            <BookOpen className="w-6 h-6 mt-2" />
            <span className="text-[9px]">Recipes</span>
          </button>

          <button
            onClick={() => {
              setCurrentView('social');
              setEditingRecipe(null);
            }}
            aria-current={currentView === 'social' ? 'page' : undefined}
            className={`flex flex-col items-center justify-center gap-0 px-0 h-full transition ${
              currentView === 'social' ? 'text-neutral-50 font-semibold' : 'text-neutral-400'
            }`}
          >
            <Users className="w-6 h-6 mt-2" />
            <span className="text-[9px]">Social</span>
          </button>

          <button
            onClick={() => {
              setCurrentView('settings');
              setEditingRecipe(null);
            }}
            aria-current={currentView === 'settings' ? 'page' : undefined}
            className={`flex flex-col items-center justify-center gap-0 px-0 h-full transition ${
              currentView === 'settings' ? 'text-neutral-50 font-semibold' : 'text-neutral-400'
            }`}
          >
            <Settings className="w-6 h-6 mt-2" />
            <span className="text-[9px]">Settings</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
