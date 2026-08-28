/**
 * Security & Sanitization Utilities
 * Prevents XSS when interpolating dynamic data into DOM template literals.
 */

const ESCAPE_MAP = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
};

/**
 * Escapes unsafe HTML characters in a string
 * @param {any} str
 * @returns {string}
 */
export function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>"']/g, char => ESCAPE_MAP[char] || char);
}

export const escapeHtml = escapeHTML;

/**
 * Tagged template literal for producing safe HTML strings
 * @param {TemplateStringsArray} strings
 * @param  {...any} values
 * @returns {string}
 */
export function safeHTML(strings, ...values) {
    let result = '';
    for (let i = 0; i < strings.length; i++) {
        result += strings[i];
        if (i < values.length) {
            const val = values[i];
            // If already marked as safe or numeric/boolean, don't escape
            if (val && typeof val === 'object' && val.__isSafeHTML) {
                result += val.content;
            } else if (typeof val === 'number' || typeof val === 'boolean') {
                result += String(val);
            } else {
                result += escapeHTML(val);
            }
        }
    }
    return result;
}

/**
 * Marks a string as trusted HTML (use cautiously)
 * @param {string} content
 */
export function rawHTML(content) {
    return {
        __isSafeHTML: true,
        content: String(content)
    };
}
