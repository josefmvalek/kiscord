/**
 * Shared Playwright E2E Test Helpers & Session Fixtures
 * Eliminates 30+ lines of duplicate boilerplate per E2E spec.
 */

/**
 * Creates a mock JWT token string for Supabase auth bypass in Playwright.
 *
 * @param {Object} user
 * @returns {string} Signed JWT mock
 */
export function makeMockJWT(user) {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({
        sub: user.id,
        email: user.email,
        role: user.role || 'authenticated',
        exp: Math.floor(Date.now() / 1000) + 3600,
    }));
    return `${header}.${payload}.mocksignature`;
}

/**
 * Injects authenticated Supabase session into page's localStorage before any scripts run.
 *
 * @param {import('@playwright/test').Page} page
 * @param {Object} [userOverrides={}]
 */
export async function setupMockAuthSession(page, userOverrides = {}) {
    const user = {
        id: 'jose-id-123',
        email: 'jozkavalek@email.cz',
        role: 'authenticated',
        ...userOverrides
    };

    await page.addInitScript((userData) => {
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

        const session = {
            access_token: makeMockJWT(userData),
            token_type: 'bearer',
            expires_in: 3600,
            refresh_token: 'fake-refresh-token',
            user: userData,
            expires_at: Math.floor(Date.now() / 1000) + 3600,
        };

        window.localStorage.setItem('sb-nnrorazsiyiedwomgidf-auth-token', JSON.stringify(session));
    }, user);
}

/**
 * Configures default Supabase REST and Auth routes for Playwright tests.
 *
 * @param {import('@playwright/test').Page} page
 * @param {Object} [options={}]
 * @param {Object} [options.user]
 * @param {Function} [options.customRestHandler]
 */
export async function setupDefaultApiRoutes(page, { user, customRestHandler } = {}) {
    const defaultUser = {
        id: 'jose-id-123',
        email: 'jozkavalek@email.cz',
        role: 'authenticated',
        aud: 'authenticated',
        ...user
    };

    // 1. Intercept Auth User endpoint
    await page.route('**/auth/v1/user*', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(defaultUser),
        });
    });

    // 2. Intercept Profiles endpoint by default
    await page.route('**/rest/v1/**', async (route) => {
        const url = route.request().url();

        if (customRestHandler) {
            const handled = await customRestHandler(route, url);
            if (handled) return;
        }

        if (url.includes('/profiles')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([
                    { id: 'jose-id-123', email: 'jozkavalek@email.cz', username: 'Jožka' },
                    { id: 'klarka-id-456', email: 'vyslouzilova.klara07@gmail.com', username: 'Klárka' },
                ]),
            });
        } else {
            const isHead = route.request().method() === 'HEAD';
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                headers: {
                    'content-range': '0-0/0',
                },
                body: isHead ? undefined : '[]',
            });
        }
    });
}
