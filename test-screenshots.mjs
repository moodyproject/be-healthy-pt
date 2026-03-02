import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join, extname } from 'path';

const SITE_DIR = new URL('.', import.meta.url).pathname;
const SCREENSHOT_DIR = join(SITE_DIR, 'screenshots');
if (!existsSync(SCREENSHOT_DIR)) mkdirSync(SCREENSHOT_DIR);

const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };

const server = createServer((req, res) => {
  let p = req.url.split('?')[0];
  if (p === '/') p = '/index.html';
  const fp = join(SITE_DIR, p);
  try {
    const data = readFileSync(fp);
    res.writeHead(200, { 'Content-Type': MIME[extname(fp)] || 'application/octet-stream' });
    res.end(data);
  } catch { res.writeHead(404); res.end('Not found'); }
});

await new Promise(r => server.listen(8765, r));
console.log('Server on :8765');

const pages = ['index','about','semi-private-fitness','private-training','group-fitness','post-rehab-training','pregnancy-and-postpartum','weight-loss-for-all-ages','njddd','oncology-fitness','hiit-classes','contact-us','free','privacy-policy','terms-of-use'];

const browser = await chromium.launch();

for (const name of pages) {
  for (const [label, width] of [['mobile', 375], ['desktop', 1440]]) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(`http://localhost:8765/${name}.html`, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(2500);
    await page.screenshot({ path: join(SCREENSHOT_DIR, `${name}-${label}.png`), fullPage: true });
    console.log(`✓ ${name}-${label}`);
    await ctx.close();
  }
}

// Test mobile nav
console.log('\n--- Testing mobile nav ---');
const ctx = await browser.newContext({ viewport: { width: 375, height: 900 } });
const page = await ctx.newPage();
await page.goto('http://localhost:8765/index.html', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);

// Find hamburger button
const hamburger = await page.$('.hamburger, .mobile-menu-btn, .menu-toggle, [aria-label*="menu"], button.nav-toggle, .mobile-nav-toggle');
if (hamburger) {
  console.log('Found hamburger button');
  await hamburger.click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(SCREENSHOT_DIR, 'nav-open-mobile.png'), fullPage: false });
  console.log('✓ nav-open-mobile screenshot taken');
  
  // Check if nav overlay covers viewport
  const navOverlay = await page.$('.nav-menu, .mobile-nav, .nav-overlay, nav');
  if (navOverlay) {
    const box = await navOverlay.boundingBox();
    console.log('Nav overlay box:', JSON.stringify(box));
  }
  
  // Try clicking Services dropdown
  const services = await page.$('text=Services');
  if (services) {
    await services.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: join(SCREENSHOT_DIR, 'nav-services-open.png'), fullPage: false });
    console.log('✓ nav-services-open screenshot taken');
  }
} else {
  console.log('NO hamburger button found! Selectors tried: .hamburger, .mobile-menu-btn, .menu-toggle, [aria-label*="menu"], button.nav-toggle, .mobile-nav-toggle');
}
await ctx.close();

await browser.close();
server.close();
console.log('\nDone! Screenshots in:', SCREENSHOT_DIR);
