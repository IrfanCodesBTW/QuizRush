import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { execSync } from 'child_process';

// Helpers
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

function stopPostgres() {
  console.log("Stopping Postgres container...");
  try {
    // Find the postgres container ID by image name to be safe across different compose project names
    const containerId = execSync('docker ps -q -f ancestor=postgres:16-alpine').toString().trim();
    if (containerId) {
      execSync(`docker stop ${containerId}`);
      console.log(`Stopped container ${containerId}`);
    } else {
      console.warn("Could not find Postgres container to stop!");
    }
  } catch (err) {
    console.error("Failed to stop Postgres", err);
  }
}

function startPostgres() {
  console.log("Starting Postgres container...");
  try {
    const containerId = execSync('docker ps -a -q -f ancestor=postgres:16-alpine').toString().trim();
    if (containerId) {
      execSync(`docker start ${containerId}`);
      console.log(`Started container ${containerId}`);
    }
  } catch (err) {
    console.error("Failed to start Postgres", err);
  }
}

test.describe('Postgres Resilience', () => {
  // Ensure postgres is running before test
  test.beforeAll(() => {
    startPostgres();
  });

  // Ensure postgres is running after test so it doesn't break other tests
  test.afterAll(() => {
    startPostgres();
  });

  test('App survives Postgres failure', async ({ browser }) => {
    test.setTimeout(90000);
    
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();

    // 1. Initial State: Postgres is alive. Register an account.
    await register(pageA, 'resilient@example.com', 'Password123!', 'ResilientPlayer');
    
    // UI should show Postgres Live
    await expect(pageA.locator('text=Postgres Live').first()).toBeVisible();

    // 2. Kill Postgres
    stopPostgres();

    // Wait a brief moment for the connection to drop
    await pageA.waitForTimeout(2000);

    // Refresh to check status
    await pageA.reload();
    await expect(pageA.locator('text=Fallback').first()).toBeVisible();

    // 3. Guest creation should still work (it doesn't need Postgres anymore)
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await loginAsGuest(pageB, 'ResilientGuest');
    await expect(pageB.locator('text=Fallback').first()).toBeVisible();

    // 4. Room creation should still work (it only needs Valkey)
    await pageA.click('button:has-text("Host a Room")');
    await expect(pageA.locator('text=Waiting for players...').first()).toBeVisible();
    
    const roomCodeText = await pageA.locator('.font-heading-lg').innerText();
    const rawCode = roomCodeText.replace('QR-', '').trim();

    // 5. Room join should still work
    await pageB.fill('input[placeholder="Enter 4-letter code"]', rawCode);
    await pageB.click('button:has-text("Join Room")');

    // Assert both see each other
    await expect(pageA.locator('text=ResilientGuest').first()).toBeVisible();
    await expect(pageB.locator('text=ResilientPlayer').first()).toBeVisible();

    // 6. Start game and answer
    await pageA.click('button:has-text("Start Game")');
    await expect(pageB.locator('text=Question').first()).toBeVisible();

    // 7. Restart postgres and verify recovery
    startPostgres();
    // Wait for it to be ready
    await pageA.waitForTimeout(5000);
    await pageA.reload();
    await expect(pageA.locator('text=Postgres Live').first()).toBeVisible();

    await contextA.close();
    await contextB.close();
  });
});
