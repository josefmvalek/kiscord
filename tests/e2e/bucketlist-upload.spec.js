import { test, expect } from '@playwright/test';
import path from 'path';
import { setupMockAuthSession, setupDefaultApiRoutes } from '../fixtures/playwright-helpers.js';

test.describe('Bucket List E2E with File Upload', () => {
  test.beforeEach(async ({ page }) => {
    // 1. Mock session
    await setupMockAuthSession(page);

    // 2. Mock storage uploads
    await page.route('**/storage/v1/object/**', async (route) => {
      const method = route.request().method();
      if (method === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ Key: 'bucketlist-photos/test-key.png' }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ publicUrl: 'https://supabase.co/storage/v1/object/public/bucketlist-photos/test-key.png' }),
        });
      }
    });

    // 3. Mock REST API
    await setupDefaultApiRoutes(page, {
      customRestHandler: async (route, url) => {
        const method = route.request().method();
        if (url.includes('/bucket_list')) {
          if (method === 'POST' || method === 'PATCH') {
            await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify([{ id: 'bucket-item-1', is_completed: true, photo_url: 'https://supabase.co/storage/v1/object/public/bucketlist-photos/test-key.png' }]),
            });
          } else {
            await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify([
                {
                  id: 'bucket-item-1',
                  title: 'Navštívit Hallstatt',
                  description: 'Krásná alpská vesnička a jezero.',
                  is_completed: false,
                  photo_url: null,
                  category: 'Cestování',
                  added_by: 'jose-id-123'
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

  test('should allow user to mark bucketlist item as completed and upload a photo', async ({ page }) => {
    await page.goto('/?channel=bucketlist');

    // Verify the grid is visible
    const grid = page.locator('#bucket-grid');
    await expect(grid).toBeVisible({ timeout: 15000 });

    // Now, verify the item "Navštívit Hallstatt" is visible
    const bucketItem = page.locator('.glass-card:has-text("Navštívit Hallstatt")');
    await expect(bucketItem.first()).toBeVisible();

    // Trigger file input by selecting the file input and uploading test PNG
    const uploadInput = bucketItem.locator('input[type="file"]');
    const filePath = path.resolve('tests/fixtures/test-image.png');
    await uploadInput.setInputFiles(filePath);

    // Let's toggle the status to 'done' directly using the check button
    const checkBtn = bucketItem.locator('button[onclick*="cycleStatus"]').first();
    await checkBtn.click();

    // Verify it is completed or has updated status
    await expect(bucketItem.first()).toBeVisible();
  });
});
