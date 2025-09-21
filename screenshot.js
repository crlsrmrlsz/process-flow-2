import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:5176');
  await page.waitForTimeout(3000); // Wait for page to load
  await page.screenshot({ path: 'screenshot.png', fullPage: true });
  await browser.close();
})();