/**
 * Test Data Builders & Object Mother Factories for Kiscord
 * Provides typed, consistent, immutable fixtures for unit and integration testing.
 */

export function createTestUser(overrides = {}) {
    return {
        id: 'user-jose-123',
        email: 'jozkavalek@email.cz',
        name: 'Jožka',
        username: 'Jožka',
        role: 'authenticated',
        ...overrides
    };
}

export function createTestPartner(overrides = {}) {
    return {
        id: 'user-klarka-456',
        email: 'vyslouzilova.klara07@gmail.com',
        name: 'Klárka',
        username: 'Klárka',
        role: 'authenticated',
        ...overrides
    };
}

export function createTestShift(overrides = {}) {
    return {
        id: 'shift-mock-1',
        user_id: 'user-jose-123',
        date_key: '2026-08-26',
        shift_type: 'ranni',
        time_start: '06:00',
        time_end: '14:00',
        note: '',
        ...overrides
    };
}

export function createTestGymExercise(overrides = {}) {
    return {
        id: 'bench_press',
        name: 'Bench Press',
        category: 'Hrudník',
        is_default: true,
        ...overrides
    };
}

export function createTestGymLog(overrides = {}) {
    return {
        id: 'gym-log-1',
        name: 'Push Day 🦍',
        date_key: '2026-08-26',
        duration_seconds: 3600,
        exercises: [
            {
                exercise_id: 'bench_press',
                exercise_name: 'Bench Press',
                sets: [
                    { weight: 80, reps: 8, completed: true }
                ]
            }
        ],
        ...overrides
    };
}

export function createTestPlannedDate(overrides = {}) {
    return {
        id: 'date-1',
        name: 'Večeře při svíčkách 🍷',
        date_key: '2026-08-28',
        time: '19:00',
        category: 'dinner',
        checklist: [
            { text: 'Rezervace stolu', done: true },
            { text: 'Květina pro Klárku', done: false }
        ],
        ...overrides
    };
}

export function createTestCoupon(overrides = {}) {
    return {
        id: 'coupon-1',
        title: 'Masáž zad & šíje 💆',
        description: '30 minut relaxační masáže s levandulovým olejem.',
        cost: 50,
        icon: '💆',
        category: 'wellness',
        status: 'available',
        owner_id: 'user-jose-123',
        ...overrides
    };
}

export function createTestQuest(overrides = {}) {
    return {
        id: 'quest-1',
        title: '💶 Spořiví Mývalové',
        description: 'Vydělejte společně 5000 EUR na brigádě.',
        icon: '💶',
        goal: 5000,
        unit: 'EUR',
        type: 'austria_euro',
        is_active: true,
        ...overrides
    };
}

export function createTestMovie(overrides = {}) {
    return {
        id: 'mov-interstellar',
        title: 'Interstellar',
        genre: 'Sci-Fi',
        rating: 5,
        icon: '🚀',
        ...overrides
    };
}

/**
 * Resets the application state to a clean, isolated default state for tests.
 *
 * @param {Object} state - The global state object from js/core/state.js
 * @param {Object} [customOverrides={}] - Custom state properties to override
 * @returns {Object} The updated state object
 */
export function resetTestState(state, customOverrides = {}) {
    const defaultState = {
        currentUser: createTestUser(),
        user_ids: {
            jose: 'user-jose-123',
            klarka: 'user-klarka-456'
        },
        currentChannel: 'general',
        currentServer: 'home',
        loveCoins: { jose: 100, klarka: 100 },
        levels: { jose: { level: 5, xp: 450 }, klarka: { level: 5, xp: 450 } },
        shifts: {},
        plannedDates: {},
        healthData: {},
        gymLogs: [],
        gymPRs: [],
        gymExercises: [
            createTestGymExercise({ id: 'bench_press', name: 'Bench Press', category: 'Hrudník' }),
            createTestGymExercise({ id: 'squat', name: 'Dřep s činkou', category: 'Nohy' }),
            createTestGymExercise({ id: 'deadlift', name: 'Mrtvý tah', category: 'Záda' })
        ],
        gymTemplates: [],
        scheduleItems: [],
        schoolDeadlines: [],
        timelineEvents: [],
        library: { movies: [], series: [] },
        watchlist: [],
        cycleLogs: [],
        cycleSettings: { average_cycle_length: 28 },
        coupons: [],
        quests: []
    };

    Object.assign(state, defaultState, customOverrides);
    return state;
}
