import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockInvoke = vi.fn().mockResolvedValue({ data: { sent: 1 }, error: null });
const mockUpsert = vi.fn().mockResolvedValue({ error: null });

vi.mock('../../js/core/supabase.js', () => {
    return {
        supabase: {
            functions: {
                invoke: (...args) => mockInvoke(...args)
            },
            from: vi.fn(() => ({
                upsert: mockUpsert,
                insert: vi.fn().mockResolvedValue({ error: null }),
                select: vi.fn().mockResolvedValue({ data: [], error: null })
            }))
        }
    };
});

vi.mock('../../js/core/theme.js', () => {
    return {
        showNotification: vi.fn()
    };
});

vi.mock('../../js/core/utils.js', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        triggerHaptic: vi.fn(),
        sendLocalNotification: vi.fn()
    };
});

import { 
    initNotifications, 
    triggerNotification, 
    sendPushNotification, 
    sendPushToPartner 
} from '../../js/core/notifications.js';
import { state } from '../../js/core/state.js';
import { showNotification } from '../../js/core/theme.js';
import { triggerHaptic, sendLocalNotification } from '../../js/core/utils.js';

describe('Web Push Notification Engine', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        state.currentUser = { id: 'user-josef-123', name: 'Jožka' };
        state.user_ids = { jose: 'user-josef-123', klarka: 'user-klarka-456' };
        state.settings = {
            haptics: true,
            notifications: {
                partner: {
                    sunlight: { enabled: true, haptic: true, sound: true },
                    dailyQuestions: { enabled: true, haptic: true, sound: true }
                },
                system: {
                    quests: { enabled: true, haptic: true, sound: false }
                }
            }
        };
    });

    it('should trigger local notification and haptic feedback according to preferences', () => {
        triggerNotification('partner', 'sunlight', 'Posílá ti sluníčko! ☀️');

        expect(showNotification).toHaveBeenCalledWith('Posílá ti sluníčko! ☀️', 'success');
        expect(triggerHaptic).toHaveBeenCalledWith('heavy');
        expect(sendLocalNotification).toHaveBeenCalledWith('Posílá ti sluníčko! ☀️', expect.objectContaining({
            tag: 'sunlight',
            renotify: true
        }));
    });

    it('should respect disabled notification categories', () => {
        state.settings.notifications.partner.sunlight.enabled = false;

        triggerNotification('partner', 'sunlight', 'Posílá ti sluníčko! ☀️');

        expect(showNotification).not.toHaveBeenCalled();
        expect(sendLocalNotification).not.toHaveBeenCalled();
    });

    it('should invoke Supabase send-push Edge Function with formatted payload and deep link', async () => {
        const result = await sendPushNotification('user-klarka-456', {
            title: 'Kiscord ❓',
            body: 'Odpověděl jsem na otázku!',
            tag: 'daily-questions',
            channel: 'daily-questions'
        });

        expect(result).toBe(true);
        expect(mockInvoke).toHaveBeenCalledWith('send-push', {
            body: {
                userId: 'user-klarka-456',
                title: 'Kiscord ❓',
                body: 'Odpověděl jsem na otázku!',
                tag: 'daily-questions',
                url: '/?channel=daily-questions',
                channel: 'daily-questions'
            }
        });
    });

    it('should automatically resolve partner ID from state and dispatch push to partner', async () => {
        // Current user is Josef -> partner should be Klárka
        const result = await sendPushToPartner({
            title: 'Kiscord ☀️',
            body: 'Sluníčko pro tebe!',
            tag: 'sunlight',
            channel: 'dashboard'
        });

        expect(result).toBe(true);
        expect(mockInvoke).toHaveBeenCalledWith('send-push', {
            body: {
                userId: 'user-klarka-456',
                title: 'Kiscord ☀️',
                body: 'Sluníčko pro tebe!',
                tag: 'sunlight',
                url: '/?channel=dashboard',
                channel: 'dashboard'
            }
        });
    });

    it('should handle sendPushToPartner when user is Klarka and partner is Josef', async () => {
        state.currentUser = { id: 'user-klarka-456', name: 'Klárka' };

        const result = await sendPushToPartner({
            title: 'Kiscord 💌',
            body: 'Máš nový dopis!',
            tag: 'letters',
            channel: 'letters'
        });

        expect(result).toBe(true);
        expect(mockInvoke).toHaveBeenCalledWith('send-push', {
            body: {
                userId: 'user-josef-123',
                title: 'Kiscord 💌',
                body: 'Máš nový dopis!',
                tag: 'letters',
                url: '/?channel=letters',
                channel: 'letters'
            }
        });
    });
});
