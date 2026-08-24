import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    createSignal,
    createEffect,
    createComputed,
    batch,
    bindText,
    bindClass,
    bindAttr
} from '../../js/core/signals.js';

describe('Ultralight Reactive Signals Engine', () => {
    it('createSignal returns getter and setter and triggers effects on change', () => {
        const [count, setCount] = createSignal(0);
        const effectSpy = vi.fn();

        createEffect(() => {
            effectSpy(count());
        });

        expect(effectSpy).toHaveBeenCalledWith(0);
        expect(effectSpy).toHaveBeenCalledTimes(1);

        setCount(1);
        expect(effectSpy).toHaveBeenCalledWith(1);
        expect(effectSpy).toHaveBeenCalledTimes(2);

        // Setting same value should NOT trigger effect
        setCount(1);
        expect(effectSpy).toHaveBeenCalledTimes(2);
    });

    it('createComputed derives values with auto-memoization', () => {
        const [firstName, setFirstName] = createSignal('Josef');
        const [lastName, setLastName] = createSignal('Válek');

        const fullName = createComputed(() => `${firstName()} ${lastName()}`);
        expect(fullName()).toBe('Josef Válek');

        setFirstName('Jozka');
        expect(fullName()).toBe('Jozka Válek');
    });

    it('batch groups multiple signal mutations into a single effect execution', () => {
        const [a, setA] = createSignal(1);
        const [b, setB] = createSignal(2);
        const effectSpy = vi.fn();

        createEffect(() => {
            effectSpy(a() + b());
        });

        expect(effectSpy).toHaveBeenCalledTimes(1);

        batch(() => {
            setA(10);
            setB(20);
        });

        expect(effectSpy).toHaveBeenCalledTimes(2);
        expect(effectSpy).toHaveBeenLastCalledWith(30);
    });

    it('DOM bindings (bindText, bindClass, bindAttr) reactively update element nodes', () => {
        const div = document.createElement('div');
        const [water, setWater] = createSignal(4);
        const [isHydrated, setIsHydrated] = createSignal(false);
        const [status, setStatus] = createSignal('active');

        const unsubText = bindText(div, () => `${water()} sklenic`);
        const unsubClass = bindClass(div, 'highlight', isHydrated);
        const unsubAttr = bindAttr(div, 'data-status', status);

        expect(div.textContent).toBe('4 sklenic');
        expect(div.classList.contains('highlight')).toBe(false);
        expect(div.getAttribute('data-status')).toBe('active');

        setWater(8);
        setIsHydrated(true);
        setStatus('completed');

        expect(div.textContent).toBe('8 sklenic');
        expect(div.classList.contains('highlight')).toBe(true);
        expect(div.getAttribute('data-status')).toBe('completed');

        unsubText();
        unsubClass();
        unsubAttr();
    });
});
