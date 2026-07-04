export interface BarcodeLookupResult {
  productName: string;
  nutrientsPer100g: {
    calories: number;
    protein: number;
    fats: number;
    carbohydrates: number;
  };
  servingSize?: number; // grams per serving if available
  imageUrl?: string;
  brands?: string;
}

/**
 * Look up a product by barcode using the Open Food Facts API.
 * https://world.openfoodfacts.org/data
 *
 * Returns null if the product is not found.
 */
export const lookupBarcode = async (
  barcode: string
): Promise<BarcodeLookupResult | null> => {
  const fields = [
    'product_name',
    'nutriments',
    'serving_size',
    'image_front_small_url',
    'brands',
  ].join(',');

  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(
    barcode
  )}?fields=${fields}`;

  try {
    const response = await fetch(url, {
      headers: {
        // Open Food Facts asks for a descriptive User-Agent
        'User-Agent': 'Nutrix - Web - Version 0.1',
      },
    });

    if (!response.ok) {
      throw new Error(`Open Food Facts API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.status === 0 || !data.product) {
      // Product not found in database
      return null;
    }

    const product = data.product;
    const nutriments = product.nutriments || {};

    // Extract nutrition per 100g — OFF stores these with _100g suffix
    const nutrientsPer100g = {
      calories: nutriments['energy-kcal_100g'] ?? nutriments['energy_100g'] ?? 0,
      protein: nutriments['proteins_100g'] ?? 0,
      fats: nutriments['fat_100g'] ?? 0,
      carbohydrates: nutriments['carbohydrates_100g'] ?? 0,
    };

    // Parse serving size string (e.g. "30g", "250 ml") into a number in grams
    let servingSize: number | undefined;
    if (product.serving_size) {
      const match = product.serving_size.match(/(\d+(?:\.\d+)?)\s*g/i);
      if (match) {
        servingSize = parseFloat(match[1]);
      }
    }

    return {
      productName: product.product_name || 'Unknown Product',
      nutrientsPer100g,
      servingSize,
      imageUrl: product.image_front_small_url,
      brands: product.brands,
    };
  } catch (error) {
    console.error('Open Food Facts lookup error:', error);
    throw error;
  }
};
