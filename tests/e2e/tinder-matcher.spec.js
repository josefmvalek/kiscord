import { test, expect } from '@playwright/test';

test.describe('Realtime Tinder Matcher E2E', () => {
  let jozkaContext;
  let klarkaContext;
  let jozkaPage;
  let klarkaPage;
  let mockDbWatchlist;

  test.beforeEach(async ({ browser }) => {
    // 1. Launch two separate contexts to simulate two different users
    jozkaContext = await browser.newContext();
    klarkaContext = await browser.newContext();

    jozkaPage = await jozkaContext.newPage();
    klarkaPage = await klarkaContext.newPage();

    jozkaPage.on('console', msg => console.log(`[Browser Jožka] ${msg.type()}: ${msg.text()}`));
    klarkaPage.on('console', msg => console.log(`[Browser Klárka] ${msg.type()}: ${msg.text()}`));

    // 2. Setup localStorage session for Jožka
    await jozkaPage.addInitScript(() => {
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

    // 3. Setup localStorage session for Klárka
    await klarkaPage.addInitScript(() => {
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

    // 4. Intercept API calls for both pages to return movies and watchlists
    const mockLibraryMovies = [
      {
        id: 42,
        title: 'Matrix',
        type: 'movie',
        poster_path: null,
        icon: '🎬',
        rating: 9.2,
        release_year: 1999,
        runtime: 136,
        mood_tags: ['Sci-Fi', 'Akční'],
      },
    ];

    // Shared database state for watchlists in memory to simulate server
    mockDbWatchlist = [];

    const configureRoutes = async (page, myId) => {
      // Mock auth getUser
      await page.route('**/auth/v1/user*', async (route) => {
        const userEmail = myId === 'jose-id-123' ? 'jozkavalek@email.cz' : 'vyslouzilova.klara07@gmail.com';
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: myId,
            email: userEmail,
            role: 'authenticated',
            aud: 'authenticated',
          }),
        });
      });

      // Mock REST queries
      await page.route('**/rest/v1/**', async (route) => {
        const url = route.request().url();
        const method = route.request().method();

        if (url.includes('/library_content')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(mockLibraryMovies),
          });
        } else if (url.includes('/profiles')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([
              { id: 'jose-id-123', email: 'jozkavalek@email.cz', username: 'Jožka' },
              { id: 'klarka-id-456', email: 'vyslouzilova.klara07@gmail.com', username: 'Klárka' },
            ]),
          });
        } else if (url.includes('/library_watchlist')) {
          if (method === 'POST') {
            const payload = JSON.parse(route.request().postData() || '{}');
            mockDbWatchlist.push({
              media_id: payload.media_id,
              added_by: myId,
              type: payload.type,
            });
            await route.fulfill({
              status: 201,
              contentType: 'application/json',
              body: JSON.stringify([{ id: 'mock-watchlist-idx' }]),
            });
          } else {
            await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify(mockDbWatchlist),
            });
          }
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: '[]',
          });
        }
      });
    };

    await configureRoutes(jozkaPage, 'jose-id-123');
    await configureRoutes(klarkaPage, 'klarka-id-456');

    // 5. Connect the broadcast messages in real-time between pages via Playwright bindings!
    // When window.supabase.channel().send(...) is called, we capture it and dispatch it to the other page!
    await jozkaPage.exposeFunction('playwrightBroadcastMatch', async (media) => {
      await klarkaPage.evaluate((m) => {
        window.dispatchEvent(
          new CustomEvent('tinder-match-received', {
            detail: { from: 'jose-id-123', media: m },
          })
        );
      }, media);
    });

    await klarkaPage.exposeFunction('playwrightBroadcastMatch', async (media) => {
      await jozkaPage.evaluate((m) => {
        window.dispatchEvent(
          new CustomEvent('tinder-match-received', {
            detail: { from: 'klarka-id-456', media: m },
          })
        );
      }, media);
    });

    // Inject a shim for mainChannel.send in both pages
    const injectChannelShim = async (page) => {
      await page.addInitScript(() => {
        let rawSupabase = undefined;
        Object.defineProperty(window, 'supabase', {
          get() {
            return rawSupabase;
          },
          set(val) {
            rawSupabase = val;
            if (rawSupabase && typeof rawSupabase.channel === 'function') {
              const originalChannel = rawSupabase.channel;
              rawSupabase.channel = function (name) {
                const chan = originalChannel.call(rawSupabase, name);
                const originalSend = chan.send;
                chan.send = function (payload) {
                  if (payload.event === 'tinder-match') {
                    // Forward via our Playwright binding
                    window.playwrightBroadcastMatch(payload.payload.media);
                  }
                  return originalSend.call(chan, payload);
                };
                return chan;
              };
            }
          },
          configurable: true,
        });
      });
    };

    await injectChannelShim(jozkaPage);
    await injectChannelShim(klarkaPage);
  });

  test.afterEach(async () => {
    await jozkaContext.close();
    await klarkaContext.close();
  });

  test('should synchronize matches in real time between partners', async () => {
    // 1. Open both pages
    await jozkaPage.goto('/');
    await klarkaPage.goto('/');

    // Check we are logged in
    await expect(jozkaPage.locator('#sidebar-user-name')).toHaveText('Jožka');
    await expect(klarkaPage.locator('#sidebar-user-name')).toHaveText('Klárka');

    // 2. Both navigate to Watchlist -> Tinder
    const jozkaLibrary = jozkaPage.locator('.channel-link[data-channel="watchlist"]');
    await jozkaLibrary.click();
    const jozkaTinderBtn = jozkaPage.locator('button[onclick*="startTinder"]');
    await jozkaTinderBtn.click();

    const klarkaLibrary = klarkaPage.locator('.channel-link[data-channel="watchlist"]');
    await klarkaLibrary.click();
    const klarkaTinderBtn = klarkaPage.locator('button[onclick*="startTinder"]');
    await klarkaTinderBtn.click();

    // Wait for the NetflixMatcher module to load completely on both pages
    await jozkaPage.waitForFunction(() => window.NetflixMatcher !== undefined);
    await klarkaPage.waitForFunction(() => window.NetflixMatcher !== undefined);

    // Switch both to discovery mode so the general library movie (Matrix) is swipable
    await jozkaPage.locator('#mode-discovery').click();
    await klarkaPage.locator('#mode-discovery').click();

    // Check Tinder loaded on both
    await expect(jozkaPage.locator('#tinder-active-card')).toBeVisible();
    await expect(klarkaPage.locator('#tinder-active-card')).toBeVisible();

    await expect(jozkaPage.locator('#tinder-active-card')).toContainText('Matrix');
    await expect(klarkaPage.locator('#tinder-active-card')).toContainText('Matrix');

    // 3. Jožka swipes Matrix RIGHT (Like ❤️)
    // We simulate clicking the heart button using the exact button selector
    const jozkaLikeBtn = jozkaPage.locator('button[onclick*="swipeRight"]');
    await jozkaLikeBtn.click();

    // Wait for the like to be recorded in mock database
    await expect.poll(() => mockDbWatchlist.length).toBe(1);

    // Assert that Jožka does NOT see match screen yet (Klárka hasn't liked it)
    await expect(jozkaPage.locator('#tinder-match-overlay')).not.toBeVisible();

    // 4. Klárka switches to watchlist mode so she pulls Jožka's like and matches Matrix
    await klarkaPage.locator('#mode-watchlist').click();

    // Check that Matrix is the active card in watchlist mode
    await expect(klarkaPage.locator('#tinder-active-card')).toContainText('Matrix');

    // Klárka swipes Matrix RIGHT (Like ❤️)
    const klarkaLikeBtn = klarkaPage.locator('button[onclick*="swipeRight"]');
    await klarkaLikeBtn.click();

    // 5. Assert that BOTH pages immediately display the golden "MÁME SHODU! 💖" winner screen in real-time!
    await expect(klarkaPage.locator('#tinder-match-overlay')).toBeVisible();
    await expect(klarkaPage.locator('#tinder-match-overlay')).toContainText('MÁME SHODU! 💖');
    await expect(klarkaPage.locator('#tinder-match-overlay')).toContainText('Matrix');

    // Jožka should also have received the match broadcast and show the overlay!
    await expect(jozkaPage.locator('#tinder-match-overlay')).toBeVisible();
    await expect(jozkaPage.locator('#tinder-match-overlay')).toContainText('MÁME SHODU! 💖');
    await expect(jozkaPage.locator('#tinder-match-overlay')).toContainText('Matrix');
  });
});
