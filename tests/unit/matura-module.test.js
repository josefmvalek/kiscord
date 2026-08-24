import { describe, it, expect, beforeEach, vi } from 'vitest';
import { state } from '../../js/core/state.js';
import { cycleStatus, updateMaturaStreak, scheduleTopic, removeMission } from '../../js/domains/university/matura/actions.js';
import { formatMarkdown } from '../../js/domains/university/matura/editor.js';
import { getCategoryIcon } from '../../js/domains/university/matura/state.js';

// Mock Supabase
vi.mock('../../js/core/supabase.js', () => {
    const mockQuery = {
        select: vi.fn(() => Promise.resolve({ data: [{ id: 'm1', scheduled_date: '2026-08-24' }], error: null })),
        insert: vi.fn(() => ({
            select: vi.fn(() => Promise.resolve({ data: [{ id: 'm1', scheduled_date: '2026-08-24' }], error: null }))
        })),
        upsert: vi.fn(() => Promise.resolve({ data: null, error: null })),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null }))
    };
    return {
        supabase: {
            from: vi.fn(() => mockQuery)
        }
    };
});

// Mock notification & haptics
vi.mock('../../js/core/theme.js', () => ({
    showNotification: vi.fn()
}));

vi.mock('../../js/core/utils.js', () => ({
    triggerHaptic: vi.fn(),
    triggerConfetti: vi.fn()
}));

describe('Matura Module Decomposition & Logic', () => {
    beforeEach(() => {
        state.currentUser = { id: 'u1', name: 'Jožka' };
        state.maturaProgress = {};
        state.maturaTopics = {
            czech_jozka: [
                { id: 'cz_1', title: 'Máj', cat: 'Romantismus', icon: '📖' },
                { id: 'cz_2', title: 'Kytice', cat: 'Romantismus', icon: '💐' }
            ]
        };
        state.maturaSchedule = [];
        state.maturaKBContent = {};
        state.maturaStreaks = {};
    });

    describe('cycleStatus', () => {
        it('should cycle status from none -> started -> done -> none for Jožka', async () => {
            const itemId = 'cz_1';

            // Initial state: none -> started
            await cycleStatus(itemId);
            expect(state.maturaProgress[itemId].jose.status).toBe('started');

            // started -> done
            await cycleStatus(itemId);
            expect(state.maturaProgress[itemId].jose.status).toBe('done');

            // done -> none
            await cycleStatus(itemId);
            expect(state.maturaProgress[itemId].jose.status).toBe('none');
        });

        it('should cycle status correctly for Klárka without mutating Jožka status', async () => {
            state.currentUser = { id: 'u2', name: 'Klárka' };
            state.maturaProgress['cz_1'] = {
                jose: { status: 'done', notes: 'Zná zpaměti' },
                klarka: { status: 'none', notes: '' }
            };

            await cycleStatus('cz_1');
            expect(state.maturaProgress['cz_1'].klarka.status).toBe('started');
            expect(state.maturaProgress['cz_1'].jose.status).toBe('done');
            expect(state.maturaProgress['cz_1'].jose.notes).toBe('Zná zpaměti');
        });
    });

    describe('formatMarkdown & Wikilinks', () => {
        it('should transform [[Topic Title]] into interactive wikilink tags when topic exists', () => {
            const raw = 'Podrobnosti viz [[Máj]] v české literatuře.';
            const html = formatMarkdown(raw);

            expect(html).toContain('class="matura-wikilink"');
            expect(html).toContain("openKnowledgeBase('cz_1')");
            expect(html).toContain('Máj');
        });

        it('should render unknown wikilink in fallback format when topic does not exist', () => {
            const raw = 'Viz [[Neznámé Dílo]].';
            const html = formatMarkdown(raw);

            expect(html).toContain('[[Neznámé Dílo]]');
            expect(html).not.toContain("openKnowledgeBase");
        });
    });

    describe('Missions & Scheduling', () => {
        it('should schedule topic and add to local maturaSchedule', async () => {
            await scheduleTopic('cz_1', 'today');
            expect(state.maturaSchedule.length).toBe(1);
            expect(state.maturaSchedule[0].id).toBe('m1');
        });

        it('should remove mission from state.maturaSchedule', async () => {
            state.maturaSchedule = [{ id: 'm1', item_id: 'cz_1' }, { id: 'm2', item_id: 'cz_2' }];
            await removeMission('m1');
            expect(state.maturaSchedule.length).toBe(1);
            expect(state.maturaSchedule[0].id).toBe('m2');
        });
    });

    describe('getCategoryIcon', () => {
        it('should return appropriate flag or symbol based on category id', () => {
            expect(getCategoryIcon('czech')).toBe('🇨🇿');
            expect(getCategoryIcon('czech_jozka')).toBe('🇨🇿');
            expect(getCategoryIcon('it')).toBe('💻');
            expect(getCategoryIcon('english')).toBe('🇬🇧');
            expect(getCategoryIcon('math')).toBe('🔢');
            expect(getCategoryIcon('other')).toBe('📚');
        });
    });
});
