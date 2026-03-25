import { setWorldConstructor, BeforeAll, AfterAll, Before, After, BeforeStep, setDefaultTimeout } from '@cucumber/cucumber';
import { chromium } from 'playwright';

let browser;

class PlaywrightWorld {
  constructor() {
    this.page = null;
    this.context = null;
    this.baseUrl = process.env.E2E_BASE_URL ?? 'http://localhost:5173';
    this.username = null;
    this.password = null;
  }
}

setWorldConstructor(PlaywrightWorld);

setDefaultTimeout(20000);

BeforeAll(async () => {
  browser = await chromium.launch({ headless: true });
});

AfterAll(async () => {
  if (browser) await browser.close();
});

Before(async function () {
  this.context = await browser.newContext();
  this.page = await this.context.newPage();
  this.page.setDefaultTimeout(20000);
});

After(async function () {
  if (this.page) await this.page.close();
  if (this.context) await this.context.close();
});

Before({ tags: '@pending' }, function () {
  return 'skipped';
});

Before({ tags: '@Skip' }, function () {
  return 'skipped';
});

BeforeStep(function () {
  if (!this.page) throw new Error('Playwright page not initialized');
});
