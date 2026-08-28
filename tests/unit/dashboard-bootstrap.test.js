import { describe, it, expect, beforeEach, vi } from 'vitest';
import { state } from '../../js/core/state.js';
import { ensureHabitsData, loadHabitsData, setHabitsFromBootstrap } from '../../js/domains/lifestyle/habits.js';
import { syncDashboardData } from '../../js/domains/lifestyle/dashboard/index.js';
import { supabase } from '../../js/core/supabase.js';

import { createMockSupabase } from '../fixtures/mock-supabase.js';

const { mockSupabase } = vi.hoisted(() => {
    return { mockSupabase: null };
});

vi.mock('../../js/core/supabase.js', async () => {
    const { createMockSupabase } = await import('../fixtures/mock-supabase.js');
    return {
        supabase: createMockSupabase()
    };
});

vi.mock('../../js/core/theme.js', () => ({
    showNotification: vi.fn(),
    showConfirmDialog: vi.fn().mockResolvedValue(true)
}));

vi.mock('../../js/core/sync.js', () => ({
    broadcastHealthUpdate: vi.fn(),
    broadcastSleepStatus: vi.fn(),
    broadcastSunlight: vi.fn()
}));

describe('Dashboard Bootstrap & Habits Sync Resilience', () => {
    beforeEach(() => {
        localStorage.clear();
        state.currentUser = { id: 'user-jose', name: 'Jožka' };
        state.healthData = {};
        state.partnerHealthData = null;
        state.pinnedDrawing = null;
        state.tetris = {};
        state.plannedDates = {};
        state.coopQuests = [];
        vi.clearAllMocks();
    });

    it('should export and execute ensureHabitsData without error', async () => {
        expect(typeof ensureHabitsData).toBe('function');
        expect(typeof loadHabitsData).toBe('function');

        const mockHabits = [{ id: 'h-1', name: 'Ranní voda', user_id: 'user-jose' }];
        const mockLogs = [{ id: 'l-1', habit_id: 'h-1', user_id: 'user-jose', date_key: '2026-08-26' }];

        supabase.from('app_habits')._setData(mockHabits);
        supabase.from('app_habit_logs')._setData(mockLogs);

        const result = await ensureHabitsData(true);
        expect(result).toEqual(mockHabits);
    });

    it('should set habits from bootstrap payload via setHabitsFromBootstrap', () => {
        const habits = [{ id: 'h-1', name: 'Kliky', user_id: 'user-jose' }];
        const logs = [{ id: 'l-1', habit_id: 'h-1', user_id: 'user-jose', date_key: '2026-08-26' }];

        setHabitsFromBootstrap(habits, logs);
        expect(localStorage.getItem('kiscord_local_habits')).toContain('Kliky');
        expect(localStorage.getItem('kiscord_local_habit_logs')).toContain('2026-08-26');
    });

    it('should successfully hydrate dashboard when RPC get_full_dashboard_bootstrap succeeds', async () => {
        const todayKey = new Date().toISOString().split('T')[0];
        supabase.rpc.mockResolvedValue({
            data: {
                health: { water: 5, sleep: 7.5, mood: 9 },
                partner_health: { water: 4, sleep: 8, mood: 8 },
                pinned_drawing: { id: 'draw-1', title: 'Srdíčko' },
                tetris: { jose: 1000, klarka: 800 },
                next_event: { date_key: todayKey, name: 'Večeře' },
                active_quests: [{ id: 'q-1', goal: 150, type: 'sum_water' }],
                habits: [{ id: 'h-1', name: 'Učení' }],
                habit_logs: [],
                relationship_xp: 345
            },
            error: null
        });

        await syncDashboardData(true);

        expect(state.healthData[todayKey]?.water).toBe(5);
        expect(state.partnerHealthData?.water).toBe(4);
        expect(state.pinnedDrawing?.title).toBe('Srdíčko');
        expect(state.tetris?.jose).toBe(1000);
        expect(state.coopQuests.length).toBe(1);
        expect(state.relationshipXP).toBe(345);
    });

    it('should gracefully fallback when RPC fails with error 42703 (undefined column) without crashing', async () => {
        supabase.rpc.mockResolvedValue({
            data: null,
            error: { code: '42703', message: 'column "sunlight" does not exist' }
        });

        // Ensure fallback does not throw
        await expect(syncDashboardData(true)).resolves.not.toThrow();
    });
});
