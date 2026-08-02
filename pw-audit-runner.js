const { chromium } = require('@playwright/test');

(async () => {
  const context = await chromium.launchPersistentContext(
    'C:/Users/hp/.gemini/antigravity/scratch/colis_connect/.pw-profile',
    {
      headless: false,
      channel: 'chrome',
      viewport: { width: 1440, height: 1200 },
      slowMo: 250,
    }
  );

  const page = context.pages()[0] || (await context.newPage());

  await page.goto('http://127.0.0.1:4173/index.html', { waitUntil: 'networkidle' });
  await page.mouse.move(220, 250);
  await page.mouse.move(480, 260);
  await page.mouse.move(760, 360);
  await page.screenshot({ path: 'C:/Users/hp/Desktop/colisconnect-home-visible.png', fullPage: true });

  await page.waitForTimeout(120000);
})();
