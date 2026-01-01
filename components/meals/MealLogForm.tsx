'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { getUserRecipes } from '@/lib/recipe-service';
import { logMeal, logCustomMeal } from '@/lib/meal-service';
import { Recipe } from '@/lib/types';
import { Plus, Loader2, Search, X } from 'lucide-react';
import { convertToGrams, gramsToTablespoons, shouldUseNaturalUnit, sanitizeServingUnit, abbreviateUnit } from '@/lib/unit-utils';
import { searchIngredients, getIngredientById } from '@/lib/usda-api';
import { Ingredient } from '@/lib/types';
import { getUserProfile } from '@/lib/user-service';
import { analyzeFoodDescription } from '@/lib/gemini';
import { Sparkles } from 'lucide-react';

interface MealLogFormProps {
  userId: string;
  onSuccess: () => void;
  onNavigateToSettings: () => void;
}

export const MealLogForm: React.FC<MealLogFormProps> = ({ userId, onSuccess, onNavigateToSettings }) => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [logMode, setLogMode] = useState<'recipe' | 'manual' | 'food' | 'nutrix'>('recipe');
  const [mass, setMass] = useState('');
  const [selectedUnit, setSelectedUnit] = useState<'g' | 'tbsp' | 'special'>('g');
  const [useFullRecipe, setUseFullRecipe] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [foodSearchQuery, setFoodSearchQuery] = useState('');
  const [foodSearchResults, setFoodSearchResults] = useState<Ingredient[]>([]);
  const [foodSearching, setFoodSearching] = useState(false);
  const [selectedFood, setSelectedFood] = useState<Ingredient | null>(null);
  const [addingFoodId, setAddingFoodId] = useState<number | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  // Manual entry fields
  const [manualName, setManualName] = useState('');
  const [manualMass, setManualMass] = useState('');
  const [manualCalories, setManualCalories] = useState('');
  const [manualProtein, setManualProtein] = useState('');
  const [manualFats, setManualFats] = useState('');
  const [manualCarbs, setManualCarbs] = useState('');

  // Nutrix AI fields
  const [nutrixDescription, setNutrixDescription] = useState('');
  const [nutrixAnalyzing, setNutrixAnalyzing] = useState(false);
  const [nutrixResult, setNutrixResult] = useState<any>(null); // Using any temporarily for convenience, properly defined in gemini.ts but here for state
  const [userApiKey, setUserApiKey] = useState<string | null>(null);

  useEffect(() => {
    loadRecipes();
  }, [userId]);

  // If no recipes available, switch to manual entry after load
  useEffect(() => {
    if (!loading && recipes.length === 0) {
      setLogMode('manual');
    }
  }, [loading, recipes]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.recipe-search-container')) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDropdown]);

  // Filter recipes based on search query
  const filteredRecipes = useMemo(() => {
    if (!searchQuery.trim()) return recipes;

    const query = searchQuery.toLowerCase();
    return recipes.filter(recipe =>
      recipe.name.toLowerCase().includes(query)
    );
  }, [recipes, searchQuery]);

  // Food Search
  useEffect(() => {
    const delayTimer = setTimeout(() => {
      if (foodSearchQuery.trim().length >= 3) {
        handleFoodSearch();
      } else if (foodSearchQuery.trim().length === 0) {
        setFoodSearchResults([]);
      }
    }, 800);

    return () => clearTimeout(delayTimer);
  }, [foodSearchQuery]);

  const handleFoodSearch = async () => {
    if (!foodSearchQuery.trim()) {
      setFoodSearchResults([]);
      return;
    }

    setFoodSearching(true);
    setError('');

    try {
      const results = await searchIngredients(foodSearchQuery);
      setFoodSearchResults(results);
    } catch (err: any) {
      setError(err.message || 'Failed to search foods');
      setFoodSearchResults([]);
    } finally {
      setFoodSearching(false);
    }
  };

  const selectFood = async (ingredient: Ingredient) => {
    setAddingFoodId(ingredient.fdcId);
    try {
      // Fetch full details
      const full = await getIngredientById(ingredient.fdcId);
      const useIng = full || ingredient;
      setSelectedFood(useIng);
      setFoodSearchQuery('');
      setFoodSearchResults([]);

      // Default to 100g or serving size
      if (useIng.servingSize) {
        setMass('1'); // 1 serving
        setSelectedUnit('special');
      } else {
        setMass('100');
        setSelectedUnit('g');
      }
    } catch (e) {
      setSelectedFood(ingredient);
      setFoodSearchQuery('');
      setFoodSearchResults([]);
      setMass('100');
      setSelectedUnit('g');
    } finally {
      setAddingFoodId(null);
    }
  };

  const loadRecipes = async () => {
    try {
      const userRecipes = await getUserRecipes(userId);
      setRecipes(userRecipes);
    } catch (err: any) {
      setError('Failed to load recipes');
    } finally {
      setLoading(false);
    }
  };

  const loadUserProfile = async () => {
    try {
      const profile = await getUserProfile(userId);
      if (profile && profile.geminiApiKey) {
        setUserApiKey(profile.geminiApiKey);
      }
    } catch (err) {
      console.error('Failed to load user profile', err);
    }
  };

  useEffect(() => {
    loadUserProfile();
  }, [userId]);

  const handleNutrixAnalysis = async () => {
    if (!nutrixDescription.trim()) {
      setError('Please enter a description of what you ate.');
      return;
    }
    if (!userApiKey) {
      setError('Gemini API Key missing. Please add it in Settings.');
      return;
    }

    setNutrixAnalyzing(true);
    setError('');
    setNutrixResult(null);

    try {
      const result = await analyzeFoodDescription(nutrixDescription, userApiKey);
      setNutrixResult(result);
      // Pre-fill manual fields for review
      setManualName(result.food_item);
      setManualMass(result.mass_g.toString());
      setManualCalories(result.calories.toString());
      setManualProtein(result.protein_g.toString());
      setManualFats(result.fats_g.toString());
      setManualCarbs(result.carbs_g.toString());
    } catch (err: any) {
      setError(err.message || 'Failed to analyze food. Please try again.');
    } finally {
      setNutrixAnalyzing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (logMode === 'manual' || logMode === 'nutrix') {
      // Manual entry validation
      const mmass = parseFloat(manualMass);
      const mcal = parseFloat(manualCalories);
      const mpro = parseFloat(manualProtein);
      const mfat = parseFloat(manualFats);
      const mcarb = parseFloat(manualCarbs);

      if (!manualName.trim()) {
        setError('Please enter a meal name');
        return;
      }
      if (!isFinite(mmass) || mmass <= 0) {
        setError('Please enter a valid mass in grams');
        return;
      }
      if (![mcal, mpro, mfat, mcarb].every((n) => isFinite(n) && n >= 0)) {
        setError('Please enter valid macro values');
        return;
      }

      setSaving(true);
      setError('');
      try {
        await logCustomMeal(userId, manualName.trim(), mmass, {
          calories: mcal,
          protein: mpro,
          fats: mfat,
          carbohydrates: mcarb,
        });
        // reset
        setManualName('');
        setManualMass('');
        setManualCalories('');
        setManualProtein('');
        setManualFats('');
        setManualCarbs('');
        setLogMode('recipe');
        onSuccess();
      } catch (err: any) {
        setError(err.message || 'Failed to log meal');
      } finally {
        setSaving(false);
      }
      return;
    }

    if (logMode === 'food') {
      if (!selectedFood) {
        setError('Please select a food');
        return;
      }

      const inputMass = parseFloat(mass);
      if (isNaN(inputMass) || inputMass <= 0) {
        setError('Please enter a valid amount');
        return;
      }

      let massInGrams = inputMass;
      let multiplier = 1;

      if (selectedUnit === 'tbsp') {
        massInGrams = inputMass * 15;
      } else if (selectedUnit === 'special' && selectedFood.servingSize) {
        massInGrams = inputMass * selectedFood.servingSize;
      }

      // Calculate macros
      const ratio = massInGrams / 100;
      const cal = selectedFood.nutrients.calories * ratio;
      const pro = selectedFood.nutrients.protein * ratio;
      const fat = selectedFood.nutrients.fats * ratio;
      const carb = selectedFood.nutrients.carbohydrates * ratio;

      setSaving(true);
      setError('');

      try {
        await logCustomMeal(userId, selectedFood.description, massInGrams, {
          calories: cal,
          protein: pro,
          fats: fat,
          carbohydrates: carb,
        });
        setSelectedFood(null);
        setMass('');
        setLogMode('recipe');
        onSuccess();
      } catch (err: any) {
        setError(err.message || 'Failed to log food');
      } finally {
        setSaving(false);
      }
      return;
    }

    if (!selectedRecipe) {
      setError('Please select a recipe');
      return;
    }

    // Use full recipe mass or custom mass
    let massToLog = useFullRecipe ? selectedRecipe.totalMass : parseFloat(mass);

    // Convert from selected unit to grams if needed
    if (!useFullRecipe && selectedUnit !== 'g') {
      if (selectedUnit === 'tbsp') {
        massToLog = massToLog * 15; // 1 tbsp ≈ 15g
      } else if (selectedUnit === 'special' && selectedRecipe.ingredients && selectedRecipe.ingredients[0]?.ingredient.servingSize) {
        // Convert special unit to grams using the serving size
        massToLog = massToLog * selectedRecipe.ingredients[0].ingredient.servingSize;
      }
    }

    if (isNaN(massToLog) || massToLog <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await logMeal(
        userId,
        selectedRecipe.id,
        selectedRecipe.name,
        massToLog,
        selectedRecipe.nutrientsPer100g
      );
      setSelectedRecipe(null);
      setMass('');
      setSelectedUnit('g');
      setUseFullRecipe(true);
      setSearchQuery('');
      setShowDropdown(false);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to log meal');
    } finally {
      setSaving(false);
    }
  };

  const calculateNutrients = () => {
    if (!selectedRecipe) return null;

    let massToUse = useFullRecipe ? selectedRecipe.totalMass : (parseFloat(mass) || 0);

    // Convert from selected unit to grams if needed
    if (!useFullRecipe && selectedUnit !== 'g') {
      if (selectedUnit === 'tbsp') {
        massToUse = massToUse * 15; // 1 tbsp ≈ 15g
      } else if (selectedUnit === 'special' && selectedRecipe.ingredients && selectedRecipe.ingredients[0]?.ingredient.servingSize) {
        massToUse = massToUse * selectedRecipe.ingredients[0].ingredient.servingSize;
      }
    }

    const multiplier = massToUse / 100;

    return {
      calories: selectedRecipe.nutrientsPer100g.calories * multiplier,
      protein: selectedRecipe.nutrientsPer100g.protein * multiplier,
      fats: selectedRecipe.nutrientsPer100g.fats * multiplier,
      carbohydrates: selectedRecipe.nutrientsPer100g.carbohydrates * multiplier,
      mass: massToUse,
    };
  };

  const nutrients = calculateNutrients();

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  // Render

  return (
    <div className="bg-neutral-900 p-6 rounded-lg">
      <h2 className="text-2xl font-bold mb-6 text-neutral-50">Log a Meal</h2>

      {/* Mode Switcher */}
      <div className="flex gap-2 mb-6 bg-neutral-950 p-1 rounded-lg border border-neutral-800">
        <button
          type="button"
          onClick={() => { setLogMode('recipe'); setError(''); }}
          className={`flex-1 py-2 rounded-md text-[10px] font-medium transition ${logMode === 'recipe'
            ? 'bg-neutral-800 text-neutral-50 shadow-sm'
            : 'text-neutral-400 hover:text-neutral-200'
            }`}
        >
          My Recipes
        </button>
        <button
          type="button"
          onClick={() => { setLogMode('food'); setError(''); }}
          className={`flex-1 py-2 rounded-md text-[10px] font-medium transition ${logMode === 'food'
            ? 'bg-neutral-800 text-neutral-50 shadow-sm'
            : 'text-neutral-400 hover:text-neutral-200'
            }`}
        >
          Search Food
        </button>
        <button
          type="button"
          onClick={() => { setLogMode('manual'); setError(''); }}
          className={`flex-1 py-2 rounded-md text-[10px] font-medium transition ${logMode === 'manual'
            ? 'bg-neutral-800 text-neutral-50 shadow-sm'
            : 'text-neutral-400 hover:text-neutral-200'
            }`}
        >
          Manual
        </button>
        <button
          type="button"
          onClick={() => { setLogMode('nutrix'); setError(''); }}
          className={`flex-1 py-2 rounded-md text-[10px] font-medium transition flex items-center justify-center gap-1 ${logMode === 'nutrix'
            ? 'bg-neutral-800 text-neutral-50 shadow-sm'
            : 'text-neutral-400 hover:text-neutral-200'
            }`}
        >
          <Sparkles className="w-3 h-3" />
          Nutrix
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {logMode === 'recipe' && (
          <div className="recipe-search-container">
            <label className="block text-sm font-medium text-neutral-400 mb-2">Select Recipe</label>
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <input
                  type="text"
                  value={selectedRecipe ? selectedRecipe.name : searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowDropdown(true);
                    if (selectedRecipe) {
                      setSelectedRecipe(null);
                    }
                  }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="Search recipes..."
                  className="w-full pl-10 pr-10 py-2 bg-neutral-800 border border-neutral-800 rounded-lg text-neutral-50 focus:ring-2 focus:ring-neutral-600 focus:border-transparent"
                />
                {(searchQuery || selectedRecipe) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedRecipe(null);
                      setShowDropdown(false);
                      setMass('');
                      setSelectedUnit('g');
                    }}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 hover:text-neutral-50"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {showDropdown && !selectedRecipe && (
                <div className="absolute z-10 w-full mt-1 bg-neutral-800 border border-neutral-800 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredRecipes.length > 0 ? (
                    filteredRecipes.map((recipe) => (
                      <button
                        key={recipe.id}
                        type="button"
                        onClick={() => {
                          setSelectedRecipe(recipe);
                          setSearchQuery('');
                          setShowDropdown(false);
                          setUseFullRecipe(true);
                          setMass('');
                          setSelectedUnit('g');
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-neutral-600 transition border-b border-neutral-800 last:border-b-0"
                      >
                        <div className="font-medium text-neutral-50">{recipe.name}</div>
                        <div className="text-sm text-neutral-400">
                          {recipe.totalNutrients.calories.toFixed(0)} kcal • {recipe.totalMass}g • {recipe.totalNutrients.protein.toFixed(1)}g protein
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-neutral-400 text-center">
                      No recipes found
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Manual entry toggle removed from here as it is now in tabs */}

        {logMode === 'recipe' && selectedRecipe && (
          <>
            <div className="space-y-3">
              {/* Full Recipe Option */}
              <button
                type="button"
                onClick={() => setUseFullRecipe(true)}
                className={`w-full p-4 rounded-lg border-2 transition text-left ${useFullRecipe
                  ? 'border-neutral-600 bg-neutral-800/10'
                  : 'border-neutral-800 bg-neutral-800'
                  }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-neutral-50">Full Recipe</span>
                  <span className="text-sm text-neutral-400">{selectedRecipe.totalMass}g</span>
                </div>
                <div className="text-sm text-neutral-400">
                  {selectedRecipe.totalNutrients.calories.toFixed(0)} kcal • {selectedRecipe.totalNutrients.protein.toFixed(0)}g protein
                </div>
              </button>

              {/* Custom Amount Option */}
              <button
                type="button"
                onClick={() => setUseFullRecipe(false)}
                className={`w-full p-4 rounded-lg border-2 transition text-left ${!useFullRecipe
                  ? 'border-neutral-600 bg-neutral-800/10'
                  : 'border-neutral-800 bg-neutral-800'
                  }`}
              >
                <span className="font-semibold text-neutral-50">Custom Amount</span>
              </button>
            </div>

            {!useFullRecipe && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-2">
                    Amount & Unit
                  </label>
                  <div className="flex items-center gap-2">
                    {/* Number input box - bordered */}
                    <div className="inline-flex items-center border border-neutral-700 rounded-lg bg-neutral-950 px-3 py-1.5">
                      <input
                        type="number"
                        value={mass}
                        onChange={(e) => setMass(e.target.value)}
                        className="w-16 px-0 py-0 bg-transparent text-neutral-50 font-medium focus:outline-none text-sm text-center [&::-webkit-outer-spin-button]:[appearance:none] [&::-webkit-inner-spin-button]:[appearance:none] [-moz-appearance:textfield]"
                        placeholder="0"
                        min="0"
                        step="1"
                      />
                    </div>

                    {/* Unit selector - clickable text */}
                    <select
                      value={selectedUnit}
                      onChange={(e) => setSelectedUnit(e.target.value as 'g' | 'tbsp' | 'special')}
                      className="px-2 py-1 bg-transparent text-neutral-300 hover:text-neutral-50 font-medium focus:outline-none text-xs appearance-none cursor-pointer transition"
                    >
                      <option value="g">grams</option>
                      <option value="tbsp">tbsp</option>
                      {selectedRecipe?.ingredients?.[0]?.ingredient.servingSize &&
                        sanitizeServingUnit(selectedRecipe.ingredients[0].ingredient.servingUnit) && (
                          <option value="special">{abbreviateUnit(sanitizeServingUnit(selectedRecipe.ingredients[0].ingredient.servingUnit))}</option>
                        )}
                    </select>

                    {/* Grams display - only for special units */}
                    {selectedUnit === 'special' && (
                      <span className="text-neutral-500 text-xs whitespace-nowrap flex-shrink-0 -ml-1">
                        ({((parseFloat(mass) || 0) * (selectedRecipe?.ingredients?.[0]?.ingredient.servingSize || 1)).toFixed(0)}g)
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-400 mt-2">
                    {selectedUnit === 'g' && 'Precise weight measurement'}
                    {selectedUnit === 'tbsp' && '≈ 15g per tablespoon'}
                    {selectedUnit === 'special' && selectedRecipe?.ingredients?.[0]?.ingredient.servingSize &&
                      `1 ${sanitizeServingUnit(selectedRecipe.ingredients[0].ingredient.servingUnit) || 'unit'} = ${selectedRecipe.ingredients[0].ingredient.servingSize}g`}
                  </p>
                </div>
              </div>
            )}

            {nutrients && (
              <div className="bg-neutral-800 p-4 rounded-lg border border-neutral-800">
                <h3 className="text-sm font-semibold text-neutral-50 mb-3">
                  {useFullRecipe ? 'Full Recipe' : `${nutrients.mass}g`} Nutrition
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-neutral-400 text-xs">Calories</p>
                    <p className="text-neutral-50 text-lg font-bold">
                      {nutrients.calories.toFixed(0)} kcal
                    </p>
                  </div>
                  <div>
                    <p className="text-neutral-400 text-xs">Protein</p>
                    <p className="text-neutral-50 text-lg">{nutrients.protein.toFixed(1)}g</p>
                  </div>
                  <div>
                    <p className="text-neutral-400 text-xs">Fats</p>
                    <p className="text-neutral-50 text-lg">{nutrients.fats.toFixed(1)}g</p>
                  </div>
                  <div>
                    <p className="text-neutral-400 text-xs">Carbs</p>
                    <p className="text-neutral-50 text-lg">{nutrients.carbohydrates.toFixed(1)}g</p>
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-neutral-700 hover:bg-neutral-600 text-neutral-50 font-semibold py-2 px-4 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Plus className="w-5 h-5" />
              )}
              {saving ? 'Logging...' : 'Log Meal'}
            </button>
          </>
        )}

        {/* Food Search Mode */}
        {logMode === 'food' && (
          <div className="space-y-4">
            {!selectedFood ? (
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-2">Search USDA Database</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <input
                    type="text"
                    value={foodSearchQuery}
                    onChange={(e) => setFoodSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleFoodSearch();
                      }
                    }}
                    placeholder="Search for food (e.g. Apple, Chicken, Rice)..."
                    className="w-full pl-10 pr-4 py-3 bg-neutral-800 border border-neutral-800 rounded-lg text-neutral-50 focus:ring-2 focus:ring-neutral-600 focus:border-transparent"
                  />
                  {foodSearching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
                    </div>
                  )}
                </div>

                {foodSearchResults.length > 0 && (
                  <div className="mt-2 bg-neutral-800 border border-neutral-800 rounded-lg max-h-64 overflow-y-auto">
                    {foodSearchResults.map((food) => (
                      <button
                        key={food.fdcId}
                        type="button"
                        onClick={() => selectFood(food)}
                        className="w-full text-left px-4 py-3 hover:bg-neutral-600 active:bg-neutral-700 transition flex justify-between items-center border-b border-neutral-800 last:border-0"
                      >
                        <span className="text-neutral-50 text-sm">{food.description}</span>
                        {addingFoodId === food.fdcId ? (
                          <Loader2 className="w-5 h-5 text-neutral-400 animate-spin flex-shrink-0" />
                        ) : (
                          <Plus className="w-5 h-5 text-neutral-400 flex-shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {foodSearchQuery.length > 2 && !foodSearching && foodSearchResults.length === 0 && (
                  <div className="mt-4 text-center text-neutral-500 text-sm">
                    No results found
                  </div>
                )}
              </div>
            ) : (
              // Selected Food View
              <div className="space-y-4">
                <div className="flex items-start justify-between bg-neutral-800 p-4 rounded-lg">
                  <div>
                    <h3 className="font-bold text-neutral-50">{selectedFood.description}</h3>
                    <p className="text-sm text-neutral-400">
                      {selectedFood.nutrients.calories.toFixed(0)} kcal per 100g
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedFood(null)}
                    className="text-neutral-400 hover:text-neutral-200"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-2">
                    Amount & Unit
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="inline-flex items-center border border-neutral-700 rounded-lg bg-neutral-950 px-3 py-1.5">
                      <input
                        type="number"
                        value={mass}
                        onChange={(e) => setMass(e.target.value)}
                        className="w-16 px-0 py-0 bg-transparent text-neutral-50 font-medium focus:outline-none text-sm text-center [&::-webkit-outer-spin-button]:[appearance:none] [&::-webkit-inner-spin-button]:[appearance:none] [-moz-appearance:textfield]"
                        placeholder="0"
                        min="0"
                        step="0.1"
                      />
                    </div>

                    <select
                      value={selectedUnit}
                      onChange={(e) => setSelectedUnit(e.target.value as 'g' | 'tbsp' | 'special')}
                      className="px-2 py-1 bg-transparent text-neutral-300 hover:text-neutral-50 font-medium focus:outline-none text-xs appearance-none cursor-pointer transition"
                    >
                      <option value="g">grams</option>
                      <option value="tbsp">tbsp</option>
                      {selectedFood.servingSize && selectedFood.servingUnit && (
                        <option value="special">{abbreviateUnit(sanitizeServingUnit(selectedFood.servingUnit))}</option>
                      )}
                    </select>

                    {selectedUnit === 'special' && selectedFood.servingSize && (
                      <span className="text-neutral-500 text-xs whitespace-nowrap flex-shrink-0 -ml-1">
                        ({((parseFloat(mass) || 0) * selectedFood.servingSize).toFixed(0)}g)
                      </span>
                    )}
                  </div>
                  {selectedUnit === 'special' && selectedFood.servingSize && (
                    <p className="text-xs text-neutral-400 mt-2">
                      1 {sanitizeServingUnit(selectedFood.servingUnit) || 'serving'} = {selectedFood.servingSize}g
                    </p>
                  )}
                </div>

                {/* Nutrition Summary for this amount */}
                {(() => {
                  const inputMass = parseFloat(mass) || 0;
                  let realMass = inputMass;
                  if (selectedUnit === 'tbsp') realMass *= 15;
                  else if (selectedUnit === 'special' && selectedFood.servingSize) realMass *= selectedFood.servingSize;

                  const ratio = realMass / 100;
                  return (
                    <div className="bg-neutral-800 p-4 rounded-lg border border-neutral-800">
                      <h3 className="text-sm font-semibold text-neutral-50 mb-3">
                        {realMass.toFixed(0)}g Nutrition
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-neutral-400 text-xs">Calories</p>
                          <p className="text-neutral-50 text-lg font-bold">
                            {(selectedFood.nutrients.calories * ratio).toFixed(0)} kcal
                          </p>
                        </div>
                        <div>
                          <p className="text-neutral-400 text-xs">Protein</p>
                          <p className="text-neutral-50 text-lg">{(selectedFood.nutrients.protein * ratio).toFixed(1)}g</p>
                        </div>
                        <div>
                          <p className="text-neutral-400 text-xs">Fats</p>
                          <p className="text-neutral-50 text-lg">{(selectedFood.nutrients.fats * ratio).toFixed(1)}g</p>
                        </div>
                        <div>
                          <p className="text-neutral-400 text-xs">Carbs</p>
                          <p className="text-neutral-50 text-lg">{(selectedFood.nutrients.carbohydrates * ratio).toFixed(1)}g</p>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <button
                  type="submit"
                  disabled={saving || !mass || parseFloat(mass) <= 0}
                  className="w-full bg-neutral-700 hover:bg-neutral-600 text-neutral-50 font-semibold py-2 px-4 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Plus className="w-5 h-5" />
                  )}
                  {saving ? 'Logging...' : 'Log Food'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Manual entry form */}
        {logMode === 'manual' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-neutral-400">Manual Entry</label>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">Meal name</label>
              <input
                type="text"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                placeholder="e.g., Chicken salad"
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-800 rounded-lg text-neutral-50 focus:ring-2 focus:ring-neutral-600 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">Mass (g)</label>
              <input
                type="number"
                value={manualMass}
                onChange={(e) => setManualMass(e.target.value)}
                placeholder="0"
                min="0"
                className="w-32 px-3 py-2 bg-neutral-800 border border-neutral-800 rounded-lg text-neutral-50 focus:ring-2 focus:ring-neutral-600 focus:border-transparent"
              />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-neutral-400 mb-1">Calories</label>
                <input
                  type="number"
                  value={manualCalories}
                  onChange={(e) => setManualCalories(e.target.value)}
                  min="0"
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-800 rounded-lg text-neutral-50 focus:ring-2 focus:ring-neutral-600 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1">Protein (g)</label>
                <input
                  type="number"
                  value={manualProtein}
                  onChange={(e) => setManualProtein(e.target.value)}
                  min="0"
                  step="0.1"
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-800 rounded-lg text-neutral-50 focus:ring-2 focus:ring-neutral-600 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1">Fats (g)</label>
                <input
                  type="number"
                  value={manualFats}
                  onChange={(e) => setManualFats(e.target.value)}
                  min="0"
                  step="0.1"
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-800 rounded-lg text-neutral-50 focus:ring-2 focus:ring-neutral-600 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1">Carbs (g)</label>
                <input
                  type="number"
                  value={manualCarbs}
                  onChange={(e) => setManualCarbs(e.target.value)}
                  min="0"
                  step="0.1"
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-800 rounded-lg text-neutral-50 focus:ring-2 focus:ring-neutral-600 focus:border-transparent"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-neutral-700 hover:bg-neutral-600 text-neutral-50 font-semibold py-2 px-4 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Plus className="w-5 h-5" />
              )}
              {saving ? 'Logging...' : 'Log Meal'}
            </button>
          </div>
        )}

        {/* Nutrix AI Mode */}
        {
          logMode === 'nutrix' && (
            <div className="space-y-4">
              {!userApiKey ? (
                <div className="text-center p-6 border border-neutral-800 rounded-lg bg-neutral-900/50">
                  <Sparkles className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-neutral-300 mb-2">Setup Nutrix AI</h3>
                  <p className="text-sm text-neutral-400 mb-4">
                    To use AI meal logging, you need to add your Google Gemini API key in Settings.
                  </p>
                  <button
                    type="button"
                    onClick={onNavigateToSettings}
                    className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                  >
                    Go to Settings &rarr;
                  </button>
                </div>
              ) : (
                !nutrixResult ? (
                  // Input State
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-400 mb-2">
                        Describe your meal
                      </label>
                      <textarea
                        value={nutrixDescription}
                        onChange={(e) => setNutrixDescription(e.target.value)}
                        placeholder="e.g. A large slice of pepperoni pizza and a caesar salad..."
                        className="w-full h-32 px-4 py-3 bg-neutral-800 border border-neutral-800 rounded-lg text-neutral-50 focus:ring-2 focus:ring-neutral-600 focus:border-transparent resize-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleNutrixAnalysis}
                      disabled={nutrixAnalyzing || !nutrixDescription.trim()}
                      className="w-full bg-neutral-700 hover:bg-neutral-600 text-neutral-50 font-semibold py-3 px-4 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {nutrixAnalyzing ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5" />
                          Analyze with Nutrix
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  // Review State (Reuse manual form styling but pre-filled)
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-neutral-50 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-blue-400" />
                        Review & Log
                      </h3>
                      <button
                        type="button"
                        onClick={() => setNutrixResult(null)}
                        className="text-xs font-semibold text-red-500 hover:text-red-400 bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/20 transition"
                      >
                        Try again
                      </button>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-400 mb-1">Meal name</label>
                      <input
                        type="text"
                        value={manualName}
                        onChange={(e) => setManualName(e.target.value)}
                        className="w-full px-3 py-2 bg-neutral-800 border border-neutral-800 rounded-lg text-neutral-50 focus:ring-2 focus:ring-neutral-600 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-400 mb-1">Mass (g)</label>
                      <input
                        type="number"
                        value={manualMass}
                        onChange={(e) => setManualMass(e.target.value)}
                        className="w-32 px-3 py-2 bg-neutral-800 border border-neutral-800 rounded-lg text-neutral-50 focus:ring-2 focus:ring-neutral-600 focus:border-transparent"
                      />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs text-neutral-400 mb-1">Calories</label>
                        <input
                          type="number"
                          value={manualCalories}
                          onChange={(e) => setManualCalories(e.target.value)}
                          className="w-full px-3 py-2 bg-neutral-800 border border-neutral-800 rounded-lg text-neutral-50 focus:ring-2 focus:ring-neutral-600 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-neutral-400 mb-1">Protein (g)</label>
                        <input
                          type="number"
                          value={manualProtein}
                          onChange={(e) => setManualProtein(e.target.value)}
                          className="w-full px-3 py-2 bg-neutral-800 border border-neutral-800 rounded-lg text-neutral-50 focus:ring-2 focus:ring-neutral-600 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-neutral-400 mb-1">Fats (g)</label>
                        <input
                          type="number"
                          value={manualFats}
                          onChange={(e) => setManualFats(e.target.value)}
                          className="w-full px-3 py-2 bg-neutral-800 border border-neutral-800 rounded-lg text-neutral-50 focus:ring-2 focus:ring-neutral-600 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-neutral-400 mb-1">Carbs (g)</label>
                        <input
                          type="number"
                          value={manualCarbs}
                          onChange={(e) => setManualCarbs(e.target.value)}
                          className="w-full px-3 py-2 bg-neutral-800 border border-neutral-800 rounded-lg text-neutral-50 focus:ring-2 focus:ring-neutral-600 focus:border-transparent"
                        />
                      </div>
                    </div>



                    <button
                      type="submit"
                      disabled={saving}
                      className="w-full bg-neutral-700 hover:bg-neutral-600 text-neutral-50 font-semibold py-2 px-4 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {saving ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Plus className="w-5 h-5" />
                      )}
                      {saving ? 'Logging...' : 'Log Meal'}
                    </button>
                  </div>
                )
              )}
            </div>
          )
        }

      </form>
    </div>
  );
};
