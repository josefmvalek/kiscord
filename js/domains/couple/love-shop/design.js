/**
 * Love Shop Design & Aesthetics Module
 * Design token mappings, FontAwesome icon sets and glowing badge configurations.
 */

// Mapa ikon a stylů pro prémiové FontAwesome ikony a glow efekty
export const designMap = {
    'Pán Dálkového Ovladače': { fa: 'fa-tv text-amber-400', glow: 'rgba(251, 191, 36, 0.25)', border: 'border-amber-500/30 hover:border-amber-400' },
    'Diktátor Večeře': { fa: 'fa-utensils text-orange-400', glow: 'rgba(251, 146, 60, 0.25)', border: 'border-orange-500/30 hover:border-orange-400' },
    'Playlist Master': { fa: 'fa-music text-purple-400', glow: 'rgba(192, 132, 252, 0.25)', border: 'border-purple-500/30 hover:border-purple-400' },
    'Právo Veta': { fa: 'fa-bolt text-yellow-400', glow: 'rgba(250, 204, 21, 0.3)', border: 'border-yellow-500/40 hover:border-yellow-300' },
    'Úklidový Free Pass': { fa: 'fa-soap text-emerald-400', glow: 'rgba(52, 211, 153, 0.25)', border: 'border-emerald-500/30 hover:border-emerald-400' },
    'Ranní Spáč': { fa: 'fa-bed text-sky-400', glow: 'rgba(56, 189, 248, 0.25)', border: 'border-sky-500/30 hover:border-sky-400' },
    'Snídaně do postele': { fa: 'fa-egg text-amber-400', glow: 'rgba(245, 158, 11, 0.25)', border: 'border-amber-500/30 hover:border-amber-400' },
    'Zasloužená Masáž': { fa: 'fa-spa text-indigo-400', glow: 'rgba(129, 140, 248, 0.3)', border: 'border-indigo-500/30 hover:border-indigo-400' },
    'Hlava na klíně': { fa: 'fa-heart text-pink-500', glow: 'rgba(244, 63, 94, 0.25)', border: 'border-pink-500/30 hover:border-pink-400' },
    'Královská masáž nohou': { fa: 'fa-socks text-violet-400', glow: 'rgba(167, 139, 250, 0.25)', border: 'border-violet-500/30 hover:border-violet-400' },
    'Poslední kousek': { fa: 'fa-pizza-slice text-amber-500', glow: 'rgba(245, 158, 11, 0.25)', border: 'border-amber-500/30 hover:border-amber-400' },
    'Zmrzlinová': { fa: 'fa-ice-cream text-pink-400', glow: 'rgba(244, 114, 182, 0.25)', border: 'border-pink-500/30 hover:border-pink-400' },
    'Sladké překvapení': { fa: 'fa-cookie-bite text-rose-400', glow: 'rgba(251, 113, 133, 0.25)', border: 'border-rose-500/30 hover:border-rose-400' },
    'Okamžité medvědí objetí': { fa: 'fa-hands-holding text-rose-400', glow: 'rgba(251, 113, 133, 0.25)', border: 'border-rose-500/30 hover:border-rose-400' },
    'Vynucené rande': { fa: 'fa-wine-glass-alt text-purple-400', glow: 'rgba(192, 132, 252, 0.3)', border: 'border-purple-500/40 hover:border-purple-300' }
};

export const categories = {
    dominance: { name: "👑 Vláda & Rozhodování", desc: "Plné právo na ovladač, večeři a program bez remcání", color: "text-amber-400" },
    compromises: { name: "🧼 Domácí imunita & Free Pasy", desc: "Úlevy z úklidu, ranní spánek a snídaně do peřin", color: "text-emerald-400" },
    pampering: { name: "💆 Fyzická odměna & Hýčkání", desc: "Zasloužené masáže po tréninku a uvolňující péče", color: "text-indigo-400" },
    surprises: { name: "🍕 Drobné výhody & Mlsání", desc: "Právo na poslední kousek a sladké dobroty na účet partnera", color: "text-rose-400" },
    emergency: { name: "🫂 Záchranné & Intimita", desc: "Okamžité medvědí objetí a vynucené rande na míru", color: "text-purple-400" }
};

/**
 * Removes leading emoji and whitespace from perk titles.
 * @param {string} title
 * @returns {string}
 */
export function cleanTitle(title) {
    if (!title) return '';
    return title.replace(/^[\s\p{Emoji}]+/u, '').trim();
}

/**
 * Resolves visual design tokens for a given perk title.
 * @param {string} title
 * @returns {{ fa: string, glow: string, border: string }}
 */
export function getItemDesign(title) {
    const cleaned = cleanTitle(title);
    const match = Object.keys(designMap).find(k => cleaned.includes(k) || k.includes(cleaned));
    if (match) return designMap[match];
    
    return { fa: 'fa-crown text-amber-400', glow: 'rgba(245, 158, 11, 0.15)', border: 'border-amber-500/20 hover:border-amber-400' };
}
