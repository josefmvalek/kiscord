import { describe, it, expect, beforeEach, vi } from 'vitest';

// 1. Mock global state and dependencies
vi.mock('../../js/core/state.js', () => ({
  state: {
    settings: {
      soundEnabled: true,
    },
  },
}));

// 2. Setup standard mock objects for Web Audio API
const mockOscillator = {
  type: '',
  frequency: {
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  },
  connect: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
};

const mockGain = {
  gain: {
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  },
  connect: vi.fn(),
};

const mockFilter = {
  type: '',
  frequency: {
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  },
  Q: { value: 0 },
  connect: vi.fn(),
};

const mockBufferSource = {
  buffer: null,
  connect: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
};

const mockAudioContext = {
  state: 'suspended',
  currentTime: 0.1,
  sampleRate: 44100,
  resume: vi.fn().mockImplementation(function () {
    this.state = 'running';
  }),
  createOscillator: vi.fn().mockReturnValue(mockOscillator),
  createGain: vi.fn().mockReturnValue(mockGain),
  createBiquadFilter: vi.fn().mockReturnValue(mockFilter),
  createBuffer: vi.fn().mockReturnValue({
    getChannelData: vi.fn().mockReturnValue(new Float32Array(100)),
  }),
  createBufferSource: vi.fn().mockReturnValue(mockBufferSource),
  destination: {},
};

describe('Web Audio API Sound Effects', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset AudioContext on window
    window.AudioContext = vi.fn().mockImplementation(() => mockAudioContext);
    window.webkitAudioContext = undefined;
  });

  it('should successfully build AudioContext and play page flip rustling sound', async () => {
    const { playPageFlip } = await import('../../js/core/sound.js');

    // Enable sound
    const { state } = await import('../../js/core/state.js');
    state.settings.soundEnabled = true;

    playPageFlip();

    expect(window.AudioContext).toHaveBeenCalled();
    expect(mockAudioContext.createOscillator).toHaveBeenCalled();
    expect(mockAudioContext.createGain).toHaveBeenCalled();
    expect(mockAudioContext.createBiquadFilter).toHaveBeenCalled();
    expect(mockAudioContext.createBuffer).toHaveBeenCalled();
    expect(mockAudioContext.createBufferSource).toHaveBeenCalled();

    // Verify oscillator configurations
    expect(mockOscillator.type).toBe('triangle');
    expect(mockOscillator.start).toHaveBeenCalled();
    expect(mockOscillator.stop).toHaveBeenCalled();
  });

  it('should play clean crystal chime sound E6 -> A6 -> C#7 arpeggio', async () => {
    const { playChime } = await import('../../js/core/sound.js');
    
    // Clear calls count from previous test blocks
    mockAudioContext.createOscillator.mockClear();
    mockAudioContext.createGain.mockClear();

    playChime();

    // Chime schedules 3 separate notes
    expect(mockAudioContext.createOscillator).toHaveBeenCalledTimes(3);
    expect(mockAudioContext.createGain).toHaveBeenCalledTimes(3);
  });

  it('should not construct AudioContext or play sounds when settings soundEnabled is false', async () => {
    // Disable sound in state
    const { state } = await import('../../js/core/state.js');
    state.settings.soundEnabled = false;

    // Reset calls count
    window.AudioContext.mockClear();

    const { playChime } = await import('../../js/core/sound.js');
    playChime();

    expect(window.AudioContext).not.toHaveBeenCalled();
  });

  it('should gracefully degrade and not throw exceptions when AudioContext is missing in browser', async () => {
    // Simulate legacy or restrictive browser environment
    window.AudioContext = undefined;
    window.webkitAudioContext = undefined;

    const { playChime } = await import('../../js/core/sound.js');

    // Act & Assert: This must NOT throw any error
    expect(() => playChime()).not.toThrow();
  });
});
