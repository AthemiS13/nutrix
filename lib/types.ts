export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string; // user's display name for social features
  friendCode?: string; // unique code for adding friends
  bodyWeight: number; // in kg
  dailyCalorieGoal: number;
  dailyProteinGoal?: number; // in grams
  targetMonthlyWeightChange?: number; // in kg, positive for gain, negative for loss
  preferredUnit?: 'grams' | 'tablespoons'; // user's preferred measurement unit
  currentStreak?: number; // consecutive days meeting both calorie and protein goals
  longestStreak?: number; // all-time longest streak
  lastStreakDate?: string; // ISO date string of last successful day
  friends?: string[]; // array of friend UIDs
  createdAt: string;
  updatedAt: string;
}

export interface Nutrient {
  calories: number;
  protein: number;
  fats: number;
  carbohydrates: number;
}

export interface Ingredient {
  fdcId: number;
  description: string;
  nutrients: Nutrient; // per 100g or per serving
  servingSize?: number; // grams per serving (e.g., 1 egg = 50g)
  servingUnit?: string; // e.g., "egg", "cup", "slice", "piece", "tablespoon"
  hasNaturalUnit?: boolean; // true for countable items like eggs, pieces
}

export interface RecipeIngredient {
  ingredient: Ingredient;
  mass: number; // in grams
  quantity?: number; // optional: number of servings (e.g., 2 eggs)
}

export interface Recipe {
  id: string;
  userId: string;
  name: string;
  ingredients: RecipeIngredient[];
  totalNutrients: Nutrient; // total for entire recipe
  nutrientsPer100g: Nutrient; // calculated per 100g
  totalMass: number; // total grams
  createdAt: string;
  updatedAt: string;
}

export interface MealLog {
  id: string;
  userId: string;
  recipeId: string;
  recipeName: string;
  mass: number; // grams consumed
  nutrients: Nutrient; // calculated based on mass
  date: string; // ISO date string
  createdAt: string;
}

export interface DailyStats {
  date: string;
  totalCalories: number;
  totalProtein: number;
  totalFats: number;
  totalCarbohydrates: number;
  meals: MealLog[];
}
