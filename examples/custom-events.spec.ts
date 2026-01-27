// Example usage of the new reusable Mixpanel testing utilities

import { test, expect } from '@playwright/test';
import { MixpanelTracker, MixpanelTestReporter } from '../utils/mixpanel-tracker';
import { PageHelpers } from '../utils/page-helpers';

test.describe('Example: Testing Custom Events', () => {
  test('how to test for specific custom events', async ({ page }) => {
    const tracker = new MixpanelTracker(page);
    const reporter = new MixpanelTestReporter();
    const helpers = new PageHelpers(page);
    
    // Navigate to your page
    await page.goto(process.env.BASE_URL || 'https://example.com');
    await helpers.waitForPageToLoad();
    
    // Test for specific events you care about
    const myEvents = ['user_signup', 'button_click', 'page_view'];
    
    const report = await tracker.testForEvents(myEvents, {
      timeout: 15000,
      testName: 'Custom Event Test',
      url: page.url()
    });
    
    // Generate beautiful HTML report
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await reporter.addReport(report);
    await reporter.generateHtmlReport(`test-results/my-custom-events-${timestamp}.html`);
    
    // Check specific event
    const signupResult = await tracker.testForEvent('user_signup', 10000);
    expect(signupResult.found).toBe(true);
    
    console.log(`📊 Report generated: test-results/my-custom-events-${timestamp}.html`);
  });
  
  test('how to test button clicks and interactions', async ({ page }) => {
    const tracker = new MixpanelTracker(page);
    const helpers = new PageHelpers(page);
    
    await page.goto(process.env.BASE_URL || 'https://example.com');
    await helpers.waitForPageToLoad();
    
    // Clear events to focus on interactions
    tracker.clearCapture();
    
    // Click a specific button
    await helpers.scrollAndClick('button[data-testid="signup-btn"]');
    
    // Wait for the click event
    const clickEvent = await tracker.waitForEvent('button_click', 5000);
    
    expect(clickEvent).toBeDefined();
    expect(clickEvent.properties.button_type).toBe('signup');
  });
  
  test('how to test page navigation events', async ({ page }) => {
    const tracker = new MixpanelTracker(page);
    
    // Test homepage
    await page.goto('/');
    const homeReport = await tracker.testForEvents(['page_view'], {
      testName: 'Homepage Visit'
    });
    
    // Test another page
    await page.goto('/about');
    const aboutReport = await tracker.testForEvents(['page_view'], {
      testName: 'About Page Visit'
    });
    
    expect(homeReport.foundEvents).toContain('page_view');
    expect(aboutReport.foundEvents).toContain('page_view');
  });
});