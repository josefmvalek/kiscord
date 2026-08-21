import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../js/core/supabase.js', () => {
    return {
        supabase: {
            from: vi.fn(() => ({
                upsert: vi.fn().mockResolvedValue({ error: null }),
                insert: vi.fn().mockResolvedValue({ error: null }),
                select: vi.fn().mockResolvedValue({ data: [], error: null })
            }))
        }
    };
});

vi.mock('../../js/core/theme.js', () => {
    return {
        showNotification: vi.fn(),
        toggleTheme: vi.fn()
    };
});

import { getAllSearchableItems } from '../../js/core/commandPalette.js';
import { renderSkeletonLoader, renderMetricCard } from '../../js/core/ui.js';

describe('UI Kit 2.0 & Skeleton Loader Engine', () => {
    it('should generate valid channel skeleton HTML with shimmer classes', () => {
        const html = renderSkeletonLoader({ type: 'channel', count: 4 });
        expect(html).toContain('kiscord-skeleton');
        expect(html).toContain('kiscord-skeleton-shimmer');
        expect(html).toContain('kiscord-skeleton-card');
    });

    it('should generate valid list skeleton HTML', () => {
        const html = renderSkeletonLoader({ type: 'list', count: 3 });
        expect(html).toContain('kiscord-skeleton-avatar');
        expect(html).toContain('kiscord-skeleton-shimmer');
    });

    it('should render standardized Bento Metric Card with trend and icon', () => {
        const cardHtml = renderMetricCard({
            title: 'Dnešní Voda',
            value: '2.5',
            unit: 'litru',
            trend: 15,
            trendLabel: 'oproti včerejšku',
            icon: '💧',
            color: '#00aff4'
        });

        expect(cardHtml).toContain('Dnešní Voda');
        expect(cardHtml).toContain('2.5');
        expect(cardHtml).toContain('litru');
        expect(cardHtml).toContain('15% oproti včerejšku');
        expect(cardHtml).toContain('kiscord-bento-card');
        expect(cardHtml).toContain('#00aff4');
    });
});

describe('Command Palette Quick Actions & Fuzzy Search', () => {
    beforeEach(() => {
        window.__channelCategories = [
            {
                name: '🌿 ZDRAVÍ & FITNESS',
                items: [
                    { id: 'gym-tracker', name: 'posilovna', desc: 'Logování tréninků', color: '#faa61a' },
                    { id: 'habits', name: 'návyky', desc: 'Sledování denních návyků', color: '#3ba55c' }
                ]
            },
            {
                name: '🎮 ZÁBAVA & MÉDIA',
                items: [
                    { id: 'library', name: 'knihovna', desc: 'Filmy a seriály', color: '#5865F2' }
                ]
            }
        ];
    });

    it('should aggregate quick actions and all registered channels', () => {
        const items = getAllSearchableItems();
        expect(items.length).toBeGreaterThanOrEqual(5);

        const waterAction = items.find(i => i.id === 'action-water');
        expect(waterAction).toBeDefined();
        expect(waterAction.type).toBe('action');

        const gymChannel = items.find(i => i.id === 'gym-tracker');
        expect(gymChannel).toBeDefined();
        expect(gymChannel.title).toBe('posilovna');
        expect(gymChannel.type).toBe('channel');
    });
});

describe('Mobile Gestures & Tiered Haptic Profiles (Phase M1)', () => {
    it('should trigger appropriate vibration patterns for tiered haptic profiles', async () => {
        const { triggerHaptic } = await import('../../js/core/utils.js');
        const vibrateSpy = vi.fn();
        navigator.vibrate = vibrateSpy;

        // Simulate user interaction to unlock haptics
        document.dispatchEvent(new Event('click'));

        triggerHaptic('selection');
        expect(vibrateSpy).toHaveBeenCalledWith(8);

        triggerHaptic('light');
        expect(vibrateSpy).toHaveBeenCalledWith(15);

        triggerHaptic('medium');
        expect(vibrateSpy).toHaveBeenCalledWith(30);

        triggerHaptic('success');
        expect(vibrateSpy).toHaveBeenCalledWith([15, 40, 25]);

        triggerHaptic('pr_record');
        expect(vibrateSpy).toHaveBeenCalledWith([30, 50, 40, 50, 60]);

        triggerHaptic('warning');
        expect(vibrateSpy).toHaveBeenCalledWith([40, 60, 40]);
    });

    it('should initialize swipeable list item with action containers', async () => {
        const { initSwipeableListItem } = await import('../../js/core/app-ui.js');
        const container = document.createElement('div');
        const content = document.createElement('div');
        content.textContent = 'Ranní rozcvička';
        container.appendChild(content);
        document.body.appendChild(container);

        initSwipeableListItem(container, {
            onSwipeRight: vi.fn(),
            onSwipeLeft: vi.fn(),
            rightLabel: 'Splněno',
            leftLabel: 'Smazat'
        });

        expect(container.classList.contains('kiscord-swipeable-container')).toBe(true);
        expect(content.classList.contains('kiscord-swipeable-content')).toBe(true);
        expect(container.querySelector('.kiscord-swipe-action-left')).not.toBeNull();
        expect(container.querySelector('.kiscord-swipe-action-right')).not.toBeNull();
    });

    it('should toggle mobile FAB sheet visibility and rotation', async () => {
        const { toggleMobileFab } = await import('../../js/core/app-ui.js');
        const sheet = document.createElement('div');
        sheet.id = 'mobile-fab-sheet';
        sheet.className = 'hidden';
        const icon = document.createElement('i');
        icon.id = 'mobile-fab-icon';
        document.body.appendChild(sheet);
        document.body.appendChild(icon);

        toggleMobileFab();
        expect(sheet.classList.contains('hidden')).toBe(false);
        expect(sheet.classList.contains('flex')).toBe(true);

        toggleMobileFab();
        expect(sheet.classList.contains('hidden')).toBe(true);
    });

    it('should mark next uncompleted set as completed when logCurrentMiniBarSet is called', async () => {
        const { logCurrentMiniBarSet } = await import('../../js/core/router.js');
        const mockWorkout = {
            name: 'Push Day',
            exercises: [
                {
                    name: 'Bench Press',
                    sets: [
                        { completed: true, weight: 80, reps: 8 },
                        { completed: false, weight: 80, reps: 8 }
                    ]
                }
            ]
        };
        localStorage.setItem('kiscord_active_workout', JSON.stringify(mockWorkout));

        logCurrentMiniBarSet();

        const updated = JSON.parse(localStorage.getItem('kiscord_active_workout'));
        expect(updated.exercises[0].sets[1].completed).toBe(true);
        expect(updated.isRestTimerRunning).toBe(true);

        // Calling logCurrentMiniBarSet again during active rest should SKIP the rest, NOT log a new set or reset timer
        logCurrentMiniBarSet();
        const afterSkip = JSON.parse(localStorage.getItem('kiscord_active_workout'));
        expect(afterSkip.isRestTimerRunning).toBe(false);
        expect(afterSkip.restTimeRemaining).toBe(0);
    });

    it('should adjust weight on all non-completed sets via adjustActiveExerciseWeight', async () => {
        const { adjustActiveExerciseWeight } = await import('../../js/modules/gym/activeWorkout.js');
        const mockWorkout = {
            name: 'Leg Day',
            startTime: new Date().toISOString(),
            exercises: [
                {
                    name: 'Squat',
                    sets: [
                        { completed: true, weight: 100, reps: 5 },
                        { completed: false, weight: 100, reps: 5 },
                        { completed: false, weight: 100, reps: 5 }
                    ]
                }
            ]
        };
        localStorage.setItem('kiscord_active_workout', JSON.stringify(mockWorkout));

        adjustActiveExerciseWeight(0, 2.5);

        const updated = JSON.parse(localStorage.getItem('kiscord_active_workout'));
        // Completed set unchanged
        expect(updated.exercises[0].sets[0].weight).toBe(100);
        // Non-completed sets updated
        expect(updated.exercises[0].sets[1].weight).toBe(102.5);
        expect(updated.exercises[0].sets[2].weight).toBe(102.5);
    });

    it('should show global-workout-mini-bar when active workout exists and user switches to another channel', async () => {
        const { updateGlobalWorkoutMiniBar } = await import('../../js/core/router.js');
        const { state } = await import('../../js/core/state.js');

        const bar = document.createElement('div');
        bar.id = 'global-workout-mini-bar';
        bar.className = 'hidden';
        document.body.appendChild(bar);

        const mockWorkout = {
            name: 'Chest & Triceps',
            startTime: new Date().toISOString(),
            exercises: []
        };
        localStorage.setItem('kiscord_active_workout', JSON.stringify(mockWorkout));

        // When viewing gym-tracker -> hidden
        state.currentChannel = 'gym-tracker';
        updateGlobalWorkoutMiniBar();
        expect(bar.classList.contains('hidden')).toBe(true);

        // When viewing dashboard -> visible!
        state.currentChannel = 'dashboard';
        updateGlobalWorkoutMiniBar();
        expect(bar.classList.contains('hidden')).toBe(false);
        expect(bar.classList.contains('flex')).toBe(true);

        // When workout cleared -> hidden
        localStorage.removeItem('kiscord_active_workout');
        updateGlobalWorkoutMiniBar();
        expect(bar.classList.contains('hidden')).toBe(true);
    });
});




