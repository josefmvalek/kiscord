import { test, expect } from '@playwright/test';

test.describe('Milostné dopisy - Časový zámek E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Mock partner Klárka session in localStorage
    await page.addInitScript(() => {
      const makeMockJWT = (usr) => {
        const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
        const payload = btoa(JSON.stringify({
          sub: usr.id,
          email: usr.email,
          role: usr.role || 'authenticated',
          exp: Math.floor(Date.now() / 1000) + 3600,
        }));
        return `${header}.${payload}.mocksignature`;
      };
      
      const user = {
        id: 'klarka-id-456',
        email: 'vyslouzilova.klara07@gmail.com',
        role: 'authenticated',
      };
      
      const session = {
        access_token: makeMockJWT(user),
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'fake-refresh-token',
        user: user,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      };

      window.localStorage.setItem('sb-nnrorazsiyiedwomgidf-auth-token', JSON.stringify(session));
    });

    // Mock API requests
    await page.route('**/auth/v1/user*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'klarka-id-456',
          email: 'vyslouzilova.klara07@gmail.com',
          role: 'authenticated',
          aud: 'authenticated',
        }),
      });
    });

    await page.route('**/rest/v1/**', async (route) => {
      const url = route.request().url();

      const mockLetters = [
        {
          id: 'letter-locked-1',
          sender_id: 'jose-id-123',
          recipient_id: 'klarka-id-456',
          title: 'Dopis k narozeninám',
          content: 'Tohle je tajný, budoucí vzkaz plný lásky!',
          unlock_at: '2030-06-01T12:00:00.000Z',
          is_read: false,
          image_url: null,
          created_at: new Date().toISOString(),
        },
        {
          id: 'letter-unlocked-2',
          sender_id: 'jose-id-123',
          recipient_id: 'klarka-id-456',
          title: 'První společný den',
          content: 'Vítej na brigádě! Užijeme si to spolu.',
          unlock_at: '2020-05-20T12:00:00.000Z',
          is_read: false,
          image_url: null,
          created_at: new Date().toISOString(),
        },
      ];

      if (url.includes('/love_letters')) {
        // Single-record fetch (openLetter uses .eq('id', id) -> ?id=eq.<id>)
        const idMatch = url.match(/[?&]id=eq\.([^&]+)/);
        if (idMatch) {
          const found = mockLetters.find(l => l.id === idMatch[1]);
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(found ? [found] : []),
          });
        } else {
          // List fetch (renderLetters)
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(mockLetters),
          });
        }
      } else if (url.includes('/profiles')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            { id: 'jose-id-123', email: 'jozkavalek@email.cz', username: 'Jožka' },
            { id: 'klarka-id-456', email: 'vyslouzilova.klara07@gmail.com', username: 'Klárka' },
          ]),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: '[]',
        });
      }
    });
  });

  test('should verify future locked letters are not readable and past letters are openable', async ({ page }) => {
    await page.goto('/');

    // Navigate to Letters channel
    const lettersBtn = page.locator('.channel-link[data-channel="letters"]');
    await lettersBtn.click();

    // Wait for letters content area to appear (app needs to boot + render inbox)
    const contentArea = page.locator('#letters-content-area');
    await expect(contentArea).toBeVisible({ timeout: 10000 });

    // The grid contains direct child divs — each one is a letter card.
    // Use filter() to precisely target the card containing the title text.
    const letterCards = contentArea.locator('div.grid.gap-2 > div');

    const lockedCard = letterCards.filter({ hasText: 'Dopis k narozeninám' });
    await expect(lockedCard).toBeVisible({ timeout: 8000 });

    // Assert locked letter shows the lock indicator text "Odemkne se"
    await expect(lockedCard).toContainText('Odemkne se');

    // Clicking a locked card should NOT navigate to detail view
    await lockedCard.click();
    // The content area should still be present (not replaced by detail view)
    await expect(contentArea).toBeVisible();

    // Past dated letter must be unlocked and openable
    const unlockedCard = letterCards.filter({ hasText: 'První společný den' });
    await expect(unlockedCard).toBeVisible({ timeout: 8000 });

    // It should NOT contain "Odemkne se"
    await expect(unlockedCard).not.toContainText('Odemkne se');

    // Click to open the unlocked letter
    await unlockedCard.click();

    // Detail view should appear with letter content
    await expect(page.locator('#messages-container')).toContainText('Vítej na brigádě!', { timeout: 8000 });

    // Back button (fa-arrow-left) should be visible in detail view
    const backBtn = page.locator('button:has(.fa-arrow-left)').first();
    await expect(backBtn).toBeVisible();
    await backBtn.click();

    // After going back, inbox should be visible again
    await expect(contentArea).toBeVisible({ timeout: 8000 });
  });
});
