/**
 * Local State & Utilities for Matura Module
 */

export const maturaLocalState = {
    activeCategory: 'czech',
    currentTopicId: null,
    searchQuery: '',
    selectedUser: 'all'
};

export function getCategoryIcon(catId) {
    switch (catId) {
        case 'czech':
        case 'czech_jozka':
        case 'czech_klarka':
            return '🇨🇿';
        case 'it':
            return '💻';
        case 'english':
            return '🇬🇧';
        case 'math':
            return '🔢';
        default:
            return '📚';
    }
}
