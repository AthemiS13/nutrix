'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { getUserRecipes } from '@/lib/recipe-service';
import { logMeal, logCustomMeal } from '@/lib/meal-service';
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
  const [useManualEntry, setUseManualEntry] = useState<boolean>(false);
  const [mass, setMass] = useState('');
  const [selectedUnit, setSelectedUnit] = useState<'g' | 'tbsp' | 'special'>('g');
  const [useFullRecipe, setUseFullRecipe] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  // Manual entry fields
  const [manualName, setManualName] = useState('');
  const [manualMass, setManualMass] = useState('');
  const [manualCalories, setManualCalories] = useState('');
  const [manualProtein, setManualProtein] = useState('');
  const [manualFats, setManualFats] = useState('');
  const [manualCarbs, setManualCarbs] = useState('');

  useEffect(() => {
    loadRecipes();
  }, [userId]);

  // If no recipes available, switch to manual entry after load
  useEffect(() => {
    if (!loading && recipes.length === 0) {
      setUseManualEntry(true);
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
    if (useManualEntry) {
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
        setUseManualEntry(false);
        onSuccess();
      } catch (err: any) {
        setError(err.message || 'Failed to log meal');
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
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded">
            {error}
          </div>
        )}
        
        {!useManualEntry && (
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

        {/* Manual entry toggle under search */}
        {!useManualEntry && (
          <button
            type="button"
            onClick={() => {
              setUseManualEntry(true);
              setShowDropdown(false);
              setSelectedRecipe(null);
            }}
            className="w-full p-3 rounded-lg border border-neutral-800 hover:bg-neutral-800/60 transition text-left"
          >
            <div className="font-medium text-neutral-50">+ Enter meal manually</div>
            <div className="text-sm text-neutral-400">Fill in calories, protein, fats and carbs</div>
          </button>
        )}

        {selectedRecipe && !useManualEntry && (
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

        {/* Manual entry form */}
        {useManualEntry && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-neutral-400">Manual Entry</label>
              <button
                type="button"
                onClick={() => setUseManualEntry(false)}
                className="text-xs text-neutral-400 hover:text-neutral-50"
              >
                Use recipe instead
              </button>
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
      </form>
    </div>
  );
};
