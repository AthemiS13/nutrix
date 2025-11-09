import { Ingredient } from './types';

// List of ingredients that should use natural/countable units
const COUNTABLE_ITEMS = [
  'egg', 'eggs',
  'piece', 'pieces',
  'slice', 'slices',
  'whole', 'entire',
  'unit', 'units',
  'item', 'items',
];

// Approximate conversion: 1 tablespoon ≈ 15 grams (varies by ingredient density)
const GRAMS_PER_TABLESPOON = 15;

/**
 * Determines if an ingredient should use its natural unit (like "egg" instead of grams)
 */
export function shouldUseNaturalUnit(ingredient: Ingredient): boolean {
  if (!ingredient.servingUnit) return false;
  
  const unit = ingredient.servingUnit.toLowerCase();
  return COUNTABLE_ITEMS.some(item => unit.includes(item));
}

/**
 * Converts grams to tablespoons (approximate)
 */
export function gramsToTablespoons(grams: number): number {
  return Number((grams / GRAMS_PER_TABLESPOON).toFixed(1));
}

/**
 * Converts tablespoons to grams (approximate)
 */
export function tablespoonsToGrams(tablespoons: number): number {
  return Number((tablespoons * GRAMS_PER_TABLESPOON).toFixed(1));
}

/**
 * Gets the display unit for an ingredient based on user preference
 */
export function getDisplayUnit(
  ingredient: Ingredient,
  preferredUnit: 'grams' | 'tablespoons'
): string {
  // Always use natural unit if available for countable items
  if (shouldUseNaturalUnit(ingredient) && ingredient.servingUnit) {
    return ingredient.servingUnit;
  }
  
  // Otherwise use user's preferred unit
  return preferredUnit === 'tablespoons' ? 'tbsp' : 'g';
}

/**
 * Converts a value to the display unit
 */
export function convertToDisplayUnit(
  grams: number,
  ingredient: Ingredient,
  preferredUnit: 'grams' | 'tablespoons'
): { value: number; unit: string } {
  // Use natural unit if available
  if (shouldUseNaturalUnit(ingredient) && ingredient.servingSize && ingredient.servingUnit) {
    const quantity = Number((grams / ingredient.servingSize).toFixed(1));
    return { value: quantity, unit: ingredient.servingUnit };
  }
  
  // Convert to preferred unit
  if (preferredUnit === 'tablespoons') {
    return { value: gramsToTablespoons(grams), unit: 'tbsp' };
  }
  
  return { value: grams, unit: 'g' };
}

/**
 * Converts from display unit back to grams
 */
export function convertToGrams(
  value: number,
  ingredient: Ingredient,
  currentUnit: string
): number {
  // If it's a natural unit, use serving size
  if (shouldUseNaturalUnit(ingredient) && ingredient.servingSize) {
    return value * ingredient.servingSize;
  }
  
  // If it's tablespoons, convert
  if (currentUnit === 'tbsp' || currentUnit === 'tablespoons') {
    return tablespoonsToGrams(value);
  }
  
  // Already in grams
  return value;
}

/**
 * Format ingredient amount for display
 */
export function formatIngredientAmount(
  grams: number,
  ingredient: Ingredient,
  preferredUnit: 'grams' | 'tablespoons'
): string {
  const { value, unit } = convertToDisplayUnit(grams, ingredient, preferredUnit);
  return `${value} ${unit}`;
}

/**
 * Get abbreviated version of unit name for compact display
 */
export function abbreviateUnit(unit: string | null | undefined): string | null {
  if (!unit) return null;
  
  const lower = unit.toLowerCase().trim();
  
  // Common abbreviations
  const abbreviations: Record<string, string> = {
    'egg': 'egg',
    'slice': 'sl',
    'piece': 'pc',
    'unit': 'un',
    'item': 'it',
    'cup': 'cup',
    'ounce': 'oz',
    'pound': 'lb',
    'cheese': 'ch',
    'milk': 'ml',
    'butter': 'bt',
  };
  
  // Check for exact match first
  if (abbreviations[lower]) {
    return abbreviations[lower];
  }
  
  // Check if it starts with a known term
  for (const [key, abbr] of Object.entries(abbreviations)) {
    if (lower.startsWith(key)) {
      return abbr;
    }
  }
  
  // For long names, take first 3 chars + ellipsis
  if (unit.length > 5) {
    return unit.slice(0, 3) + '.';
  }
  
  return unit;
}
export function sanitizeServingUnit(unit: string | undefined): string | null {
  if (!unit) return null;
  
  const cleaned = unit.trim().toLowerCase();
  
  // Filter out only truly meaningless terms, keep countable items like "egg"
  if (/^(undetermined|unknown|misc|serving|sample|other)(\s|$)/i.test(cleaned)) {
    return null;
  }
  
  // Remove technical codes (e.g., "cheese undetermined 2423" -> "cheese")
  const withoutCodes = cleaned
    .replace(/\s+\d+$/g, '') // Remove trailing numbers
    .replace(/\bundetermined\b/gi, '') // Remove "undetermined"
    .trim();
  
  if (!withoutCodes || withoutCodes.length === 0) {
    return null;
  }
  
  // Singularize common units (eggs -> egg, slices -> slice)
  let singular = withoutCodes;
  if (singular.endsWith('es')) {
    singular = singular.slice(0, -2); // "eggs" -> "egg"
  } else if (singular.endsWith('s')) {
    // Check if it's a countable item that should be singularized
    const withoutS = singular.slice(0, -1);
    if (['egg', 'slice', 'piece', 'item'].includes(withoutS)) {
      singular = withoutS;
    }
  }
  
  // Capitalize first letter
  return singular.charAt(0).toUpperCase() + singular.slice(1);
}