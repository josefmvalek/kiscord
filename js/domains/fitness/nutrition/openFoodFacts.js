const OFF_API_URL = 'https://world.openfoodfacts.org/cgi/search.pl';
const OFF_BARCODE_URL = 'https://world.openfoodfacts.org/api/v0/product';

const _cache = new Map();

/**
 * Searches OpenFoodFacts API for products matching text query.
 * @param {string} query - Product name (e.g. "Milka", "Tvaroh Pilos", "Protein bar")
 * @returns {Promise<Array<object>>}
 */
export async function searchOpenFoodFacts(query) {
    if (!query || query.trim().length < 2) return [];
    const cleanQuery = query.trim().toLowerCase();

    if (_cache.has(cleanQuery)) {
        return _cache.get(cleanQuery);
    }

    try {
        const url = `${OFF_API_URL}?search_terms=${encodeURIComponent(cleanQuery)}&search_simple=1&action=process&json=1&page_size=15&fields=code,product_name,product_name_cs,brands,nutriments,image_front_small_url`;
        const res = await fetch(url, { headers: { 'User-Agent': 'Kiscord - WebApp' } });
        if (!res.ok) return [];

        const data = await res.json();
        const products = (data.products || [])
            .filter(p => p.nutriments && (p.product_name || p.product_name_cs))
            .map(p => formatOpenFoodProduct(p));

        _cache.set(cleanQuery, products);
        return products;
    } catch (err) {
        console.warn('[OpenFoodFacts] Search error / offline:', err);
        return [];
    }
}

/**
 * Looks up a single product by EAN / Barcode.
 * @param {string} barcode
 * @returns {Promise<object|null>}
 */
export async function lookupBarcode(barcode) {
    if (!barcode) return null;
    const cleanCode = barcode.trim();

    if (_cache.has(cleanCode)) {
        return _cache.get(cleanCode);
    }

    try {
        const url = `${OFF_BARCODE_URL}/${encodeURIComponent(cleanCode)}.json`;
        const res = await fetch(url, { headers: { 'User-Agent': 'Kiscord - WebApp' } });
        if (!res.ok) return null;

        const data = await res.json();
        if (data.status === 1 && data.product) {
            const formatted = formatOpenFoodProduct(data.product);
            _cache.set(cleanCode, formatted);
            return formatted;
        }
        return null;
    } catch (err) {
        console.warn('[OpenFoodFacts] Barcode error:', err);
        return null;
    }
}

function formatOpenFoodProduct(p) {
    const nut = p.nutriments || {};
    const name = p.product_name_cs || p.product_name || 'Neznámá potravina';
    const brand = p.brands ? ` (${p.brands})` : '';

    return {
        id: 'off_' + (p.code || Math.random().toString(36).substr(2, 6)),
        name: `${name}${brand}`,
        barcode: p.code || null,
        imageUrl: p.image_front_small_url || null,
        amount_g: 100,
        calories: Math.round(nut['energy-kcal_100g'] || nut['energy-kcal'] || ((nut['energy_100g'] || 0) / 4.184) || 0),
        protein: Math.round((nut['proteins_100g'] || nut['proteins'] || 0) * 10) / 10,
        carbs: Math.round((nut['carbohydrates_100g'] || nut['carbohydrates'] || 0) * 10) / 10,
        fats: Math.round((nut['fat_100g'] || nut['fat'] || 0) * 10) / 10,
        fiber: Math.round((nut['fiber_100g'] || nut['fiber'] || 0) * 10) / 10,
        sugars: Math.round((nut['sugars_100g'] || nut['sugars'] || 0) * 10) / 10,
        sodium_mg: Math.round((nut['sodium_100g'] || 0) * 1000)
    };
}
