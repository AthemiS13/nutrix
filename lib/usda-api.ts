import { Ingredient } from './types';
import { shouldUseNaturalUnit } from './unit-utils';

const USDA_API_KEY = process.env.NEXT_PUBLIC_USDA_API_KEY;
const USDA_BASE_URL = 'https://api.nal.usda.gov/fdc/v1';

interface USDASearchResult {
  fdcId: number;
  description: string;
  servingSize?: number;
  servingSizeUnit?: string;
  foodPortions?: Array<{
    amount: number;
    gramWeight: number;
    modifier: string;
  }>;
  foodNutrients: Array<{
    nutrientId: number;
    nutrientName: string;
    nutrientNumber: string;
    unitName: string;
    value: number;
  }>;
}

interface USDASearchResponse {
  foods: USDASearchResult[];
  totalHits: number;
}

// Nutrient IDs from USDA API
const NUTRIENT_IDS = {
  ENERGY: 1008, // Energy (kcal)
  PROTEIN: 1003, // Protein
  FAT: 1004, // Total lipid (fat)
  CARBS: 1005, // Carbohydrate
};

// In-memory cache for frequently used ingredients
const ingredientCache = new Map<number, Ingredient>();

export const searchIngredients = async (query: string): Promise<Ingredient[]> => {
  if (!USDA_API_KEY) {
    throw new Error('USDA API key is not configured');
  }

  if (!query.trim()) {
    return [];
  }

  try {
    // Search for foods - this is fast
    const fetchWithRetry = async (retries = 5, delay = 2000): Promise<Response> => {
      try {
        const res = await fetch(
          `${USDA_BASE_URL}/foods/search?api_key=${USDA_API_KEY}&query=${encodeURIComponent(
            query.trim() + '*'
          )}&dataType=Foundation,SR Legacy,Survey (FNDDS)&pageSize=15`,
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
        if (!res.ok && res.status !== 429 && retries > 0) {
          console.warn(`USDA API failed with status ${res.status}. Retrying in ${delay}ms... (${retries} attempts left)`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return fetchWithRetry(retries - 1, delay * 2);
        }
        return res;
      } catch (err) {
        if (retries > 0) {
          console.warn(`USDA API network error: ${err}. Retrying in ${delay}ms... (${retries} attempts left)`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return fetchWithRetry(retries - 1, delay * 2);
        }
        throw err;
      }
    };

    const response = await fetchWithRetry();

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('API rate limit exceeded. Please wait a moment and try again.');
      }
      throw new Error('Failed to fetch ingredients from USDA API');
    }

    const data: USDASearchResponse = await response.json();

    // Fast map results (no per-item detail fetch here)
    const ingredients: Ingredient[] = data.foods.map((food) => {
      const nutrients = {
        calories: 0,
        protein: 0,
        fats: 0,
        carbohydrates: 0,
      };

      const foodNutrients = food.foodNutrients || [];
      foodNutrients.forEach((nutrient: any) => {
        const valuePer100g = nutrient.value;

        switch (nutrient.nutrientId) {
          case NUTRIENT_IDS.ENERGY:
            nutrients.calories = valuePer100g;
            break;
          case NUTRIENT_IDS.PROTEIN:
            nutrients.protein = valuePer100g;
            break;
          case NUTRIENT_IDS.FAT:
            nutrients.fats = valuePer100g;
            break;
          case NUTRIENT_IDS.CARBS:
            nutrients.carbohydrates = valuePer100g;
            break;
        }
      });

      const ingredient: Ingredient = {
        fdcId: food.fdcId,
        description: food.description,
        nutrients,
      };
      // We cannot derive serving info from search results reliably; leave it empty here.
      // Mark natural unit only if servingUnit was somehow provided (rare in search results).
      ingredient.hasNaturalUnit = shouldUseNaturalUnit(ingredient);
      ingredientCache.set(food.fdcId, ingredient);
      return ingredient;
    });

    return ingredients;
  } catch (error) {
    console.error('Error searching ingredients:', error);
    throw error;
  }
};

export const getIngredientById = async (fdcId: number): Promise<Ingredient | null> => {
  if (!USDA_API_KEY) {
    throw new Error('USDA API key is not configured');
  }

  try {
    const response = await fetch(
      `${USDA_BASE_URL}/food/${fdcId}?api_key=${USDA_API_KEY}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error('Failed to fetch ingredient details');
    }

    const data: USDASearchResult = await response.json();

    const nutrients = {
      calories: 0,
      protein: 0,
      fats: 0,
      carbohydrates: 0,
    };

    // Handle both search and detail shapes (detail uses nested nutrient object and "amount")
    (data.foodNutrients || []).forEach((fn: any) => {
      const id: number | undefined = fn.nutrientId ?? fn.nutrient?.id;
      const numberCode: string | undefined = fn.nutrientNumber ?? fn.nutrient?.number;
      const valuePer100g: number = (fn.value ?? fn.amount) as number;

      const pick = (nutrientId?: number, numberStr?: string) =>
        nutrientId === NUTRIENT_IDS.ENERGY || numberStr === '208' ? 'calories'
          : nutrientId === NUTRIENT_IDS.PROTEIN || numberStr === '203' ? 'protein'
            : nutrientId === NUTRIENT_IDS.FAT || numberStr === '204' ? 'fats'
              : nutrientId === NUTRIENT_IDS.CARBS || numberStr === '205' ? 'carbohydrates'
                : undefined;

      const key = pick(id, numberCode);
      if (key && typeof valuePer100g === 'number') {
        (nutrients as any)[key] = valuePer100g;
      }
    });

    const ingredient: Ingredient = {
      fdcId: data.fdcId,
      description: data.description,
      nutrients,
    };

    // Extract detailed serving size information
    if (data.servingSize && data.servingSizeUnit) {
      ingredient.servingSize = data.servingSize;
      ingredient.servingUnit = data.servingSizeUnit;
    } else if (data.foodPortions && data.foodPortions.length > 0) {
      // Prefer portions that represent natural/countable units with amount 1
      const portions = data.foodPortions as any[];
      const naturalNames = ['egg', 'piece', 'slice', 'unit'];
      let bestPortion = portions.find(p => p.gramWeight && p.amount === 1 && p.measureUnit?.name && naturalNames.includes(String(p.measureUnit.name).toLowerCase()))
        || portions.find(p => p.gramWeight && p.amount === 1 && p.measureUnit?.name)
        || portions.find(p => p.gramWeight)
        || portions[0];

      if (bestPortion && bestPortion.gramWeight) {
        ingredient.servingSize = bestPortion.gramWeight;
        const mu = bestPortion.measureUnit?.name ? String(bestPortion.measureUnit.name).toLowerCase() : '';
        const mod = bestPortion.modifier ? String(bestPortion.modifier).toLowerCase() : '';
        const combined = [mu, mod].filter(Boolean).join(' ').trim();
        ingredient.servingUnit = combined || mu || mod || 'serving';
      }
    }

    // No fallbacks: rely strictly on USDA-provided serving information

    // Mark if this ingredient has a natural countable unit
    ingredient.hasNaturalUnit = shouldUseNaturalUnit(ingredient);

    // Cache the detailed ingredient
    ingredientCache.set(fdcId, ingredient);

    return ingredient;
  } catch (error) {
    console.error('Error fetching ingredient by ID:', error);
    throw error;
  }
};

// Clear cache if needed (e.g., after a certain time)
export const clearIngredientCache = () => {
  ingredientCache.clear();
};
