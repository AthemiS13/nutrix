'use client';

import React, { useState, useEffect } from 'react';
import { searchIngredients, getIngredientById } from '@/lib/usda-api';
import { Ingredient, RecipeIngredient } from '@/lib/types';
import { Search, Plus, X, Loader2 } from 'lucide-react';
import { calculateNutrients, createRecipe, updateRecipe } from '@/lib/recipe-service';
import { getDisplayUnit, convertToDisplayUnit, convertToGrams } from '@/lib/unit-utils';

interface RecipeFormProps {
  userId: string;
  preferredUnit: 'grams' | 'tablespoons';
  recipeId?: string;
  initialName?: string;
  initialIngredients?: RecipeIngredient[];
  onSuccess: () => void;
  onCancel?: () => void;
}

export const RecipeForm: React.FC<RecipeFormProps> = ({
  userId,
  preferredUnit,
  recipeId,
  initialName = '',
  initialIngredients = [],
  onSuccess,
  onCancel,
}) => {
  const [recipeName, setRecipeName] = useState(initialName);
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>(initialIngredients);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Ingredient[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Auto-search as user types
  useEffect(() => {
    const delayTimer = setTimeout(() => {
      if (searchQuery.trim().length >= 3) {
        handleSearch();
      } else if (searchQuery.trim().length === 0) {
        setSearchResults([]);
      }
    }, 800); // Increased to 800ms to reduce API calls

    return () => clearTimeout(delayTimer);
  }, [searchQuery]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    
    setSearching(true);
    setError('');
    
    try {
      const results = await searchIngredients(searchQuery);
      setSearchResults(results);
    } catch (err: any) {
      setError(err.message || 'Failed to search ingredients');
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  const [addingIngredientId, setAddingIngredientId] = useState<number | null>(null);

  const addIngredient = async (ingredient: Ingredient) => {
    setAddingIngredientId(ingredient.fdcId);
    try {
      // Fetch full details only for the selected item
      const full = await getIngredientById(ingredient.fdcId);
      const useIng = full || ingredient;
      const newIngredient: RecipeIngredient = {
        ingredient: useIng,
        mass: useIng.servingSize || 100,
        quantity: useIng.servingSize ? 1 : undefined,
      };
      setIngredients([...ingredients, newIngredient]);
      setSearchQuery('');
      setSearchResults([]);
    } catch (e) {
      // Fallback to immediate add if details fail
      const newIngredient: RecipeIngredient = {
        ingredient,
        mass: ingredient.servingSize || 100,
        quantity: ingredient.servingSize ? 1 : undefined,
      };
      setIngredients([...ingredients, newIngredient]);
      setSearchQuery('');
      setSearchResults([]);
    } finally {
      setAddingIngredientId(null);
    }
  };

  const updateIngredientMass = (index: number, mass: number) => {
    const updated = [...ingredients];
    updated[index].mass = mass;
    // Update quantity if serving size is available
    if (updated[index].ingredient.servingSize) {
      updated[index].quantity = mass / updated[index].ingredient.servingSize;
    }
    setIngredients(updated);
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!recipeName.trim()) {
      setError('Please enter a recipe name');
      return;
    }
    
    if (ingredients.length === 0) {
      setError('Please add at least one ingredient');
      return;
    }
    
    setSaving(true);
    setError('');
    
    try {
      if (recipeId) {
        await updateRecipe(userId, recipeId, recipeName, ingredients);
      } else {
        await createRecipe(userId, recipeName, ingredients);
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to save recipe');
    } finally {
      setSaving(false);
    }
  };

  const { totalNutrients, totalMass, nutrientsPer100g } = calculateNutrients(ingredients);

  // Friendly serving unit display: prefer API servingUnit if meaningful,
  // otherwise fall back to a readable form of the ingredient description.
  const getFriendlyUnit = (ing: Ingredient) => {
    if (!ing) return '';
    const suRaw = (ing.servingUnit || '').toString().trim();
    const su = suRaw;
    // If servingUnit looks meaningful (contains letters and not generic codes), use it
    if (su && /[a-zA-Z]/.test(su) && !/\b(racc|serving|undetermined)\b/i.test(su) && !/^\d+$/.test(su)) {
      // Capitalize words
      return su
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    }

    // Fallback: take the first word from description and pluralize simply
    const desc = (ing.description || '').split(',')[0].trim();
    if (!desc) return su || '';
    // simple plural: if already ends with s leave it, otherwise add s
    const first = desc.split(' ')[0];
    if (!first) return desc;
    return first.endsWith('s') ? first : `${first}s`;
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
      <h2 className="text-xl font-bold mb-4 text-white">
        {recipeId ? 'Edit Recipe' : 'Create New Recipe'}
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-3 py-2 rounded-lg text-sm">
            {error}
          </div>
        )}
        
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">Recipe Name</label>
          <input
            type="text"
            value={recipeName}
            onChange={(e) => setRecipeName(e.target.value)}
            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none text-base"
            placeholder="My Delicious Recipe"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">Search Ingredients</label>
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none text-base"
              placeholder="Type to search (press Enter)..."
            />
            {searching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
              </div>
            )}
          </div>
          
          {searchResults.length > 0 && (
            <div className="mt-2 bg-zinc-800 border border-zinc-700 rounded-lg max-h-64 overflow-y-auto">
              {searchResults.map((ingredient) => (
                <button
                  key={ingredient.fdcId}
                  type="button"
                  onClick={() => addIngredient(ingredient)}
                  className="w-full text-left px-4 py-3 hover:bg-zinc-700 active:bg-zinc-600 transition flex justify-between items-center border-b border-zinc-700 last:border-0"
                >
                  <span className="text-white text-sm">{ingredient.description}</span>
                  {addingIngredientId === ingredient.fdcId ? (
                    <Loader2 className="w-5 h-5 text-blue-400 animate-spin flex-shrink-0" />
                  ) : (
                    <Plus className="w-5 h-5 text-blue-400 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {ingredients.length > 0 && (
          <div>
            <label className="block text-sm font-semibold text-zinc-300 mb-2">
              Ingredients ({ingredients.length})
            </label>
            <div className="space-y-2">
              {ingredients.map((item, index) => (
                <div key={index} className="bg-zinc-800 border border-zinc-700 p-3 rounded-lg">
                  <div className="flex items-start gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm truncate">{item.ingredient.description}</p>
                      <p className="text-zinc-500 text-xs">
                        {item.ingredient.nutrients.calories.toFixed(0)} kcal/100g
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeIngredient(index)}
                      className="text-red-400 hover:bg-zinc-700 active:bg-zinc-600 p-2 rounded-lg transition flex-shrink-0"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  
                  {/* Quantity input */}
                  <div className="flex items-center gap-2">
                    {item.ingredient.servingSize && item.ingredient.servingUnit ? (
                      <>
                        <input
                          type="number"
                          value={item.quantity || Math.round(item.mass / item.ingredient.servingSize)}
                          onChange={(e) => {
                            const qty = parseFloat(e.target.value) || 0;
                            updateIngredientMass(index, qty * (item.ingredient.servingSize || 100));
                          }}
                          className="w-20 px-3 py-2 bg-zinc-900 border border-zinc-600 rounded-lg text-white font-medium focus:border-blue-500 focus:outline-none text-base"
                          placeholder="1"
                          min="0"
                          step="0.5"
                        />
                        <span className="text-zinc-300 font-medium text-sm">{getFriendlyUnit(item.ingredient)}</span>
                        <span className="text-zinc-600 text-xs">({item.mass.toFixed(0)}g)</span>
                      </>
                    ) : (
                      <>
                        <input
                          type="number"
                          value={
                            preferredUnit === 'tablespoons' 
                              ? convertToDisplayUnit(item.mass, item.ingredient, preferredUnit).value
                              : item.mass
                          }
                          onChange={(e) => {
                            const inputValue = parseFloat(e.target.value) || 0;
                            const grams = preferredUnit === 'tablespoons'
                              ? convertToGrams(inputValue, item.ingredient, 'tbsp')
                              : inputValue;
                            updateIngredientMass(index, grams);
                          }}
                          className="w-24 px-3 py-2 bg-zinc-900 border border-zinc-600 rounded-lg text-white font-medium focus:border-blue-500 focus:outline-none text-base"
                          placeholder={preferredUnit === 'tablespoons' ? '1' : '100'}
                          min="0"
                          step={preferredUnit === 'tablespoons' ? '0.5' : '1'}
                        />
                        <span className="text-zinc-300 font-medium text-sm">
                          {preferredUnit === 'tablespoons' ? 'tbsp' : 'g'}
                        </span>
                        {preferredUnit === 'tablespoons' && (
                          <span className="text-zinc-600 text-xs">({item.mass.toFixed(0)}g)</span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {ingredients.length > 0 && (
          <div className="bg-zinc-800 border border-zinc-700 p-4 rounded-lg">
            <h3 className="text-base font-bold text-white mb-3">Nutrition Summary</h3>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-zinc-900 p-3 rounded-lg">
                <p className="text-zinc-500 text-xs font-medium mb-0.5">Total</p>
                <p className="text-white text-lg font-bold">{totalMass.toFixed(0)}<span className="text-sm text-zinc-500">g</span></p>
              </div>
              <div className="bg-zinc-900 p-3 rounded-lg">
                <p className="text-zinc-500 text-xs font-medium mb-0.5">Calories</p>
                <p className="text-white text-lg font-bold">{totalNutrients.calories.toFixed(0)}</p>
              </div>
              <div className="bg-zinc-900 p-3 rounded-lg">
                <p className="text-zinc-500 text-xs font-medium mb-0.5">Per 100g</p>
                <p className="text-white text-lg font-bold">{nutrientsPer100g.calories.toFixed(0)}</p>
              </div>
              <div className="bg-zinc-900 p-3 rounded-lg">
                <p className="text-zinc-500 text-xs font-medium mb-0.5">Protein</p>
                <p className="text-white text-base font-bold">{totalNutrients.protein.toFixed(1)}g</p>
              </div>
              <div className="bg-zinc-900 p-3 rounded-lg">
                <p className="text-zinc-500 text-xs font-medium mb-0.5">Fats</p>
                <p className="text-white text-base font-bold">{totalNutrients.fats.toFixed(1)}g</p>
              </div>
              <div className="bg-zinc-900 p-3 rounded-lg">
                <p className="text-zinc-500 text-xs font-medium mb-0.5">Carbs</p>
                <p className="text-white text-base font-bold">{totalNutrients.carbohydrates.toFixed(1)}g</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold py-3 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed text-base"
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Saving...
              </span>
            ) : (
              recipeId ? 'Update Recipe' : 'Create Recipe'
            )}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-white font-semibold rounded-lg transition text-base"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
};
