/**
 * Food Dictionary with Base Macro Values per 100g (or per piece where noted)
 */
export const FOOD_KNOWLEDGE_BASE = [
    { keywords: ['vejce', 'vajicko', 'vajicka', 'vajec', 'egg', 'eggs'], isPiece: true, pieceWeight: 55, calories: 145, protein: 12.5, carbs: 0.8, fats: 10, fiber: 0 },
    { keywords: ['ovesne vlocky', 'vlocky', 'ovesna kase', 'oats', 'oatmeal'], calories: 375, protein: 13.5, carbs: 60, fats: 7, fiber: 10 },
    { keywords: ['kureci prsa', 'kureci', 'kure', 'chicken breast', 'chicken'], calories: 165, protein: 31, carbs: 0, fats: 3.6, fiber: 0 },
    { keywords: ['hovezi maso', 'hovezi', 'beef', 'steak'], calories: 215, protein: 26, carbs: 0, fats: 12, fiber: 0 },
    { keywords: ['ryze', 'jasmínová ryze', 'basmati', 'rice'], calories: 130, protein: 2.7, carbs: 28, fats: 0.3, fiber: 0.4 },
    { keywords: ['brambory', 'brambor', 'potatoes', 'potato'], calories: 77, protein: 2, carbs: 17, fats: 0.1, fiber: 2.2 },
    { keywords: ['testoviny', 'spagety', 'pasta'], calories: 135, protein: 5, carbs: 27, fats: 0.8, fiber: 1.5 },
    { keywords: ['tvaroh', 'odtučněný tvaroh', 'cottage', 'quark', 'cottage cheese'], calories: 70, protein: 12, carbs: 4, fats: 0.5, fiber: 0 },
    { keywords: ['protein', 'syrovatkovy protein', 'whey protein', 'proteinovy shake', 'shake'], calories: 400, protein: 80, carbs: 7, fats: 5, fiber: 1 },
    { keywords: ['banan', 'banany', 'banana'], isPiece: true, pieceWeight: 120, calories: 89, protein: 1.1, carbs: 23, fats: 0.3, fiber: 2.6 },
    { keywords: ['jablko', 'jablka', 'apple'], isPiece: true, pieceWeight: 150, calories: 52, protein: 0.3, carbs: 14, fats: 0.2, fiber: 2.4 },
    { keywords: ['arasidove maslo', 'peanut butter'], calories: 600, protein: 25, carbs: 20, fats: 50, fiber: 6 },
    { keywords: ['maslo', 'butter'], calories: 720, protein: 0.8, carbs: 0.7, fats: 81, fiber: 0 },
    { keywords: ['olivovy olej', 'olej', 'olive oil', 'oil'], calories: 884, protein: 0, carbs: 0, fats: 100, fiber: 0 },
    { keywords: ['chleb', 'chleba', 'pecivo', 'rohlik', 'toast', 'bread'], isPiece: true, pieceWeight: 60, calories: 250, protein: 8, carbs: 49, fats: 1.5, fiber: 4 },
    { keywords: ['syr', 'eidam', 'gouda', 'mozzarella', 'cheese'], calories: 300, protein: 25, carbs: 1.5, fats: 22, fiber: 0 },
    { keywords: ['losos', 'salmon', 'ryba', 'tuna', 'tunak'], calories: 208, protein: 20, carbs: 0, fats: 13, fiber: 0 },
    { keywords: ['avokado', 'avocado'], isPiece: true, pieceWeight: 140, calories: 160, protein: 2, carbs: 9, fats: 15, fiber: 7 },
    { keywords: ['mleko', 'milk'], calories: 47, protein: 3.3, carbs: 4.8, fats: 1.5, fiber: 0 },
    { keywords: ['recke jogurt', 'jogurt', 'greek yogurt', 'yogurt'], calories: 60, protein: 10, carbs: 3.6, fats: 0.5, fiber: 0 }
];

/**
 * Parses freeform natural language text into individual food items with calculated macros.
 * @param {string} text - e.g. "2 vejce, 80g vloček, 30g protein, banán"
 * @returns {Array<object>} Array of parsed items
 */
export function parseFoodNaturalLanguage(text) {
    if (!text || typeof text !== 'string') return [];

    // Split by commas, newlines, " a ", " + "
    const rawClauses = text
        .replace(/\n/g, ',')
        .replace(/\s+a\s+/gi, ',')
        .replace(/\s*\+\s*/g, ',')
        .split(',')
        .map(c => c.trim())
        .filter(c => c.length > 0);

    const parsedResults = [];

    rawClauses.forEach(clause => {
        const item = parseSingleClause(clause);
        if (item) {
            parsedResults.push(item);
        }
    });

    return parsedResults;
}

function parseSingleClause(rawStr) {
    const cleanStr = rawStr.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

    // 1. Detect weight or piece count
    // Pattern A: Grams (e.g. 150g, 150 g, 150gramu)
    const gramMatch = cleanStr.match(/(\d+(?:[.,]\d+)?)\s*(?:g|gram|gramu|gramov|ml)/i);
    // Pattern B: Pieces (e.g. 2 ks, 2x, 2 vejce, 1 jablko)
    const pieceMatch = cleanStr.match(/^(\d+(?:[.,]\d+)?)\s*(?:ks|x|kusy|kusu)?\b/i);

    let amountGrams = null;
    let pieceCount = null;

    if (gramMatch) {
        amountGrams = parseFloat(gramMatch[1].replace(',', '.'));
    } else if (pieceMatch) {
        pieceCount = parseFloat(pieceMatch[1].replace(',', '.'));
    }

    // 2. Find matching food in knowledge base
    let matchedFood = null;
    for (const food of FOOD_KNOWLEDGE_BASE) {
        for (const kw of food.keywords) {
            const cleanKw = kw.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            if (cleanStr.includes(cleanKw)) {
                matchedFood = food;
                break;
            }
        }
        if (matchedFood) break;
    }

    // 3. If matched, calculate macros
    if (matchedFood) {
        if (!amountGrams) {
            if (matchedFood.isPiece) {
                const count = pieceCount || 1;
                amountGrams = count * (matchedFood.pieceWeight || 100);
            } else {
                amountGrams = 100; // Default portion
            }
        }

        const factor = amountGrams / 100;
        return {
            food_name: capitalizeFirst(rawStr.replace(/^\d+\s*(?:ks|x|g)?\s*/i, '').trim() || matchedFood.keywords[0]),
            amount_g: Math.round(amountGrams),
            calories: Math.round(matchedFood.calories * factor),
            protein: Math.round(matchedFood.protein * factor * 10) / 10,
            carbs: Math.round(matchedFood.carbs * factor * 10) / 10,
            fats: Math.round(matchedFood.fats * factor * 10) / 10,
            fiber: Math.round(matchedFood.fiber * factor * 10) / 10
        };
    }

    // Fallback: unrecognised food with default 100g
    return {
        food_name: capitalizeFirst(rawStr.trim()),
        amount_g: amountGrams || 100,
        calories: 150,
        protein: 5,
        carbs: 20,
        fats: 5,
        fiber: 1
    };
}

function capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}
