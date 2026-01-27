import { test, expect } from '@playwright/test';
import { MixpanelTracker } from '../utils/mixpanel-tracker';
import { PageHelpers } from '../utils/page-helpers';

test.describe('Network & API Validation', () => {
  let mixpanelTracker: MixpanelTracker;
  let pageHelpers: PageHelpers;

  test.beforeEach(async ({ page }) => {
    mixpanelTracker = new MixpanelTracker(page);
    pageHelpers = new PageHelpers(page);
  });

  test('should verify Mixpanel API endpoint and payload structure', async ({ page }) => {
    const mainUrl = process.env.STAGING_BASE_URL || 'https://gatotkaca.tiket.com';
    await page.goto(mainUrl);
    await pageHelpers.waitForPageToLoad();
    
    // Wait for any Mixpanel events
    try {
      await mixpanelTracker.waitForAnyEvent(15000);
    } catch (error) {
      console.log('No events captured, but continuing with network validation...');
    }
    
    // Get all network requests
    const allRequests = mixpanelTracker.getAllRequests();
    const mixpanelRequests = mixpanelTracker.getMixpanelRequests();
    
    console.log(`Total requests: ${allRequests.length}`);
    console.log(`Mixpanel requests: ${mixpanelRequests.length}`);
    
    // Verify Mixpanel API endpoints
    const mixpanelApiCalls = allRequests.filter(request => 
      request.url().includes('api-js.mixpanel.com') ||
      request.url().includes('mixpanel.com')
    );
    
    console.log('=== MIXPANEL API CALLS ANALYSIS ===');
    
    for (const request of mixpanelApiCalls) {
      const url = request.url();
      const method = request.method();
      const headers = request.headers();
      
      console.log(`\nRequest: ${method} ${url}`);
      console.log('Headers:', JSON.stringify(headers, null, 2));
      
      // Check for track endpoint
      if (url.includes('/track/')) {
        expect(url).toContain('api-js.mixpanel.com/track/');
        console.log('✅ Correct Mixpanel track endpoint found');
        
        // Extract and decode payload
        try {
          const urlObj = new URL(url);
          const dataParam = urlObj.searchParams.get('data');
          
          if (dataParam) {
            const decodedPayload = Buffer.from(dataParam, 'base64').toString('utf-8');
            const payload = JSON.parse(decodedPayload);
            
            console.log('Decoded payload:', JSON.stringify(payload, null, 2));
            
            // Validate payload structure
            expect(payload).toHaveProperty('event');
            expect(payload).toHaveProperty('properties');
            expect(typeof payload.event).toBe('string');
            expect(typeof payload.properties).toBe('object');
            
            console.log('✅ Payload structure is valid');
          }
        } catch (error) {
          console.error('Error decoding payload:', error);
        }
      }
    }
    
    // Verify minimum requirements
    expect(mixpanelApiCalls.length).toBeGreaterThan(0);
    console.log('✅ Mixpanel API integration verified');
  });

  test('should validate event properties and data quality', async ({ page }) => {
    const mainUrl = process.env.STAGING_BASE_URL || 'https://gatotkaca.tiket.com';
    await page.goto(mainUrl);
    await pageHelpers.waitForPageToLoad();
    
    // Interact with page to generate events
    await page.evaluate(() => {
      window.scrollTo(0, 300);
    });
    await page.waitForTimeout(1000);
    
    // Try to click on interactive elements
    const buttons = page.locator('button, a, [role="button"]');
    const buttonCount = await buttons.count();
    
    if (buttonCount > 0) {
      try {
        await buttons.first().click();
        await page.waitForTimeout(1000);
      } catch {
        console.log('Could not click button');
      }
    }
    
    await page.waitForTimeout(3000);
    
    const events = mixpanelTracker.getMixpanelPayloads();
    
    console.log('=== EVENT DATA QUALITY ANALYSIS ===');
    
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      console.log(`\nEvent ${i + 1}:`);
      console.log(`Name: ${event.event}`);
      console.log(`Properties:`, JSON.stringify(event.properties, null, 2));
      
      // Validate event structure
      expect(event.event).toBeDefined();
      expect(typeof event.event).toBe('string');
      expect(event.event.length).toBeGreaterThan(0);
      
      // Check for common properties
      if (event.properties) {
        console.log('Property analysis:');
        
        // Check for timestamp
        const hasTimestamp = event.properties.time || event.properties.timestamp || event.properties.$time;
        console.log(`- Has timestamp: ${!!hasTimestamp}`);
        
        // Check for URL
        const hasUrl = event.properties.url || event.properties.$current_url || event.properties.page_url;
        console.log(`- Has URL: ${!!hasUrl}`);
        
        // Check for user agent
        const hasUserAgent = event.properties.user_agent || event.properties.$user_agent;
        console.log(`- Has user agent: ${!!hasUserAgent}`);
        
        // Check for screen resolution
        const hasScreen = event.properties.screen_width || event.properties.$screen_width;
        console.log(`- Has screen info: ${!!hasScreen}`);
        
        // Validate critical properties exist
        const criticalProps = hasTimestamp || hasUrl;
        expect(criticalProps).toBe(true);
      }
      
      console.log('✅ Event structure validated');
    }
    
    expect(events.length).toBeGreaterThan(0);
    console.log(`✅ ${events.length} events validated for data quality`);
  });

  test('should monitor network performance and response times', async ({ page }) => {
    const requestTimings: Array<{url: string, duration: number, status: number}> = [];
    const mainUrl = process.env.STAGING_BASE_URL || 'https://gatotkaca.tiket.com';
    
    // Monitor request/response timing
    page.on('response', async (response) => {
      const request = response.request();
      const timing = request.timing();
      const url = request.url();
      
      if (url.includes('mixpanel.com')) {
        const duration = timing.responseEnd - timing.requestStart;
        requestTimings.push({
          url,
          duration,
          status: response.status()
        });
      }
    });
    
    await page.goto(mainUrl);
    await pageHelpers.waitForPageToLoad();
    
    // Generate some activity
    await page.evaluate(() => {
      for (let i = 0; i < 3; i++) {
        window.scrollBy(0, 200);
      }
    });
    
    await page.waitForTimeout(5000);
    
    console.log('=== NETWORK PERFORMANCE ANALYSIS ===');
    
    for (const timing of requestTimings) {
      console.log(`\nMixpanel Request Performance:`);
      console.log(`URL: ${timing.url}`);
      console.log(`Duration: ${timing.duration}ms`);
      console.log(`Status: ${timing.status}`);
      
      // Performance assertions
      expect(timing.status).toBe(200);
      expect(timing.duration).toBeLessThan(10000); // Should respond within 10 seconds
      
      if (timing.duration > 3000) {
        console.warn(`⚠️ Slow response time: ${timing.duration}ms`);
      } else {
        console.log(`✅ Good response time: ${timing.duration}ms`);
      }
    }
    
    if (requestTimings.length === 0) {
      console.log('No Mixpanel requests captured for performance analysis');
    }
  });

  test('should verify cross-environment consistency', async ({ page }) => {
    const currentEnv = process.env.ENV || 'staging';
    const mainUrl = process.env.STAGING_BASE_URL || 'https://gatotkaca.tiket.com';
    const baseUrl = mainUrl;
    
    console.log('=== ENVIRONMENT VERIFICATION ===');
    console.log(`Testing environment: ${currentEnv}`);
    console.log(`Base URL: ${baseUrl}`);
    
    await page.goto(mainUrl);
    await pageHelpers.waitForPageToLoad();
    
    await page.waitForTimeout(5000);
    
    const events = mixpanelTracker.getMixpanelPayloads();
    const requests = mixpanelTracker.getMixpanelRequests();
    
    console.log(`Events captured: ${events.length}`);
    console.log(`Requests made: ${requests.length}`);
    
    // Environment-specific validations
    for (const event of events) {
      if (event.properties) {
        // Check if environment is properly tagged
        const envProperty = event.properties.environment || 
                           event.properties.env || 
                           event.properties.$environment;
        
        if (envProperty) {
          console.log(`Event tagged with environment: ${envProperty}`);
          expect(envProperty).toBe(currentEnv);
        }
        
        // Check URL consistency
        const urlProperty = event.properties.url || event.properties.$current_url;
        if (urlProperty) {
          console.log(`Event URL: ${urlProperty}`);
          
          if (currentEnv === 'production') {
            expect(urlProperty).not.toContain('staging');
            expect(urlProperty).not.toContain('localhost');
          } else if (currentEnv === 'staging') {
            expect(urlProperty).toContain('staging');
          }
        }
      }
    }
    
    // Verify API endpoint consistency
    for (const request of requests) {
      const url = request.url();
      expect(url).toContain('api-js.mixpanel.com');
      console.log(`✅ API endpoint consistent: ${url}`);
    }
    
    console.log(`✅ Environment ${currentEnv} validation completed`);
  });

  test.afterEach(async ({ page }) => {
    const finalReport = mixpanelTracker.getLatestReport();
    console.log('=== FINAL NETWORK VALIDATION REPORT ===');
    console.log(JSON.stringify(finalReport, null, 2));
  });
});