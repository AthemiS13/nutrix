import { GoogleGenerativeAI } from '@google/generative-ai';

interface AIAnalysisResult {
    food_item: string;
    mass_g: number;
    calories: number;
    protein_g: number;
    fats_g: number;
    carbs_g: number;
    confidence: number; // 0-1
}

export const analyzeFoodDescription = async (
    description: string,
    apiKey: string
): Promise<AIAnalysisResult> => {
    if (!apiKey) {
        throw new Error('Gemini API key is required');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

    const prompt = `
    You are a professional nutritionist. Analyze the following food description and estimate the nutritional content.
    Description: "${description}"

    If the user does not specify a weight, estimate a standard serving size for the item.
    Return ONLY a valid JSON object with no markdown formatting. The JSON structure:
    {
      "food_item": "Short descriptive name of the food",
      "mass_g": number (estimated weight in grams),
      "calories": number (total calories for this mass),
      "protein_g": number (total protein in grams),
      "fats_g": number (total fats in grams),
      "carbs_g": number (total carbs in grams),
      "confidence": number (between 0 and 1 indicating how sure you are)
    }
  `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Clean up potential markdown formatting (```json ... ```)
        const jsonString = text.replace(/```json\n?|\n?```/g, '').trim();
        const data: AIAnalysisResult = JSON.parse(jsonString);

        return data;
    } catch (error) {
        console.error('Gemini API Error:', error);
        throw new Error('Failed to analyze food description with AI');
    }
};

export const rateDailyIntake = async (
    stats: any, // using any to avoid circular imports or strict type coupling here, but theoretically DailyStats
    profile: any, // UserProfile
    apiKey: string
): Promise<string> => {
    if (!apiKey) {
        throw new Error('Gemini API key is required');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

    const prompt = `
    You are a professional nutritionist. Analyze the user's daily intake so far and provide a brief, helpful rating or summary.
    
    User Profile:
    - Weight: ${profile.bodyWeight}kg
    - Daily Calorie Goal: ${profile.dailyCalorieGoal} kcal
    - Daily Protein Goal: ${profile.dailyProteinGoal || 'N/A'} g

    Daily Intake So Far:
    - Total Calories: ${stats.totalCalories.toFixed(0)} kcal
    - Total Protein: ${stats.totalProtein.toFixed(1)} g
    - Total Fats: ${stats.totalFats.toFixed(1)} g
    - Total Carbs: ${stats.totalCarbohydrates.toFixed(1)} g
    - Meals: ${stats.meals.map((m: any) => `${m.recipeName} (${m.nutrients.calories.toFixed(0)}kcal, ${m.nutrients.protein.toFixed(1)}g pro)`).join(', ')}

    Identify 1-2 major wins or areas for improvement. Be concise (max 2 sentences).
    Talk directly to the user ("You have...").
    If the user has eaten nothing, just encourage them to start the day.
  `;

    try {
        const result = await model.generateContent(prompt);
        return result.response.text();
    } catch (error) {
        console.error('Gemini API Error (Rate):', error);
        throw new Error('Failed to rate info');
    }
};

export const suggestNextMeal = async (
    stats: any,
    profile: any,
    apiKey: string
): Promise<string> => {
    if (!apiKey) {
        throw new Error('Gemini API key is required');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

    // Calculate remaining
    const remainingCals = profile.dailyCalorieGoal - stats.totalCalories;
    const remainingPro = (profile.dailyProteinGoal || 0) - stats.totalProtein;

    const prompt = `
    You are a professional nutritionist. Suggest ONE specific meal or snack option to help the user hit their remaining goals.

    Remaining Goals:
    - Calories: ${remainingCals.toFixed(0)} kcal
    - Protein: ${remainingPro > 0 ? remainingPro.toFixed(1) + ' g' : 'Goal met'}

    The suggestion should be practical and specific (e.g., "Greek Yogurt with berries" or "Chicken Breast with Rice").
    Explain WHY in 1 short sentence (e.g., "This provides high protein with low calories to fit your remaining budget").
    Return ONLY the suggestion and the explanation.
  `;

    try {
        const result = await model.generateContent(prompt);
        return result.response.text();
    } catch (error) {
        console.error('Gemini API Error (Suggest):', error);
        throw new Error('Failed to suggest meal');
    }
};
