const { chromium } = require('playwright');

(async () => {
  // Get image type from command line argument, default to 'jpeg'
  const imageType = process.argv[2] || 'png';

  // Validate image type
  if (imageType !== 'png' && imageType !== 'jpeg') {
    console.error('Error: imageType must be either "png" or "jpeg"');
    process.exit(1);
  }

  const browser = await chromium.launch({
    headless: true
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
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

  // Take screenshot
  await page.screenshot({
    path: `screenshot.${imageType}`,
    type: imageType,
    omitBackground: false
  });

  console.log(`Screenshot saved to screenshot.${imageType}`);

  await browser.close();
})();
