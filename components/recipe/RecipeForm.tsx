'use client';

import React, { useState, useEffect } from 'react';
import { searchIngredients, getIngredientById } from '@/lib/usda-api';
import { Ingredient, RecipeIngredient } from '@/lib/types';
import { Search, Plus, X, Loader2 } from 'lucide-react';
import { calculateNutrients, createRecipe, updateRecipe } from '@/lib/recipe-service';
import { getDisplayUnit, convertToDisplayUnit, convertToGrams, sanitizeServingUnit, abbreviateUnit } from '@/lib/unit-utils';

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
  const [ingredientUnits, setIngredientUnits] = useState<Record<number, 'g' | 'tbsp' | 'special'>>(
    initialIngredients.reduce((acc, _, idx) => ({ ...acc, [idx]: 'g' }), {})
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Ingredient[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  // Track in-progress text for each quantity input to avoid forcing '0' when empty
  const [inputValues, setInputValues] = useState<Record<number, string>>({});

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
      const newIndex = ingredients.length;
      setIngredients([...ingredients, newIngredient]);
      setIngredientUnits({ ...ingredientUnits, [newIndex]: 'g' });
      setSearchQuery('');
      setSearchResults([]);
    } catch (e) {
      // Fallback to immediate add if details fail
      const newIngredient: RecipeIngredient = {
        ingredient,
        mass: ingredient.servingSize || 100,
        quantity: ingredient.servingSize ? 1 : undefined,
      };
      const newIndex = ingredients.length;
      setIngredients([...ingredients, newIngredient]);
      setIngredientUnits({ ...ingredientUnits, [newIndex]: 'g' });
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
    const newUnits = { ...ingredientUnits };
    delete newUnits[index];
    setIngredientUnits(newUnits);
    const newInputs = { ...inputValues };
    delete newInputs[index];
    setInputValues(newInputs);
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
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
      <h2 className="text-xl font-bold mb-4 text-neutral-50">
        {recipeId ? 'Edit Recipe' : 'Create New Recipe'}
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-3 py-2 rounded-lg text-sm">
            {error}
          </div>
        )}
        
        <div>
          <label className="block text-sm font-medium text-neutral-400 mb-2">Recipe Name</label>
          <input
            type="text"
            value={recipeName}
            onChange={(e) => setRecipeName(e.target.value)}
            className="w-full px-4 py-3 bg-neutral-800 border border-neutral-800 rounded-lg text-neutral-50 placeholder-neutral-400 focus:border-neutral-600 focus:outline-none text-base"
            placeholder="My Delicious Recipe"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-400 mb-2">Search Ingredients</label>
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-4 py-3 bg-neutral-800 border border-neutral-800 rounded-lg text-neutral-50 placeholder-neutral-400 focus:border-neutral-600 focus:outline-none text-base"
              placeholder="Type to search (press Enter)..."
            />
            {searching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
              </div>
            )}
          </div>
          
          {searchResults.length > 0 && (
            <div className="mt-2 bg-neutral-800 border border-neutral-800 rounded-lg max-h-64 overflow-y-auto">
              {searchResults.map((ingredient) => (
                <button
                  key={ingredient.fdcId}
                  type="button"
                  onClick={() => addIngredient(ingredient)}
                  className="w-full text-left px-4 py-3 hover:bg-neutral-600 active:bg-neutral-700 transition flex justify-between items-center border-b border-neutral-800 last:border-0"
                >
                  <span className="text-neutral-50 text-sm">{ingredient.description}</span>
                  {addingIngredientId === ingredient.fdcId ? (
                    <Loader2 className="w-5 h-5 text-neutral-400 animate-spin flex-shrink-0" />
                  ) : (
                    <Plus className="w-5 h-5 text-neutral-400 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {ingredients.length > 0 && (
          <div>
            <label className="block text-sm font-semibold text-neutral-400 mb-2">
              Ingredients ({ingredients.length})
            </label>
            <div className="space-y-2">
              {ingredients.map((item, index) => {
                const cleanUnit = sanitizeServingUnit(item.ingredient.servingUnit);
                const hasSpecialUnit = item.ingredient.servingSize && cleanUnit;
                
                return (
                <div key={index} className="bg-neutral-800 border border-neutral-800 p-3 rounded-lg">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-neutral-50 font-medium text-sm truncate">{item.ingredient.description}</p>
                      <p className="text-neutral-400 text-xs">
                        {item.ingredient.nutrients.calories.toFixed(0)} kcal/100g
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeIngredient(index)}
                      className="text-red-400 hover:text-red-300 p-1 flex-shrink-0 transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {/* Quantity input - compact layout */}
                  {/* Combined quantity and unit selector */}
                  <div className="flex items-center gap-2">
                    {/* Number input box - bordered */}
                    <div className="inline-flex items-center border border-neutral-700 rounded-lg bg-neutral-950 px-3 py-1.5">
                      <input
                        type="number"
                        value={
                          Object.prototype.hasOwnProperty.call(inputValues, index)
                            ? inputValues[index]
                            : (
                                ingredientUnits[index] === 'special' && item.ingredient.servingSize
                                  ? String(Math.round((item.mass / item.ingredient.servingSize) * 10) / 10)
                                  : ingredientUnits[index] === 'tbsp'
                                  ? String(Math.round((item.mass / 15) * 10) / 10)
                                  : String(item.mass)
                              )
                        }
                        onChange={(e) => {
                          const raw = e.target.value;
                          setInputValues({ ...inputValues, [index]: raw });

                          // Allow empty or partial numeric input without forcing 0
                          if (raw.trim() === '' || raw === '-' || raw === '.' || raw === '-.') {
                            return;
                          }

                          const inputValue = Number(raw);
                          if (Number.isNaN(inputValue)) {
                            return;
                          }

                          let grams = inputValue;
                          if (ingredientUnits[index] === 'special' && item.ingredient.servingSize) {
                            grams = inputValue * item.ingredient.servingSize;
                          } else if (ingredientUnits[index] === 'tbsp') {
                            grams = inputValue * 15;
                          }

                          updateIngredientMass(index, grams);
                        }}
                        onBlur={() => {
                          // On blur, if empty/invalid, reset to the computed value
                          const raw = inputValues[index];
                          const invalid = raw === undefined || raw.trim() === '' || raw === '-' || raw === '.' || raw === '-.' || Number.isNaN(Number(raw));
                          if (invalid) {
                            const display = (
                              ingredientUnits[index] === 'special' && item.ingredient.servingSize
                                ? String(Math.round((item.mass / item.ingredient.servingSize) * 10) / 10)
                                : ingredientUnits[index] === 'tbsp'
                                ? String(Math.round((item.mass / 15) * 10) / 10)
                                : String(item.mass)
                            );
                            const newInputs = { ...inputValues };
                            newInputs[index] = display;
                            setInputValues(newInputs);
                          }
                        }}
                        className="w-16 px-0 py-0 bg-transparent text-neutral-50 font-medium focus:outline-none text-sm text-center [&::-webkit-outer-spin-button]:[appearance:none] [&::-webkit-inner-spin-button]:[appearance:none] [-moz-appearance:textfield]"
                        placeholder="0"
                        min="0"
                        step="1"
                      />
                    </div>

                    {/* Unit selector - clickable text */}
                    <select
                      value={ingredientUnits[index]}
                      onChange={(e) => {
                        const nextUnit = e.target.value as 'g' | 'tbsp' | 'special';
                        setIngredientUnits({ ...ingredientUnits, [index]: nextUnit });
                        // Reset the input text to the computed value for the new unit
                        const display = (
                          nextUnit === 'special' && item.ingredient.servingSize
                            ? String(Math.round((item.mass / item.ingredient.servingSize) * 10) / 10)
                            : nextUnit === 'tbsp'
                            ? String(Math.round((item.mass / 15) * 10) / 10)
                            : String(item.mass)
                        );
                        setInputValues({ ...inputValues, [index]: display });
                      }}
                      className="px-2 py-1 bg-transparent text-neutral-300 hover:text-neutral-50 font-medium focus:outline-none text-xs appearance-none cursor-pointer transition"
                    >
                      <option value="g">grams</option>
                      <option value="tbsp">tbsp</option>
                      {hasSpecialUnit && <option value="special">{abbreviateUnit(cleanUnit)}</option>}
                    </select>

                    {/* Grams display - only for special units */}
                    {ingredientUnits[index] === 'special' && (
                      <span className="text-neutral-500 text-xs whitespace-nowrap flex-shrink-0 -ml-1">
                        ({item.mass.toFixed(0)}g)
                      </span>
                    )}
                  </div>
                </div>
              );
              })}
            </div>
          </div>
        )}

        {ingredients.length > 0 && (
          <div className="bg-neutral-800 border border-neutral-800 p-4 rounded-lg">
            <h3 className="text-base font-bold text-neutral-50 mb-3">Nutrition Summary</h3>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-neutral-950 border border-neutral-700 p-3 rounded-lg">
                <p className="text-neutral-400 text-xs font-medium mb-0.5">Total</p>
                <p className="text-neutral-50 text-lg font-bold">{totalMass.toFixed(0)}<span className="text-sm text-neutral-400">g</span></p>
              </div>
              <div className="bg-neutral-950 border border-neutral-700 p-3 rounded-lg">
                <p className="text-neutral-400 text-xs font-medium mb-0.5">Calories</p>
                <p className="text-neutral-50 text-lg font-bold">{totalNutrients.calories.toFixed(0)}</p>
              </div>
              <div className="bg-neutral-950 border border-neutral-700 p-3 rounded-lg">
                <p className="text-neutral-400 text-xs font-medium mb-0.5">Per 100g</p>
                <p className="text-neutral-50 text-lg font-bold">{nutrientsPer100g.calories.toFixed(0)}</p>
              </div>
              <div className="bg-neutral-950 border border-neutral-700 p-3 rounded-lg">
                <p className="text-neutral-400 text-xs font-medium mb-0.5">Protein</p>
                <p className="text-neutral-50 text-base font-bold">{totalNutrients.protein.toFixed(1)}g</p>
              </div>
              <div className="bg-neutral-950 border border-neutral-700 p-3 rounded-lg">
                <p className="text-neutral-400 text-xs font-medium mb-0.5">Fats</p>
                <p className="text-neutral-50 text-base font-bold">{totalNutrients.fats.toFixed(1)}g</p>
              </div>
              <div className="bg-neutral-950 border border-neutral-700 p-3 rounded-lg">
                <p className="text-neutral-400 text-xs font-medium mb-0.5">Carbs</p>
                <p className="text-neutral-50 text-base font-bold">{totalNutrients.carbohydrates.toFixed(1)}g</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-neutral-700 hover:bg-neutral-600 active:bg-neutral-700 text-neutral-50 font-bold py-3 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed text-base"
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
              className="px-6 py-3 bg-neutral-800 hover:bg-neutral-600 active:bg-neutral-700 text-neutral-50 font-semibold rounded-lg transition text-base"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
};
