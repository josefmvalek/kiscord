import { describe, it, expect, beforeEach, vi } from 'vitest';
import { state } from '../../js/core/state.js';
import { getSelectedTopicId, setSelectedTopicId, getActiveTopicObject, setActiveTopicObject } from '../../js/domains/couple/topics/state.js';
import { openTopic, nextQuestion, prevQuestion, markQuestionDone, toggleQuestionBookmark } from '../../js/domains/couple/topics/player.js';

vi.mock('../../js/core/supabase.js', () => ({
    supabase: {
        from: vi.fn(() => ({
            update: vi.fn().mockReturnThis(),
            delete: vi.fn().mockReturnThis(),
            match: vi.fn(() => Promise.resolve({ data: null, error: null })),
            eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
        }))
    }
}));

vi.mock('../../js/core/offline.js', () => ({
    safeUpsert: vi.fn(() => Promise.resolve())
}));

vi.mock('../../js/core/theme.js', () => ({
    showNotification: vi.fn(),
    showConfirmDialog: vi.fn(() => Promise.resolve(true))
}));

describe('Conversation Topics Sub-Modules (js/modules/topics/)', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
        state.currentUser = { id: 'user-josef', name: 'Jožka' };
        state.conversationTopics = [
            {
                id: 'deep',
                title: 'Hluboké otázky',
                icon: '🌌',
                color: '#5865F2',
                desc: 'O smyslu a snech',
                questions: [
                    'Co je tvůj největší sen?',
                    'Jaká je tvá nejcennější vzpomínka?',
                    'Co pro tebe znamená štěstí?'
                ]
            }
        ];
        state.topicProgress = {};
        state.topicSessionHistory = [];
        setSelectedTopicId(null);
        setActiveTopicObject(null);
    });

    describe('State Management (state.js)', () => {
        it('should get and set selected topic id and active topic object', () => {
            expect(getSelectedTopicId()).toBeNull();
            setSelectedTopicId('deep');
            expect(getSelectedTopicId()).toBe('deep');

            setActiveTopicObject(state.conversationTopics[0]);
            expect(getActiveTopicObject().title).toBe('Hluboké otázky');
        });
    });

    describe('Topics Player (player.js)', () => {
        it('should open topic and initialize question player', () => {
            openTopic('deep');
            expect(state.currentTopicId).toBe('deep');
            expect(getActiveTopicObject().id).toBe('deep');
            expect(state.topicSessionHistory.length).toBeGreaterThan(0);
        });

        it('should cycle questions with next and prev', () => {
            openTopic('deep');
            const firstIndex = state.currentQuestionIndex;

            nextQuestion();
            expect(state.topicSessionHistory.length).toBeGreaterThanOrEqual(1);

            prevQuestion();
            expect(state.currentQuestionIndex).toBe(firstIndex);
        });

        it('should bookmark and unbookmark questions', () => {
            openTopic('deep');
            const qIndex = state.currentQuestionIndex;

            toggleQuestionBookmark();
            expect(state.topicProgress['deep'].bookmarks).toContain(qIndex);

            toggleQuestionBookmark();
            expect(state.topicProgress['deep'].bookmarks).not.toContain(qIndex);
        });

        it('should mark question as done and advance to next available', () => {
            openTopic('deep');
            const initialIndex = state.currentQuestionIndex;

            markQuestionDone();
            expect(state.topicProgress['deep'].doneIndices).toContain(initialIndex);
        });
    });
});
