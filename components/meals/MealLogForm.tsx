'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { getUserRecipes } from '@/lib/recipe-service';
import { logMeal } from '@/lib/meal-service';
import { Recipe } from '@/lib/types';
import { Plus, Loader2, Search, X } from 'lucide-react';
import { convertToGrams, gramsToTablespoons, shouldUseNaturalUnit, sanitizeServingUnit, abbreviateUnit } from '@/lib/unit-utils';

interface MealLogFormProps {
  userId: string;
  onSuccess: () => void;
}

export const MealLogForm: React.FC<MealLogFormProps> = ({ userId, onSuccess }) => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [mass, setMass] = useState('');
  const [selectedUnit, setSelectedUnit] = useState<'g' | 'tbsp' | 'special'>('g');
  const [useFullRecipe, setUseFullRecipe] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    loadRecipes();
  }, [userId]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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

  if (recipes.length === 0) {
    return (
      <div className="bg-neutral-900 p-6 rounded-lg text-center">
        <p className="text-neutral-400">No recipes found. Create a recipe first to log meals.</p>
      </div>
    );
  }

  return (
    <div className="bg-neutral-900 p-6 rounded-lg">
      <h2 className="text-2xl font-bold mb-6 text-neutral-50">Log a Meal</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded">
            {error}
          </div>
        )}
        
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
                        {recipe.totalNutrients.calories.toFixed(0)} kcal • {recipe.totalMass}g
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

        {selectedRecipe && (
          <>
            <div className="space-y-3">
              {/* Full Recipe Option */}
              <button
                type="button"
                onClick={() => setUseFullRecipe(true)}
                className={`w-full p-4 rounded-lg border-2 transition text-left ${
                  useFullRecipe
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
                className={`w-full p-4 rounded-lg border-2 transition text-left ${
                  !useFullRecipe
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
                  <div className="inline-flex items-center border border-neutral-800 rounded-lg bg-neutral-950 px-2 py-1.5 gap-1">
                    {/* Up/Down spinner buttons */}
                    <div className="flex flex-col gap-0.5">
                      <button
                        type="button"
                        onClick={() => setMass(String((parseFloat(mass) || 0) + 1))}
                        className="h-4 w-5 text-neutral-400 hover:text-neutral-200 text-xs flex items-center justify-center font-bold"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => setMass(String(Math.max(0, (parseFloat(mass) || 0) - 1)))}
                        className="h-4 w-5 text-neutral-400 hover:text-neutral-200 text-xs flex items-center justify-center font-bold"
                      >
                        ▼
                      </button>
                    </div>

                    {/* Number input */}
                    <input
                      type="number"
                      value={mass}
                      onChange={(e) => setMass(e.target.value)}
                      className="w-12 px-2 py-1 bg-transparent text-neutral-50 font-medium focus:outline-none text-sm text-center [&::-webkit-outer-spin-button]:[appearance:none] [&::-webkit-inner-spin-button]:[appearance:none] [-moz-appearance:textfield]"
                      placeholder="0"
                      min="0"
                      step="1"
                    />

                    {/* Unit picker dropdown - inline */}
                    <select
                      value={selectedUnit}
                      onChange={(e) => setSelectedUnit(e.target.value as 'g' | 'tbsp' | 'special')}
                      className="px-1.5 py-1 bg-transparent text-neutral-50 font-medium focus:outline-none text-xs appearance-none cursor-pointer"
                    >
                      <option value="g">g</option>
                      <option value="tbsp">tbsp</option>
                      {selectedRecipe?.ingredients?.[0]?.ingredient.servingSize && 
                       sanitizeServingUnit(selectedRecipe.ingredients[0].ingredient.servingUnit) && (
                        <option value="special">{abbreviateUnit(sanitizeServingUnit(selectedRecipe.ingredients[0].ingredient.servingUnit))}</option>
                      )}
                    </select>

                    {/* Grams display - only for special units */}
                    {selectedUnit === 'special' && (
                      <span className="text-neutral-400 text-xs whitespace-nowrap flex-shrink-0">
                        {((parseFloat(mass) || 0) * (selectedRecipe?.ingredients?.[0]?.ingredient.servingSize || 1)).toFixed(0)}g
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
              className="w-full bg-neutral-700 hover:bg-neutral-600 text-neutral-950 font-semibold py-2 px-4 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
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
      </form>
    </div>
  );
};
