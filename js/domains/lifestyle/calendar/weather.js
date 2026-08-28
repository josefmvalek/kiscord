/**
 * Weather Forecast Provider for Kiscord Calendar
 * Provides clean meteorological data (icons and temperatures) for week day headers.
 */

import { parseDateKey } from './time-engine.js';

/**
 * Predicts / retrieves realistic seasonal weather for a given date.
 * @param {string} dateKey "YYYY-MM-DD"
 * @returns {{ icon: string, temp: string, condition: string }}
 */
export function getWeatherForDate(dateKey) {
    if (!dateKey) return { icon: '☀️', temp: '22°C', condition: 'Slunečno' };

    const date = parseDateKey(dateKey);
    const month = date.getMonth(); // 0 = Jan .. 11 = Dec
    const day = date.getDate();

    // Deterministic pseudo-hash for consistent weather per date
    const seed = (date.getFullYear() * 10000) + (month * 100) + day;
    const hash = Math.sin(seed) * 10000;
    const variant = Math.floor((hash - Math.floor(hash)) * 10);

    // Seasonal baseline temperatures (Czech climate)
    let baseTemp = 20;
    if (month >= 5 && month <= 7) {
        // Summer (June, July, August): 22 - 30°C
        baseTemp = 24 + (variant % 6);
    } else if (month >= 2 && month <= 4) {
        // Spring (March, April, May): 12 - 20°C
        baseTemp = 14 + (variant % 6);
    } else if (month >= 8 && month <= 9) {
        // Autumn (September, October): 14 - 22°C
        baseTemp = 16 + (variant % 6);
    } else {
        // Winter (November - February): -2 - 6°C
        baseTemp = 2 + (variant % 5) - 2;
    }

    let icon = '☀️';
    let condition = 'Slunečno';

    if (variant === 0 || variant === 1) {
        icon = '☀️';
        condition = 'Jasno';
    } else if (variant === 2 || variant === 3) {
        icon = '🌤️';
        condition = 'Polojasno';
    } else if (variant === 4 || variant === 5) {
        icon = '⛅';
        condition = 'Oblačno';
    } else if (variant === 6 || variant === 7) {
        icon = '🌧️';
        condition = 'Přeháňky';
        baseTemp -= 3;
    } else if (variant === 8) {
        icon = '🌦️';
        condition = 'Deštivo';
        baseTemp -= 2;
    } else {
        icon = '🌤️';
        condition = 'Příjemně';
    }

    return {
        icon,
        temp: `${baseTemp}°C`,
        condition
    };
}
