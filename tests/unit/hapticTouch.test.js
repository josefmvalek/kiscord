import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../js/core/supabase.js', () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
      send: vi.fn()
    }))
  },
}));

vi.mock('../../js/core/sync.js', () => ({
  broadcastHapticPulse: vi.fn(),
  broadcastAmbientActivity: vi.fn()
}));

vi.mock('../../js/core/sound.js', () => ({
  playHeartbeat: vi.fn(),
  playChime: vi.fn()
}));

vi.mock('../../js/core/utils.js', () => ({
  triggerHaptic: vi.fn()
}));

import { HAPTIC_PRESETS, sendHapticPreset, handleIncomingHapticPulse } from '../../js/domains/couple/haptic-touch.js';
import { broadcastHapticPulse } from '../../js/core/sync.js';
import { playHeartbeat } from '../../js/core/sound.js';
import { state } from '../../js/core/state.js';

describe('Haptic Touch & Remote Heartbeat System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.currentUser = { name: 'Jožka', email: 'jozka@kiscord.app' };
    state.settings = { haptics: true };
    // Mock navigator.vibrate
    global.navigator.vibrate = vi.fn();
  });

  it('should define valid romance haptic presets with intervals', () => {
    expect(HAPTIC_PRESETS.length).toBeGreaterThanOrEqual(4);
    HAPTIC_PRESETS.forEach(preset => {
      expect(preset.id).toBeDefined();
      expect(Array.isArray(preset.pattern)).toBe(true);
      expect(preset.pattern.length).toBeGreaterThan(0);
    });
  });

  it('should trigger broadcast when sending a preset pattern', async () => {
    await sendHapticPreset('heartbeat');
    expect(playHeartbeat).toHaveBeenCalled();
    expect(broadcastHapticPulse).toHaveBeenCalledWith(expect.objectContaining({
      type: 'preset',
      presetId: 'heartbeat',
      pattern: expect.any(Array)
    }));
  });

  it('should trigger audio and vibration on incoming haptic pulse', () => {
    const pulsePayload = {
      pattern: [100, 200, 100],
      name: 'Tlukot Srdce',
      senderName: 'Klárka'
    };

    handleIncomingHapticPulse(pulsePayload);
    expect(playHeartbeat).toHaveBeenCalled();
    expect(global.navigator.vibrate).toHaveBeenCalledWith([100, 200, 100]);
  });
});
