import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
    KEY_CHANNELS, 
    CATEGORIES, 
    FLYWHEEL_NODES, 
    GUIDE_ITEMS, 
    SHORTCUTS, 
    FAQS, 
    VOUCHER_PRICES 
} from '../../js/domains/system/manual/data.js';
import { 
    getExploredChannels, 
    recordChannelExploration, 
    calculateExplorationStats 
} from '../../js/domains/system/manual/state.js';
import { renderGuideItemCard } from '../../js/domains/system/manual/templates.js';

describe('Manual Module Decomposition & Logic', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    describe('Exploration Tracking', () => {
        it('should return default explored channels when localStorage is empty', () => {
            const explored = getExploredChannels();
            expect(explored).toContain('manual');
            expect(explored).toContain('dashboard');
        });

        it('should record new channel explorations without duplicates', () => {
            recordChannelExploration('gym-tracker');
            const explored = getExploredChannels();
            expect(explored).toContain('gym-tracker');

            // Record same again
            recordChannelExploration('gym-tracker');
            const afterDuplicate = getExploredChannels();
            expect(afterDuplicate.filter(c => c === 'gym-tracker').length).toBe(1);
        });

        it('should calculate exploration percentage accurately', () => {
            const stats = calculateExplorationStats();
            expect(stats.total).toBe(KEY_CHANNELS.length);
            expect(stats.pct).toBeGreaterThan(0);
            expect(stats.remaining).toBe(KEY_CHANNELS.length - stats.explored.length);
        });
    });

    describe('Data Integrity', () => {
        it('should have all 7 predefined categories with valid IDs and colors', () => {
            expect(CATEGORIES.length).toBe(7);
            expect(CATEGORIES.map(c => c.id)).toEqual(['all', 'core', 'vut', 'gym', 'love', 'media', 'system']);
        });

        it('should contain all 5 Flywheel nodes with valid colors and icons', () => {
            expect(FLYWHEEL_NODES.length).toBe(5);
            FLYWHEEL_NODES.forEach(node => {
                expect(node.id).toBeDefined();
                expect(node.title).toBeDefined();
                expect(node.color).toMatch(/^#[0-9a-fA-F]{6}$/);
            });
        });

        it('should define guide items with required fields and valid categories', () => {
            expect(GUIDE_ITEMS.length).toBeGreaterThan(10);
            GUIDE_ITEMS.forEach(item => {
                expect(item.id).toBeDefined();
                expect(item.title).toBeDefined();
                expect(item.channelId).toBeDefined();
                expect(item.summary).toBeDefined();
                expect(Array.isArray(item.bullets)).toBe(true);
            });
        });

        it('should define FAQs with question and answer pairs', () => {
            expect(FAQS.length).toBeGreaterThanOrEqual(5);
            FAQS.forEach(faq => {
                expect(faq.q.length).toBeGreaterThan(5);
                expect(faq.a.length).toBeGreaterThan(10);
            });
        });

        it('should define voucher prices with positive costs', () => {
            expect(VOUCHER_PRICES.length).toBeGreaterThanOrEqual(6);
            VOUCHER_PRICES.forEach(v => {
                expect(v.cost).toBeGreaterThan(0);
            });
        });
    });

    describe('Card Template Rendering', () => {
        it('should render guide card HTML with title, channel and bullets', () => {
            const item = GUIDE_ITEMS[0];
            const html = renderGuideItemCard(item);

            expect(html).toContain(item.title);
            expect(html).toContain(item.channelName);
            expect(html).toContain(item.summary);
            expect(html).toContain("jumpToChannel");
        });
    });
});
