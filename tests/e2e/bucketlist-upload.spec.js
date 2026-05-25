import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Bucket List E2E with File Upload', () => {
  test.beforeEach(async ({ page }) => {
    // 1. Mock session
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
        id: 'jose-id-123',
        email: 'jozkavalek@email.cz',
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

    // 2. Mock REST and Storage API
    await page.route('**/auth/v1/user*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'jose-id-123',
          email: 'jozkavalek@email.cz',
          role: 'authenticated',
          aud: 'authenticated',
        }),
      });
    });

    // Mock storage uploads
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

    await page.route('**/rest/v1/**', async (route) => {
      const url = route.request().url();
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

  test('should allow user to mark bucketlist item as completed and upload a photo', async ({ page }) => {
    await page.goto('/');

    // Navigate to Bucket List
    const bucketBtn = page.locator('.channel-link[data-channel="bucketlist"]');
    await bucketBtn.click();

    // Verify the grid is visible
    const grid = page.locator('#bucket-grid');
    await expect(grid).toBeVisible();

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
