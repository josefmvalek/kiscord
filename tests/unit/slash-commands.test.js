import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../js/core/supabase.js', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            upsert: vi.fn().mockResolvedValue({ data: [], error: null }),
            update: vi.fn().mockResolvedValue({ data: [], error: null })
        }))
    }
}));

import { SlashCommandRegistry } from '../../js/core/slash-commands.js';
import { state } from '../../js/core/state.js';

describe('Discord Slash Commands Engine', () => {
    let registry;

    beforeEach(() => {
        registry = new SlashCommandRegistry();
        state.healthData = {};
        state.plannedDates = {};
    });

    it('registers custom slash commands and retrieves them in getAll', () => {
        registry.register('test', 'Testovací příkaz', '/test <param>', () => 'OK');
        const all = registry.getAll();
        const found = all.find(c => c.name === 'test');

        expect(found).toBeDefined();
        expect(found.syntax).toBe('/test <param>');
    });

    it('executes /voda command and updates state', async () => {
        const result = await registry.execute('/voda 3');
        expect(result.success).toBe(true);

        const today = new Date().toISOString().split('T')[0];
        expect(state.healthData[today].water).toBe(3);
    });

    it('executes /spanek command and records sleep hours', async () => {
        const result = await registry.execute('/spanek 7.5');
        expect(result.success).toBe(true);

        const today = new Date().toISOString().split('T')[0];
        expect(state.healthData[today].sleep).toBe(7.5);
    });

    it('returns error result for unknown slash command', async () => {
        const result = await registry.execute('/neexistuje');
        expect(result.success).toBe(false);
        expect(result.message).toContain('Neznámý příkaz');
    });
});
