import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    CleanupCollector,
    wrapLegacyModule,
    setActiveMount,
    getActiveMount,
    unmountActiveModule
} from '../../js/core/module-lifecycle.js';

describe('Module Lifecycle & Memory Management', () => {
    beforeEach(() => {
        unmountActiveModule();
    });

    it('CleanupCollector executes all callbacks in LIFO order', () => {
        const order = [];
        const collector = new CleanupCollector();

        collector.add(() => order.push('first'));
        collector.add(() => order.push('second'));
        collector.add(() => order.push('third'));

        collector.run();

        expect(order).toEqual(['third', 'second', 'first']);
    });

    it('CleanupCollector automatically handles DOM listeners and intervals', () => {
        const collector = new CleanupCollector();
        const element = document.createElement('div');
        const spyListener = vi.fn();

        collector.addEventListener(element, 'click', spyListener);
        element.click();
        expect(spyListener).toHaveBeenCalledTimes(1);

        collector.run();
        element.click();
        expect(spyListener).toHaveBeenCalledTimes(1);
    });

    it('wrapLegacyModule converts classic render export into AppModule', async () => {
        const legacyMock = {
            renderGym: vi.fn(),
            cleanup: vi.fn()
        };

        const wrapped = wrapLegacyModule(legacyMock, 'gym-tracker');
        expect(typeof wrapped.mount).toBe('function');
        expect(typeof wrapped.unmount).toBe('function');

        const container = document.createElement('div');
        await wrapped.mount(container);
        expect(legacyMock.renderGym).toHaveBeenCalledWith(container, undefined);

        wrapped.unmount();
        expect(legacyMock.cleanup).toHaveBeenCalled();
    });

    it('unmountActiveModule properly runs module unmount and cleanup collector', () => {
        const unmountSpy = vi.fn();
        const collectorSpy = vi.fn();
        const collector = new CleanupCollector();
        collector.add(collectorSpy);

        const mockAppModule = {
            mount: vi.fn(),
            unmount: unmountSpy
        };

        setActiveMount('test-channel', mockAppModule, collector);
        expect(getActiveMount()?.id).toBe('test-channel');

        unmountActiveModule();
        expect(unmountSpy).toHaveBeenCalledTimes(1);
        expect(collectorSpy).toHaveBeenCalledTimes(1);
        expect(getActiveMount()).toBeNull();
    });
});
