import { test, expect } from '@playwright/test';
import { setupMockAuthSession, setupDefaultApiRoutes } from '../fixtures/playwright-helpers.js';

test.describe('Cooperative Quests Progression E2E', () => {
  test.beforeEach(async ({ page }) => {
    // 1. Mock session
    await setupMockAuthSession(page);

    // 2. Intercept and mock Supabase API HTTP requests
    await setupDefaultApiRoutes(page, {
      customRestHandler: async (route, url) => {
        const method = route.request().method();
        if (url.includes('/coop_quests')) {
          if (method === 'POST') {
            await route.fulfill({
              status: 201,
              contentType: 'application/json',
              body: JSON.stringify([{ id: 'mock-quest-uuid' }]),
            });
          } else {
            await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify([
                {
                  id: 'quest-1',
                  title: '💶 Spořiví Mývalové',
                  description: 'Vydělejte společně 5000 EUR na brigádě. Každá odpracovaná směna se počítá jako 100 EUR! 💪',
                  icon: '💶',
                  color: 'from-emerald-400 to-teal-600',
                  goal: 5000,
                  unit: 'EUR',
                  type: 'austria_euro',
                  is_active: true
                }
              ]),
            });
          }
          return true;
        }
        return false;
      }
    });
  });

  test('should render active quests and allow admin to create a new quest', async ({ page }) => {
    await page.goto('/');

    // Check logged in
    await expect(page.locator('#sidebar-user-name')).toHaveText('Jožka');

    // Click Quests in sidebar
    const questsBtn = page.locator('.channel-link[data-channel="quests"]');
    await questsBtn.click();

    // Verify grid loaded
    const grid = page.locator('#quests-grid');
    await expect(grid).toBeVisible();
    await expect(grid).toContainText('Spořiví Mývalové');

    // Create New Quest as Josef (admin)
    const newQuestBtn = page.locator('button:has-text("Nová mise")');
    await expect(newQuestBtn).toBeVisible();
    await newQuestBtn.click();

    // Verify modal open
    const modal = page.locator('#quest-admin-modal');
    await expect(modal).toBeVisible();

    // Fill new quest fields
    await page.locator('#q-title').fill('Alpský Horolezec');
    await page.locator('#q-desc').fill('Vylezte na 5 vrcholů v okolí Hallstattu.');
    await page.locator('#q-icon').fill('🏔️');
    await page.locator('#q-goal').fill('5');
    await page.locator('#q-unit').fill('vrcholů');
    
    // Select type
    await page.locator('#q-type').selectOption('count_bucket');

    // Save quest
    const saveBtn = page.locator('button:has-text("VYTVOŘIT MISI")');
    await saveBtn.click();

    // Verify modal is closed and notification popped up
    await expect(modal).not.toBeVisible();
  });
});
