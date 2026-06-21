import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// Helper to register an account
async function register(page: Page, email: string, password: string, username: string) {
  await page.goto('/');
  await page.click('button:has-text("Login / Register")');
  await page.click('button:has-text("Create Account")');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.fill('input[placeholder="What should we call you?"]', username);
  await page.click('button:has-text("Create Account")');
  await expect(page.locator('text=Quiz Lobby').first()).toBeVisible();
}

async function loginAsGuest(page: Page, username: string) {
  await page.goto('/');
  await page.click('button:has-text("Play as Guest")');
  await page.fill('input[placeholder="Enter guest name"]', username);
  await page.click('button:has-text("Continue as Guest")');
  await expect(page.locator('text=Quiz Lobby').first()).toBeVisible();
}

test.describe('Multiplayer Join Flow', () => {
  test('Registered host and registered joiner', async ({ browser }) => {
    test.setTimeout(60000); // 60s since we poll for 30s
    
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    // Context A: Register and create room
    await register(pageA, 'host1@example.com', 'Password123!', 'HostPlayer');
    await pageA.click('button:has-text("Host a Room")');
    await expect(pageA.locator('text=Waiting for players...').first()).toBeVisible();
    
    // Extract room code
    const roomCodeText = await pageA.locator('.font-heading-lg').innerText();
    expect(roomCodeText).toContain('QR-');
    const rawCode = roomCodeText.replace('QR-', '').trim();

    // Context B: Register and join room
    await register(pageB, 'joiner1@example.com', 'Password123!', 'JoinerPlayer');
    await pageB.fill('input[placeholder="Enter 4-letter code"]', rawCode);
    await pageB.click('button:has-text("Join Room")');

    // Assert both see each other
    await expect(pageA.locator('text=JoinerPlayer').first()).toBeVisible();
    await expect(pageB.locator('text=HostPlayer').first()).toBeVisible();

    // Wait 30 seconds to ensure no one gets kicked to auth
    // We can do this by just waiting 30s and checking they are still in the lobby
    await pageA.waitForTimeout(30000);
    await expect(pageA.locator('text=Waiting for players...').first()).toBeVisible();
    await expect(pageB.locator('text=Waiting for Host...').first()).toBeVisible();

    // Host starts game
    await pageA.click('button:has-text("Start Game")');
    await expect(pageA.locator('text=Question').first()).toBeVisible();
    await expect(pageB.locator('text=Question').first()).toBeVisible();

    // Both answer
    await pageA.click('button:has-text("Pub/Sub")');
    await pageB.click('button:has-text("Sorted Sets")'); // Different answer just in case

    // Check that answers are accepted
    await expect(pageA.locator('text=Waiting for other players...').first()).toBeVisible();
    await expect(pageB.locator('text=Waiting for other players...').first()).toBeVisible();

    // Host reveals question
    await pageA.click('button:has-text("Reveal Answer")');
    await expect(pageA.locator('text=Correct Answer').first()).toBeVisible();

    // Host advances
    await pageA.click('button:has-text("Next Question")');
    await expect(pageA.locator('text=Question 2').first()).toBeVisible();

    // Both go to Leaderboard
    await pageA.click('button:has-text("Leagues")');
    await pageB.click('button:has-text("Leagues")');

    // Ensure scores are there
    await expect(pageA.locator('text=HostPlayer').first()).toBeVisible();
    await expect(pageA.locator('text=JoinerPlayer').first()).toBeVisible();

    await contextA.close();
    await contextB.close();
  });

  test('Guest host and registered joiner', async ({ browser }) => {
    test.setTimeout(60000);
    
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    // Context A: Guest and create room
    await loginAsGuest(pageA, 'GuestHost');
    await pageA.click('button:has-text("Host a Room")');
    await expect(pageA.locator('text=Waiting for players...').first()).toBeVisible();
    
    const roomCodeText = await pageA.locator('.font-heading-lg').innerText();
    const rawCode = roomCodeText.replace('QR-', '').trim();

    // Context B: Register and join room
    await register(pageB, 'joiner2@example.com', 'Password123!', 'RegJoiner');
    await pageB.fill('input[placeholder="Enter 4-letter code"]', rawCode);
    await pageB.click('button:has-text("Join Room")');

    // Assert both see each other
    await expect(pageA.locator('text=RegJoiner').first()).toBeVisible();
    await expect(pageB.locator('text=GuestHost').first()).toBeVisible();

    // Simulate a load-balancer node rejecting the cookie. The room must stay visible.
    let rejectedRoomPoll = false;
    const roomPollPattern = /\/api\/rooms\/QR-/;
    await pageB.route(roomPollPattern, async (route) => {
      if (!rejectedRoomPoll && route.request().method() === 'GET') {
        rejectedRoomPoll = true;
        await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'Session could not be verified.' }) });
        return;
      }
      await route.continue();
    });
    await expect(pageB.getByTestId('session-recovery')).toBeVisible();
    await expect(pageB.locator('text=Waiting for Host...').first()).toBeVisible();
    await pageB.unroute(roomPollPattern);
    await pageB.getByRole('button', { name: 'Retry' }).click();
    await expect(pageB.getByTestId('session-recovery')).toBeHidden();

    // Wait 30 seconds
    await pageA.waitForTimeout(30000);
    await expect(pageA.locator('text=Waiting for players...').first()).toBeVisible();

    // Host starts game
    await pageA.click('button:has-text("Start Game")');
    await expect(pageB.locator('text=Question').first()).toBeVisible();

    await contextA.close();
    await contextB.close();
  });
});
