const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: true
  });
  const context = await browser.newContext({
    viewport: { width: 1200, height: 800 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    locale: 'en-US',
    timezoneId: 'America/New_York'
  });
  const page = await context.newPage();

  await page.goto('https://gc.nh.gov/house/schedule/dailyschedule.aspx', {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });

  // Wait a moment for dynamic content
  await page.waitForTimeout(2000);

  // Take screenshot as 24-bit PNG (no alpha channel)
  await page.screenshot({
    path: 'screenshot.png',
    type: 'png',
    omitBackground: false
  });

  console.log('Screenshot saved to screenshot.png');

  await browser.close();
})();
