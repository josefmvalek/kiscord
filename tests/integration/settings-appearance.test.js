import { describe, it, expect, beforeEach, vi } from 'vitest';

// 1. Mock the core and utility dependencies
vi.mock('../../js/core/supabase.js', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('../../js/core/theme.js', () => ({
  changeTheme: vi.fn(),
  showNotification: vi.fn(),
  showConfirmDialog: vi.fn().mockResolvedValue(true),
}));

vi.mock('../../js/core/utils.js', () => ({
  triggerHaptic: vi.fn(),
  requestNotificationPermission: vi.fn().mockResolvedValue(true),
}));

vi.mock('../../js/core/notifications.js', () => ({
  triggerNotification: vi.fn(),
}));

vi.mock('../../js/core/auth.js', () => ({
  signOut: vi.fn(),
  isJosef: vi.fn().mockReturnValue(true),
}));

// Mock safeInsert for settings saving
vi.mock('../../js/core/offline.js', () => ({
  safeInsert: vi.fn().mockResolvedValue({ error: null }),
}));

// Setup default global state before importing modules
import { state } from '../../js/core/state.js';

// Import settings module
import { renderSettings } from '../../js/modules/settings.js';

describe('Settings & Appearance Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock global Notification object
    window.Notification = {
      permission: 'granted',
    };

    // Setup dummy DOM shell
    document.body.innerHTML = `
      <div id="app-interface">
        <div id="messages-container"></div>
      </div>
    `;

    // Initialize mock settings state
    state.currentUser = { id: 'jose-123', email: 'jozka@email.cz' };
    state.settings = {
      theme: 'default',
      glassmorphism: true,
      blurIntensity: 10,
      haptics: true,
      soundEnabled: true,
      dashboardWidgets: {
        health: true,
        supplements: false,
        quests: true,
      },
      notifications: {
        reminders: {
          water: { enabled: true, interval: 120, haptic: true, sound: false },
          pills: { enabled: true, time: '08:00', haptic: true, sound: true },
          bedtime: { enabled: true, time: '22:30', haptic: true, sound: false },
          iron: { enabled: false, time: '07:30', haptic: true, sound: true },
          zinc: { enabled: false, time: '13:00', haptic: true, sound: true },
          magnesium: { enabled: false, time: '21:00', haptic: true, sound: true },
        },
        partner: {
          sunlight: { enabled: true, haptic: true, sound: true },
          planning: { enabled: true, haptic: true, sound: true },
          dailyQuestions: { enabled: true, haptic: true, sound: true },
          letters: { enabled: true, haptic: true, sound: true },
          mood: { enabled: true, haptic: true, sound: true },
          sleep: { enabled: true, haptic: true, sound: true },
        },
      },
    };
  });

  it('should render the Settings panel structure into DOM correctly', () => {
    renderSettings();

    const header = document.querySelector('h1');
    expect(header).toBeDefined();
    expect(header.textContent).toContain('Nastavení');

    const themeGrid = document.querySelector('.grid');
    expect(themeGrid).toBeDefined();

    // Verify default options exist in HTML
    const content = document.getElementById('settings-dynamic-content');
    expect(content.innerHTML).toContain('Kiscord Dark');
    expect(content.innerHTML).toContain('Light Mode');
  });

  it('should change theme setting and invoke changeTheme helper when clicking theme option', async () => {
    const { changeTheme, showNotification } = await import('../../js/core/theme.js');
    const { triggerHaptic } = await import('../../js/core/utils.js');

    renderSettings();

    // Call updateThemeSetting handler
    window.updateThemeSetting('christmas');

    expect(state.settings.theme).toBe('christmas');
    expect(changeTheme).toHaveBeenCalledWith('christmas');
    expect(triggerHaptic).toHaveBeenCalledWith('medium');
    expect(showNotification).toHaveBeenCalledWith(expect.stringMatching(/christmas/i), 'success');
  });

  it('should toggle dashboard widgets accurately in state', () => {
    renderSettings();

    const switchElement = document.createElement('div');
    switchElement.innerHTML = `
      <div class="rounded-full bg-[#853ee6]"></div>
      <div class="absolute bg-white translate-x-5"></div>
    `;

    // Toggle supplements widget from false to true
    expect(state.settings.dashboardWidgets.supplements).toBe(false);
    window.toggleWidget('supplements', switchElement);
    expect(state.settings.dashboardWidgets.supplements).toBe(true);

    // Toggle health widget from true to false
    expect(state.settings.dashboardWidgets.health).toBe(true);
    window.toggleWidget('health', switchElement);
    expect(state.settings.dashboardWidgets.health).toBe(false);
  });
});
