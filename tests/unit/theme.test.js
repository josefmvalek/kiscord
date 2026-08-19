import { describe, it, expect, beforeEach, vi } from 'vitest';
import { changeTheme, initTheme, toggleTheme } from '../../js/core/theme.js';

describe('Theme Engine (All 7 Themes)', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
    document.body.className = '';
  });

  const allThemes = [
    'default',
    'light',
    'valentines',
    'christmas',
    'tetris',
    'forest',
    'gold'
  ];

  it('should switch correctly to each of the 7 themes and update both html and body', () => {
    allThemes.forEach(theme => {
      changeTheme(theme);

      if (theme === 'default') {
        expect(document.documentElement.classList.contains('theme-default')).toBe(false);
        expect(document.documentElement.className).toBe('');
      } else {
        expect(document.documentElement.classList.contains(`theme-${theme}`)).toBe(true);
        expect(document.body.classList.contains(`theme-${theme}`)).toBe(true);
      }
      expect(localStorage.getItem('klarka_theme')).toBe(theme);
    });
  });

  it('should cycle through all 7 themes when toggleTheme is called', () => {
    localStorage.setItem('klarka_theme', 'default');
    
    const expectedCycle = ['light', 'valentines', 'christmas', 'tetris', 'forest', 'gold', 'default'];
    
    expectedCycle.forEach(expected => {
      toggleTheme();
      expect(localStorage.getItem('klarka_theme')).toBe(expected);
      if (expected !== 'default') {
        expect(document.documentElement.classList.contains(`theme-${expected}`)).toBe(true);
      }
    });
  });

  it('should initialize theme from localStorage correctly', () => {
    localStorage.setItem('klarka_theme', 'gold');
    initTheme();
    expect(document.documentElement.classList.contains('theme-gold')).toBe(true);
    expect(document.body.classList.contains('theme-gold')).toBe(true);
  });
});
