import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../js/core/supabase.js', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            insert: vi.fn().mockResolvedValue({ data: [], error: null }),
            update: vi.fn().mockResolvedValue({ data: [], error: null }),
            delete: vi.fn().mockResolvedValue({ data: [], error: null }),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: null })
        })),
        channel: vi.fn(() => ({
            on: vi.fn().mockReturnThis(),
            send: vi.fn().mockResolvedValue({}),
            subscribe: vi.fn().mockReturnValue({})
        }))
    }
}));

vi.mock('../../js/core/utils.js', () => ({
    triggerHaptic: vi.fn(),
    triggerConfetti: vi.fn(),
    escapeHTML: vi.fn(str => str || ''),
    getTodayKey: vi.fn(() => new Date().toISOString().split('T')[0])
}));

vi.mock('../../js/core/sound.js', () => ({
    playPageFlip: vi.fn(),
    playServerPop: vi.fn(),
    playSuccessChime: vi.fn(),
    playHeartbeat: vi.fn(),
    playArcade: vi.fn(),
    playChime: vi.fn()
}));

import { state } from '../../js/core/state.js';
import { 
    sendGymCheer, 
    broadcastTouchPosition, 
    broadcastGymRestSync, 
    broadcastStudyFocus, 
    renderRichPresenceHub 
} from '../../js/core/sync.js';
import { renderHapticTouch } from '../../js/domains/couple/haptic-touch.js';

describe('Realtime Features Suite (Thumbkiss, Gym Cheer, Spolu-studovna)', () => {
    beforeEach(() => {
        localStorage.clear();
        document.body.innerHTML = `
            <div id="main-content"></div>
            <div id="messages-container"></div>
            <div id="rich-presence-members-container"></div>
        `;
        state.currentUser = { id: 'usr_jose', name: 'Jožka' };
        state.user_ids = { jose: 'usr_jose', klarka: 'usr_klarka' };
        state.currentServer = 'home';
        state.currentChannel = 'dashboard';
        state.partnerPresenceActivity = 'Na Dashboardu';
        state.partnerStudyFocus = null;
    });

    describe('1. Thumbkiss Dual-Touch Pad Engine', () => {
        it('should render Thumbkiss touch surface and elements in #dotek', () => {
            renderHapticTouch();
            const arena = document.getElementById('thumbkiss-arena');
            const myAura = document.getElementById('my-touch-aura');
            const partnerAura = document.getElementById('partner-touch-aura');
            expect(arena).not.toBeNull();
            expect(myAura).not.toBeNull();
            expect(partnerAura).not.toBeNull();
        });

        it('should handle broadcastTouchPosition call without errors', async () => {
            await expect(broadcastTouchPosition({ x: 0.5, y: 0.5, active: true })).resolves.not.toThrow();
        });
    });

    describe('2. Live Gym Cheering Engine', () => {
        it('should render cheering button in Rich Presence Hub when partner is in gym', () => {
            state.partnerPresenceActivity = 'Cvičí v Posilovně 🏋️‍♀️';
            renderRichPresenceHub();
            const container = document.getElementById('rich-presence-members-container');
            expect(container.innerHTML).toContain('Zafandit do série! 🔥');
        });

        it('should send gym cheer broadcast and show confirmation', async () => {
            await expect(sendGymCheer()).resolves.not.toThrow();
        });
    });

    describe('3. Spolu-studovna & Pomodoro Co-op Engine', () => {
        it('should broadcast study focus payload and show DND status in Rich Presence Hub', async () => {
            await broadcastStudyFocus({
                taskName: 'IZP: Projekt v C',
                status: 'focus',
                durationMinutes: 25,
                startedAt: Date.now()
            });

            state.partnerStudyFocus = {
                taskName: 'IZP: Projekt v C',
                status: 'focus',
                remainingMinutes: 24
            };

            renderRichPresenceHub();
            const container = document.getElementById('rich-presence-members-container');
            expect(container.innerHTML).toContain('Fokus: IZP: Projekt v C');
            expect(container.innerHTML).toContain('24m');
        });
    });
});
