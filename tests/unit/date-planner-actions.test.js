import { describe, it, expect, beforeEach, vi } from 'vitest';
import { state } from '../../js/core/state.js';
import { 
    openDateMatcher, 
    handleMatcherSwipe, 
    pickRandomFromMatcher, 
    quickScheduleMatchedDate 
} from '../../js/domains/lifestyle/date-planner/planner-actions/matcher.js';
import { 
    showAddLocationModal, 
    saveNewLocation, 
    editLocation, 
    saveEditedLocation, 
    deleteLocation 
} from '../../js/domains/lifestyle/date-planner/planner-actions/location-crud.js';
import { 
    selectLocation, 
    closeLocationDetail, 
    rateDate, 
    saveDateToCalendar, 
    pickRandomLocation, 
    jumpToLocation 
} from '../../js/domains/lifestyle/date-planner/planner-actions/location-detail.js';

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

vi.mock('../../js/core/sound.js', () => ({
    playChime: vi.fn(),
    playPageFlip: vi.fn()
}));

describe('Date Planner Actions & Module Resilience', () => {
    beforeEach(() => {
        document.body.innerHTML = '<div id="detail-panel" class="translate-y-[130%]"></div><div id="planner-sidebar"></div>';
        state.currentUser = { id: 'user-jose', name: 'Jožka' };
        state.dateLocations = [
            { id: 1, name: 'Petřínská rozhledna', cat: 'view', country: 'CZ', lat: 50.083, lng: 14.395, desc: 'Krásný výhled na Prahu' },
            { id: 2, name: 'Café Savoy', cat: 'food', country: 'CZ', lat: 50.081, lng: 14.407, desc: 'Výborná káva a dortíky' },
            { id: 3, name: 'Schmittenhöhe', cat: 'view', country: 'AT', lat: 47.329, lng: 12.738, desc: 'Alpský výhled Zell am See' }
        ];
        state.dateRatings = {};
        state.plannedDates = {};
        state.timelineEvents = [];
        vi.clearAllMocks();
    });

    describe('Date Matcher (matcher.js)', () => {
        it('should initialize matcher deck and render matcher modal for CZ locations', () => {
            openDateMatcher('all');
            const modal = document.getElementById('rande-matcher-modal');
            expect(modal).not.toBeNull();
            expect(modal.innerHTML).toContain('Rande Matcher');
        });

        it('should handle swipe right (liked) and show celebration modal', () => {
            openDateMatcher('all');
            handleMatcherSwipe(true);
            const matchModal = document.getElementById('match-celebration-modal');
            expect(matchModal).not.toBeNull();
            expect(matchModal.innerHTML).toContain('IT\'S A DATE MATCH!');
        });

        it('should quick schedule matched date to calendar state', async () => {
            await quickScheduleMatchedDate(1, '2026-09-01', '19:00');
            expect(state.plannedDates['2026-09-01']).toBeDefined();
            expect(state.plannedDates['2026-09-01'].name).toBe('Petřínská rozhledna');
            expect(state.plannedDates['2026-09-01'].time).toBe('19:00');
        });
    });

    describe('Location Detail & Ratings (location-detail.js)', () => {
        it('should open and populate detail panel on selectLocation', () => {
            selectLocation(1);
            const panel = document.getElementById('detail-panel');
            expect(panel.classList.contains('translate-y-0')).toBe(true);
            expect(panel.innerHTML).toContain('Petřínská rozhledna');
        });

        it('should close detail panel on closeLocationDetail', () => {
            selectLocation(1);
            closeLocationDetail();
            const panel = document.getElementById('detail-panel');
            expect(panel.classList.contains('translate-y-[130%]')).toBe(true);
        });

        it('should save date rating without errors', async () => {
            await rateDate(1, 5);
            expect(state.dateRatings[1]).toBe(5);
        });

        it('should pick a random location in current country', () => {
            pickRandomLocation();
            const panel = document.getElementById('detail-panel');
            expect(panel.classList.contains('translate-y-0')).toBe(true);
        });
    });

    describe('Location CRUD (location-crud.js)', () => {
        it('should open add location modal', () => {
            showAddLocationModal();
            const modal = document.getElementById('location-add-modal');
            expect(modal).not.toBeNull();
        });

        it('should open edit location modal for existing location', () => {
            editLocation(1);
            const modal = document.getElementById('location-edit-modal');
            expect(modal).not.toBeNull();
            expect(modal.innerHTML).toContain('Petřínská rozhledna');
        });

        it('should delete location and update state', async () => {
            await deleteLocation(1);
            expect(state.dateLocations.find(l => l.id === 1)).toBeUndefined();
        });
    });
});
