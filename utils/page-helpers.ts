import { Page } from '@playwright/test';

export class PageHelpers {
  constructor(private page: Page) {}

  /**
   * Wait for page to be fully loaded including all network requests
   */
  async waitForPageToLoad(timeout: number = 30000): Promise<void> {
    await Promise.all([
      this.page.waitForLoadState('networkidle', { timeout }),
      this.page.waitForLoadState('domcontentloaded', { timeout })
    ]);
  }

  /**
   * Scroll to element and click with retry logic
   */
  async scrollAndClick(selector: string, options?: { timeout?: number; force?: boolean }): Promise<void> {
    const element = this.page.locator(selector);
    await element.scrollIntoViewIfNeeded();
    await element.click(options);
  }

  /**
   * Wait for element and get text content
   */
  async getTextContent(selector: string, timeout: number = 5000): Promise<string | null> {
    await this.page.waitForSelector(selector, { timeout });
    return await this.page.textContent(selector);
  }

  /**
   * Take a screenshot with timestamp
   */
  async takeScreenshot(name: string): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await this.page.screenshot({ 
      path: `test-results/screenshots/${name}-${timestamp}.png`,
      fullPage: true 
    });
  }

  /**
   * Wait for any navigation to complete
   */
  async waitForNavigation(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Check if element exists without throwing error
   */
  async elementExists(selector: string): Promise<boolean> {
    try {
      await this.page.waitForSelector(selector, { timeout: 1000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get current URL
   */
  getCurrentUrl(): string {
    return this.page.url();
  }

  /**
   * Wait for URL to contain specific text
   */
  async waitForUrlContains(text: string, timeout: number = 10000): Promise<void> {
    await this.page.waitForFunction(
      (expectedText) => window.location.href.includes(expectedText),
      text,
      { timeout }
    );
  }
}