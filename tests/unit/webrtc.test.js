import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../js/core/supabase.js', () => ({
    supabase: {
        channel: vi.fn(() => ({
            on: vi.fn().mockReturnThis(),
            subscribe: vi.fn().mockReturnThis(),
            send: vi.fn().mockResolvedValue({ data: null, error: null })
        }))
    }
}));

import { P2PConnectionManager } from '../../js/core/webrtc.js';

describe('WebRTC Peer-to-Peer Intimacy Channel', () => {
    let p2p;

    beforeEach(() => {
        p2p = new P2PConnectionManager();
    });

    it('P2PConnectionManager starts in disconnected state', () => {
        expect(p2p.state).toBe('disconnected');
    });

    it('DataChannel sending serializes messages correctly when open', () => {
        const mockChannel = {
            readyState: 'open',
            send: vi.fn(),
            close: vi.fn()
        };
        p2p.dataChannel = mockChannel;
        p2p.state = 'connected';

        const sent = p2p.sendHapticPulse(150, 200, 0.8);
        expect(sent).toBe(true);
        expect(mockChannel.send).toHaveBeenCalledTimes(1);

        const payload = JSON.parse(mockChannel.send.mock.calls[0][0]);
        expect(payload.type).toBe('hapticPulse');
        expect(payload.payload.x).toBe(150);
        expect(payload.payload.y).toBe(200);
        expect(payload.payload.intensity).toBe(0.8);
    });

    it('sendDrawStroke serializes draw points over data channel', () => {
        const mockChannel = {
            readyState: 'open',
            send: vi.fn(),
            close: vi.fn()
        };
        p2p.dataChannel = mockChannel;

        p2p.sendDrawStroke({ x: 50, y: 75, color: '#ff0000', size: 4 });
        expect(mockChannel.send).toHaveBeenCalledTimes(1);

        const data = JSON.parse(mockChannel.send.mock.calls[0][0]);
        expect(data.type).toBe('drawStroke');
        expect(data.payload.color).toBe('#ff0000');
    });

    it('Subscribing and receiving events dispatches to registered handlers', () => {
        const spy = vi.fn();
        const unsub = p2p.on('hapticPulse', spy);

        p2p._setupDataChannel({
            onopen: vi.fn(),
            onclose: vi.fn(),
            onmessage: vi.fn()
        });

        p2p._emit('hapticPulse', { x: 10, y: 20 });
        expect(spy).toHaveBeenCalledWith({ x: 10, y: 20 });

        unsub();
        p2p._emit('hapticPulse', { x: 30, y: 40 });
        expect(spy).toHaveBeenCalledTimes(1);
    });
});
