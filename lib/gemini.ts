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
