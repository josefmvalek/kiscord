/**
 * TMDB API Core Module
 * Handles searching and fetching metadata for movies and series.
 */

// Replace this with your own API key once you have it!
const TMDB_API_KEY = 'a02bbd7d733f93d2197bd4313d9bc151';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

/**
 * Searches for a movie or TV series on TMDB.
 * @param {string} query - The search term
 * @param {string} type - 'movies' or 'series'
 * @returns {Promise<Array>} - List of results
 */
export async function searchTMDB(query, type) {
    if (!query || query.length < 2) return [];

    // TMDB uses 'movie' and 'tv' for endpoints
    const tmdbType = type === 'movies' ? 'movie' : 'tv';

    try {
        const response = await fetch(`${BASE_URL}/search/${tmdbType}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=cs-CZ`);
        if (!response.ok) throw new Error('TMDB Search failed');

        const data = await response.json();
        return data.results || [];
    } catch (e) {
        console.error('[TMDB] Search error:', e);
        return [];
    }
}

/**
 * Fetches detailed information for a specific TMDB item.
 * @param {number} id - TMDB ID
 * @param {string} type - 'movies' or 'series'
 * @returns {Promise<Object>} - Detailed metadata
 */
export async function getTMDBDetails(id, type) {
    const tmdbType = type === 'movies' ? 'movie' : 'tv';

    try {
        const response = await fetch(`${BASE_URL}/${tmdbType}/${id}?api_key=${TMDB_API_KEY}&language=cs-CZ`);
        if (!response.ok) throw new Error('TMDB Details fetch failed');

        const data = await response.json();

        // Return a normalized object
        return {
            tmdb_id: data.id,
            title: data.title || data.name,
            overview: data.overview,
            poster_path: data.poster_path,
            rating: data.vote_average,
            // For series, use first_air_date; for movies, use release_date
            release_year: new Date(data.release_date || data.first_air_date).getFullYear(),
            // Runtime is called 'episode_run_time' (array) for TV, 'runtime' (int) for movies
            runtime: type === 'movies' ? data.runtime : (data.episode_run_time?.[0] || 0),
            genres: data.genres ? data.genres.map(g => g.name).join(', ') : '',
            imdb_id: data.imdb_id || null
        };
    } catch (e) {
        console.error('[TMDB] Details error:', e);
        return null;
    }
}

/**
 * Generates a full URL for a TMDB image.
 * @param {string} path - The poster_path from TMDB
 * @param {string} size - 'w200', 'w500', 'original' etc.
 * @returns {string} - Full image URL
 */
export function getTMDBImageUrl(path, size = 'w500') {
    if (!path) return '';
    return `${IMAGE_BASE_URL}/${size}${path}`;
}
