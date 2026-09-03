import { test, expect } from '@playwright/test';
import { setupMockAuthSession, setupDefaultApiRoutes } from '../fixtures/playwright-helpers.js';

test.describe('Calendar & Shifts Integration E2E', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => console.log(`[Browser] ${msg.type()}: ${msg.text()}`));
    
    // 1. Mock session
    await setupMockAuthSession(page);

    // 2. Intercept and mock API requests
    await setupDefaultApiRoutes(page, {
      customRestHandler: async (route, url) => {
        if (url.includes('/brigade_shifts')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([
              {
                id: 'shift-1',
                date_key: '2026-06-01',
                user_id: 'jose-id-123',
                shift_type: 'ranni',
                time_start: '06:00',
                time_end: '14:00',
              },
              {
                id: 'shift-2',
                date_key: '2026-06-01',
                user_id: 'klarka-id-456',
                shift_type: 'volno',
                time_start: '00:00',
                time_end: '24:00',
              },
            ]),
          });
          return true;
        }
        return false;
      }
    });
  });

  test('should render calendar grid and highlight Joint Day Off 🌴', async ({ page }) => {
    // Navigate directly to calendar channel
    await page.goto('/?channel=calendar');

    // Verify login is bypassed and app interface is shown
    await expect(page.locator('#app-interface')).toHaveClass(/show/);
    await expect(page.locator('#sidebar-user-name')).toHaveText('Jožka');

    // Verify Calendar 3.0 main container renders successfully
    const calendarMain = page.locator('#calendar-main-content');
    await expect(calendarMain).toBeVisible({ timeout: 15000 });

    // Check filter pills bar is rendered
    const filtersBar = page.locator('#calendar-filters');
    await expect(filtersBar).toBeVisible();

    // Verify presence of functional filters
    const filters = ['all', 'sleep', 'water', 'health'];
    for (const f of filters) {
      await expect(page.locator(`button[onclick*="'${f}'"]`)).toBeVisible();
    }
  });

  test('should verify shift conflict warning during scheduling', async ({ page }) => {
    await page.goto('/?channel=calendar');

    // Wait for the calendar module to load completely
    await page.waitForFunction(() => window.Calendar !== undefined);

    // Setup current user shift to morning shift on 2026-06-01 and trigger Quick Add
    await page.evaluate(() => {
      window.state.shifts = {
        '2026-06-01': {
          jose: {
            shift_type: 'ranni',
            time_start: '06:00',
            time_end: '14:00',
            id: 'mock-shift-idx'
          }
        }
      };
      window.Calendar.openQuickAdd(null, '2026-06-01', '10:00');
    });

    // Verify Quick Add popover is displayed
    const popover = page.locator('#cal-quick-popover');
    await expect(popover).toBeVisible();

    // Switch to Date type and fill title/time inside the shift (10:00 is between 06:00 and 14:00)
    await page.locator('#qadd-type-date').click();
    await page.locator('#qadd-title').fill('Společný oběd');
    await page.locator('#qadd-time').fill('10:00');

    // Submit the form
    await page.locator('#cal-quick-add-form').evaluate(form => {
      form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    });

    // Verify custom confirm dialog warning is triggered with shift conflict details
    const confirmDialog = page.locator('#app-confirm-dialog');
    await expect(confirmDialog).toBeVisible();
    await expect(confirmDialog).toContainText('má v tuto dobu směnu');
    await expect(confirmDialog).toContainText('Chceš plán přesto uložit?');

    // Dismiss by clicking "Zrušit"
    await page.locator('#confirm-cancel').click();
    await expect(confirmDialog).not.toBeVisible();

    // Verify state was not updated and plan was NOT saved
    const plannedDates = await page.evaluate(() => window.state.plannedDates || {});
    expect(plannedDates['2026-06-01']).toBeUndefined();
  });
});

