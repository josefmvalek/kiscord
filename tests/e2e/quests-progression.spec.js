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

        if (url.includes('/austrian_vocab') || url.includes('/matura_flashcards_stats')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            headers: {
              'content-range': '*/0',
            },
            body: '',
          });
          return true;
        }

        if (url.includes('/rpc/get_all_quest_stats')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              sum_water: 10,
              both_sleep: 5,
              count_bucket: 2,
              count_shared_movement: 3,
              count_shared_mood_high: 4,
              count_new_timeline: 1,
              count_completed_dates: 2,
              count_sunlight_sent: 5,
              sum_tetris_score: 1000,
              count_daily_questions: 10,
            }),
          });
          return true;
        }
        return false;
      }
    });
  });

  test('should render active quests and allow admin to create a new quest', async ({ page }) => {
    test.setTimeout(45000);
    await page.goto('/?channel=quests');

    // Check logged in
    await expect(page.locator('#sidebar-user-name')).toHaveText('Jožka');

    // Verify grid loaded
    const grid = page.locator('#quests-grid');
    await expect(grid).toBeVisible({ timeout: 25000 });
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
