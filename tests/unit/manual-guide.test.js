import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
    renderManual, 
    CATEGORIES, 
    GUIDE_ITEMS, 
    SHORTCUTS, 
    FAQS, 
    FLYWHEEL_NODES,
    VOUCHER_PRICES,
    KEY_CHANNELS,
    recordChannelExploration
} from '../../js/domains/system/manual/index.js';

describe('Manual Channel & Interactive Guide Module (#návod)', () => {
    beforeEach(() => {
        localStorage.clear();
        document.body.innerHTML = `
            <div id="messages-container"></div>
        `;
        vi.restoreAllMocks();
    });

    it('should export all metadata structures and data contracts', () => {
        expect(Array.isArray(CATEGORIES)).toBe(true);
        expect(CATEGORIES.length).toBeGreaterThanOrEqual(6);

        expect(Array.isArray(GUIDE_ITEMS)).toBe(true);
        expect(GUIDE_ITEMS.length).toBeGreaterThanOrEqual(10);

        expect(Array.isArray(FLYWHEEL_NODES)).toBe(true);
        expect(FLYWHEEL_NODES.length).toBe(5);

        expect(Array.isArray(SHORTCUTS)).toBe(true);
        expect(SHORTCUTS.length).toBeGreaterThanOrEqual(4);

        expect(Array.isArray(FAQS)).toBe(true);
        expect(FAQS.length).toBeGreaterThanOrEqual(4);

        expect(Array.isArray(VOUCHER_PRICES)).toBe(true);
        expect(Array.isArray(KEY_CHANNELS)).toBe(true);
    });

    it('should render hero, flywheel, simulators, cards, shortcuts and FAQ in messages-container', () => {
        renderManual();
        const container = document.getElementById('messages-container');
        expect(container).not.toBeNull();

        // Check Hero
        expect(container.textContent).toContain('Jak funguje Kiscord');
        expect(container.textContent).toContain('Interaktivní Portál Kiscord');

        // Check Flywheel Ecosystem Map
        expect(container.textContent).toContain('The Kiscord Flywheel');
        expect(container.textContent).toContain('1. Zdraví & Disciplína');
        expect(container.textContent).toContain('2. Love Coins & XP');
        expect(container.textContent).toContain('3. Mývalí Tržnice');

        // Check Simulators area
        expect(container.textContent).toContain('Interaktivní Pískoviště');
        expect(container.textContent).toContain('Love Coins kalkulačka');

        // Check Search & Category pills
        const searchInput = document.getElementById('manual-search-input');
        expect(searchInput).not.toBeNull();

        // Check Guide Cards Container
        const cardsContainer = document.getElementById('manual-cards-container');
        expect(cardsContainer).not.toBeNull();
        expect(cardsContainer.children.length).toBe(GUIDE_ITEMS.length);

        // Check Shortcuts & FAQs
        expect(container.textContent).toContain('Klávesové zkratky & Gesta');
        expect(container.textContent).toContain('Často kladené otázky (FAQ)');
    });

    it('should filter cards by perspective (Klarka, Jozka, Couple)', () => {
        renderManual();

        // Klárka perspective
        window.manualGuide.setPerspective('klarka');
        let expectedKlarka = GUIDE_ITEMS.filter(item => !item.perspectives || item.perspectives.includes('klarka'));
        expect(document.getElementById('manual-cards-container').children.length).toBe(expectedKlarka.length);

        // Jožka perspective
        window.manualGuide.setPerspective('jozka');
        let expectedJozka = GUIDE_ITEMS.filter(item => !item.perspectives || item.perspectives.includes('jozka'));
        expect(document.getElementById('manual-cards-container').children.length).toBe(expectedJozka.length);

        // Couple perspective
        window.manualGuide.setPerspective('couple');
        let expectedCouple = GUIDE_ITEMS.filter(item => !item.perspectives || item.perspectives.includes('couple'));
        expect(document.getElementById('manual-cards-container').children.length).toBe(expectedCouple.length);

        // Reset to all
        window.manualGuide.setPerspective('all');
        expect(document.getElementById('manual-cards-container').children.length).toBe(GUIDE_ITEMS.length);
    });

    it('should filter cards when clicking a Flywheel node', () => {
        renderManual();

        // Select node-health
        window.manualGuide.selectFlywheelNode('node-health');
        let coreItems = GUIDE_ITEMS.filter(item => item.category === 'core');
        expect(document.getElementById('manual-cards-container').children.length).toBe(coreItems.length);

        // Deselect node
        window.manualGuide.selectFlywheelNode('node-health');
        expect(document.getElementById('manual-cards-container').children.length).toBe(GUIDE_ITEMS.length);
    });

    it('should calculate Love Coins and affordable vouchers reactively in the simulator', () => {
        renderManual();
        window.manualGuide.setSimulatorTab('coins');

        // Initial default calculation (water: 8 -> 5, habits: 3 -> 6, gym: 1 -> 10, question: 1 -> 3 = 24 LC)
        const resultEl = document.getElementById('sim-coins-result');
        expect(resultEl.textContent).toContain('+24 LC');

        // Update habits to 5 (+10) and water to 0
        window.manualGuide.updateSimCoins('water', 0);
        window.manualGuide.updateSimCoins('habits', 5);
        expect(resultEl.textContent).toContain('+23 LC');
    });

    it('should simulate offline queue, item accumulation, and flush queue with feedback', () => {
        vi.useFakeTimers();
        renderManual();
        window.manualGuide.setSimulatorTab('offline');

        // Simulate going offline
        window.manualGuide.simToggleOffline(false);
        expect(document.getElementById('sim-network-badge').textContent).toContain('Offline');

        // Add 2 offline actions
        window.manualGuide.simAddOfflineAction();
        window.manualGuide.simAddOfflineAction();
        expect(document.getElementById('sim-offline-body').textContent).toContain('Položek ve frontě: 2');

        // Reconnect network
        window.manualGuide.simToggleOffline(true);
        expect(document.getElementById('sim-network-badge').textContent).toContain('Online');

        // Flush queue
        window.manualGuide.simFlushQueue();
        expect(document.getElementById('sim-offline-body').textContent).toContain('Odesílám');

        vi.advanceTimersByTime(1000);
        expect(document.getElementById('sim-offline-body').textContent).toContain('Položek ve frontě: 0');
        vi.useRealTimers();
    });

    it('should update sunflower preview expressions in sandbox', () => {
        renderManual();
        window.manualGuide.setSimulatorTab('sunflower');

        const visual = document.getElementById('sim-sunflower-visual');
        expect(visual.textContent).toContain('Nálada: 8/10');
        expect(visual.textContent).toContain('vzhůru');

        // Set mood to 4 and sleeping
        window.manualGuide.updateSimSunflower('mood', 4);
        window.manualGuide.updateSimSunflower('sleep', true);
        expect(visual.textContent).toContain('Nálada: 4/10');
        expect(visual.textContent).toContain('Partner právě spí');
    });

    it('should track explored channels and calculate exploration percentage', () => {
        recordChannelExploration('gym-tracker');
        recordChannelExploration('schedule');
        
        renderManual();
        const container = document.getElementById('messages-container');
        expect(container.textContent).toContain('Kiscord Průzkumník');
        expect(container.textContent).toContain('Navštíveno:');
    });

    it('should search and filter cards based on keywords in real time', () => {
        renderManual();

        window.manualGuide.handleSearch({ target: { value: 'slunečnice' } });
        let cards = document.getElementById('manual-cards-container').children;
        expect(cards.length).toBeGreaterThan(0);
        expect(document.getElementById('manual-cards-container').textContent).toContain('Můj Den & Slunečnice');

        window.manualGuide.handleSearch({ target: { value: 'nonexistenttermxyz999' } });
        expect(document.getElementById('manual-cards-container').textContent).toContain('Nebyly nalezeny žádné výsledky');

        window.manualGuide.clearSearch();
        expect(document.getElementById('manual-cards-container').children.length).toBe(GUIDE_ITEMS.length);
    });

    it('should expand and collapse FAQ accordion items', () => {
        renderManual();

        const ans0 = document.getElementById('faq-ans-0');
        const icon0 = document.getElementById('faq-icon-0');
        expect(ans0.classList.contains('hidden')).toBe(true);

        window.manualGuide.toggleFaq(0);
        expect(ans0.classList.contains('hidden')).toBe(false);
        expect(icon0.classList.contains('rotate-180')).toBe(true);

        window.manualGuide.toggleFaq(0);
        expect(ans0.classList.contains('hidden')).toBe(true);
        expect(icon0.classList.contains('rotate-180')).toBe(false);
    });

    it('should trigger jumpToChannel with exploration recording and switchChannel call', () => {
        const switchSpy = vi.fn();
        window.switchChannel = switchSpy;

        renderManual();
        window.manualGuide.jumpToChannel('gym-tracker');

        expect(switchSpy).toHaveBeenCalledWith('gym-tracker');
        const raw = localStorage.getItem('kiscord_explored_channels');
        expect(raw).toContain('gym-tracker');
    });
});
