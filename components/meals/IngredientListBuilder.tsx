'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Plus, X, ChefHat, Minus } from 'lucide-react';

export interface IngredientEntry {
  id: string;
  name: string;
  grams: number;
}

interface IngredientListBuilderProps {
  onChange: (ingredients: IngredientEntry[]) => void;
  disabled?: boolean;
}

let nextId = 1;
const makeId = () => `ing-${nextId++}-${Date.now()}`;

// Quick gram presets for fast selection
const GRAM_PRESETS = [25, 50, 100, 150, 200, 250, 300];

export const IngredientListBuilder: React.FC<IngredientListBuilderProps> = ({
  onChange,
  disabled = false,
}) => {
  const [ingredients, setIngredients] = useState<IngredientEntry[]>([
    { id: makeId(), name: '', grams: 100 },
  ]);
  const listEndRef = useRef<HTMLDivElement>(null);
  const [justAdded, setJustAdded] = useState(false);

  // Which ingredient is showing the preset picker (by id)
  const [showPresetsFor, setShowPresetsFor] = useState<string | null>(null);

  // Hold-to-repeat refs
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdStartRef = useRef<number>(0);

  // Notify parent whenever ingredients change
  useEffect(() => {
    onChange(ingredients);
  }, [ingredients, onChange]);

  // Scroll to bottom when a new ingredient is added
  useEffect(() => {
    if (justAdded && listEndRef.current) {
      listEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      setJustAdded(false);
    }
  }, [justAdded]);

  // Cleanup hold timers on unmount
  useEffect(() => {
    return () => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
    };
  }, []);

  const updateIngredient = useCallback(
    (id: string, field: 'name' | 'grams', value: string | number) => {
      setIngredients((prev) =>
        prev.map((ing) =>
          ing.id === id ? { ...ing, [field]: value } : ing
        )
      );
    },
    []
  );

  const stepGrams = useCallback(
    (id: string, delta: number) => {
      setIngredients((prev) =>
        prev.map((ing) => {
          if (ing.id !== id) return ing;
          const newVal = Math.max(0, ing.grams + delta);
          return { ...ing, grams: newVal };
        })
      );
    },
    []
  );

  // Hold-to-repeat: starts slow (5g steps), accelerates to 10g, then 25g
  const startHold = useCallback(
    (id: string, direction: 1 | -1) => {
      holdStartRef.current = Date.now();
      // Initial step
      stepGrams(id, 5 * direction);

      // After 400ms, start auto-repeat
      holdTimerRef.current = setTimeout(() => {
        holdIntervalRef.current = setInterval(() => {
          const elapsed = Date.now() - holdStartRef.current;
          let step: number;
          if (elapsed > 2000) {
            step = 25; // fast after 2s
          } else if (elapsed > 1000) {
            step = 10; // medium after 1s
          } else {
            step = 5;  // normal
          }
          stepGrams(id, step * direction);
        }, 80);
      }, 400);
    },
    [stepGrams]
  );

  const stopHold = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
  }, []);

  const addIngredient = useCallback(() => {
    setIngredients((prev) => [...prev, { id: makeId(), name: '', grams: 100 }]);
    setJustAdded(true);
    setShowPresetsFor(null);
  }, []);

  const removeIngredient = useCallback(
    (id: string) => {
      setIngredients((prev) => {
        if (prev.length <= 1) return prev;
        return prev.filter((ing) => ing.id !== id);
      });
      setShowPresetsFor(null);
    },
    []
  );

  const totalGrams = ingredients.reduce((sum, ing) => sum + ing.grams, 0);
  const filledCount = ingredients.filter((ing) => ing.name.trim()).length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-1">
        <label className="text-sm font-medium text-neutral-400 flex items-center gap-2">
          <ChefHat className="w-4 h-4" />
          Ingredients
        </label>
        {filledCount > 0 && (
          <span className="text-xs text-neutral-500">
            {filledCount} ingredient{filledCount !== 1 ? 's' : ''} · {totalGrams}g
          </span>
        )}
      </div>

      {/* Ingredient rows */}
      <div className="space-y-2">
        {ingredients.map((ing, index) => (
          <div
            key={ing.id}
            className="bg-neutral-800/50 rounded-xl border border-neutral-800 transition-all duration-200 overflow-hidden"
            style={{
              animation: index === ingredients.length - 1 && justAdded
                ? 'slideIn 0.2s ease-out'
                : undefined,
            }}
          >
            {/* Main row */}
            <div className="flex items-center gap-2 px-3 py-2.5">
              {/* Ingredient name input */}
              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  value={ing.name}
                  onChange={(e) => updateIngredient(ing.id, 'name', e.target.value)}
                  placeholder={index === 0 ? 'e.g. Quark' : 'e.g. Chia seeds'}
                  disabled={disabled}
                  className="w-full bg-transparent text-neutral-50 text-sm font-medium placeholder:text-neutral-600 focus:outline-none"
                  autoFocus={index === ingredients.length - 1 && ingredients.length > 1}
                />
              </div>

              {/* Stepper: minus / value / plus */}
              <div className="flex items-center flex-shrink-0 bg-neutral-900 rounded-lg overflow-hidden border border-neutral-700">
                {/* Minus button */}
                <button
                  type="button"
                  onPointerDown={(e) => {
                    // Only left clicks or primary touch
                    if (e.button !== 0 && e.pointerType === 'mouse') return;
                    e.currentTarget.setPointerCapture(e.pointerId);
                    startHold(ing.id, -1);
                  }}
                  onPointerUp={(e) => {
                    e.currentTarget.releasePointerCapture(e.pointerId);
                    stopHold();
                  }}
                  onPointerCancel={stopHold}
                  disabled={disabled || ing.grams <= 0}
                  className="w-9 h-9 flex items-center justify-center text-neutral-400 hover:text-neutral-50 hover:bg-neutral-700 transition active:bg-neutral-600 disabled:opacity-20 disabled:cursor-default select-none touch-none"
                  aria-label="Decrease"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>

                {/* Editable gram value */}
                <div className="relative">
                  <input
                    type="number"
                    value={ing.grams}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      updateIngredient(ing.id, 'grams', isNaN(val) ? 0 : Math.max(0, val));
                    }}
                    onFocus={() => setShowPresetsFor(ing.id)}
                    onBlur={() => {
                      setTimeout(() => setShowPresetsFor((prev) => prev === ing.id ? null : prev), 200);
                    }}
                    disabled={disabled}
                    min={0}
                    className="w-[3.5rem] h-9 bg-transparent text-neutral-50 text-sm font-semibold text-center focus:outline-none transition [&::-webkit-outer-spin-button]:[appearance:none] [&::-webkit-inner-spin-button]:[appearance:none] [-moz-appearance:textfield]"
                  />
                  <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-neutral-600 text-[10px] font-medium pointer-events-none">
                    g
                  </span>
                </div>

                {/* Plus button */}
                <button
                  type="button"
                  onPointerDown={(e) => {
                    if (e.button !== 0 && e.pointerType === 'mouse') return;
                    e.currentTarget.setPointerCapture(e.pointerId);
                    startHold(ing.id, 1);
                  }}
                  onPointerUp={(e) => {
                    e.currentTarget.releasePointerCapture(e.pointerId);
                    stopHold();
                  }}
                  onPointerCancel={stopHold}
                  disabled={disabled}
                  className="w-9 h-9 flex items-center justify-center text-neutral-400 hover:text-neutral-50 hover:bg-neutral-700 transition active:bg-neutral-600 disabled:opacity-20 select-none touch-none"
                  aria-label="Increase"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Remove button */}
              {ingredients.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeIngredient(ing.id)}
                  disabled={disabled}
                  className="p-1 text-neutral-600 hover:text-red-400 transition rounded-md flex-shrink-0"
                  aria-label="Remove ingredient"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick gram presets — shown when the gram input is focused */}
            {showPresetsFor === ing.id && (
              <div className="flex gap-1.5 px-3 pb-2.5 pt-0 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                {GRAM_PRESETS.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      updateIngredient(ing.id, 'grams', g);
                      setShowPresetsFor(null);
                    }}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition flex-shrink-0 ${
                      ing.grams === g
                        ? 'bg-neutral-600 text-neutral-50'
                        : 'bg-neutral-900 text-neutral-500 hover:bg-neutral-700 hover:text-neutral-300'
                    }`}
                  >
                    {g}g
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Scroll anchor */}
      <div ref={listEndRef} />

      {/* Add ingredient button */}
      <button
        type="button"
        onClick={addIngredient}
        disabled={disabled}
        className="w-full py-2.5 rounded-xl bg-neutral-800/50 hover:bg-neutral-800 text-neutral-500 hover:text-neutral-300 transition-all duration-200 flex items-center justify-center gap-2 text-sm font-medium active:scale-[0.98]"
      >
        <Plus className="w-4 h-4" />
        Add Ingredient
      </button>

      {/* Animation keyframes */}
      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};
