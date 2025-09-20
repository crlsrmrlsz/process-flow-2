import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true, slowMo: 100 });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1400, height: 900 });

  try {
    // Capture console logs to see debug output
    page.on('console', msg => {
      console.log('BROWSER:', msg.text());
    });

    console.log('Navigating to localhost:5174...');
    await page.goto('http://localhost:5174', { waitUntil: 'networkidle' });

    console.log('Clearing session storage and local storage...');
    await page.evaluate(() => {
      sessionStorage.clear();
      localStorage.clear();
    });

    console.log('Waiting for page to load...');
    await page.waitForTimeout(2000);

    console.log('Data should be automatically loaded now...');

    console.log('Looking for variant tiles...');

    // Wait for variant tiles to appear and click the "Happy Path" one specifically
    await page.waitForTimeout(3000);

    // Try to find the specific Happy Path button inside the variant tiles section
    const happyPathButton = page.locator('button').filter({ hasText: 'Happy Path' }).first();
    if (await happyPathButton.isVisible()) {
      console.log('Found Happy Path button, clicking...');
      await happyPathButton.click();
      await page.waitForTimeout(4000); // Wait longer for diagram to render
    } else {
      console.log('Happy Path button not found, trying to click in variant tiles area...');
      // Try to click any button in the variant tiles section
      const variantButton = page.locator('button').first();
      if (await variantButton.isVisible()) {
        console.log('Clicking first available button...');
        await variantButton.click();
        await page.waitForTimeout(4000);
      }
    }

    console.log('Taking screenshot after data load...');
    await page.screenshot({
      path: 'after-data-load.png',
      fullPage: true
    });

    console.log('Looking for React Flow diagram...');

    // Wait for the diagram to render - try multiple selectors
    try {
      await page.waitForSelector('.react-flow, [class*="react-flow"], svg', { timeout: 8000 });
      console.log('Found diagram elements!');
    } catch (e) {
      console.log('Diagram elements not found, taking debug screenshot...');
      await page.screenshot({ path: 'no-diagram-found.png' });
    }

    console.log('Looking for edges in the diagram...');

    // Look for edges and try to right-click one
    const edges = page.locator('.react-flow__edge');
    const edgeCount = await edges.count();
    console.log(`Found ${edgeCount} edges`);

    if (edgeCount > 0) {
      console.log('Right-clicking on first edge...');
      await edges.first().click({ button: 'right' });
      await page.waitForTimeout(1000);

      console.log('Taking screenshot with context menu...');
      await page.screenshot({ path: 'with-context-menu.png' });

      // Look for Split by Worker option
      const splitOption = page.locator('text=Split by Worker');
      if (await splitOption.isVisible()) {
        console.log('Clicking Split by Worker...');
        await splitOption.click();
        await page.waitForTimeout(2000);

        console.log('Taking screenshot after split...');
        await page.screenshot({ path: 'after-split.png' });
      } else {
        console.log('Split by Worker option not found');
      }
    }

    console.log('Taking final screenshot...');
    await page.screenshot({
      path: 'final-state.png',
      fullPage: true
    });

  } catch (error) {
    console.error('Error:', error);
    await page.screenshot({ path: 'error-state.png' });
  }

  await browser.close();
})();