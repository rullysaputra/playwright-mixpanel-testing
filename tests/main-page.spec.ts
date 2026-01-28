import { test, expect } from "@playwright/test";
import {
  MixpanelTracker,
  MixpanelTestReporter,
} from "../utils/mixpanel-tracker";
import { PageHelpers } from "../utils/page-helpers";
import { mainTestPageUrl } from "../utils/constants";

const reporter = new MixpanelTestReporter();

// Add the expected event when the page was initially open
const expectedEvents = ["$identify", "pageVisit"];

const clickExpectedSelectors = [
  // 'button[type="submit"]',
  // ".btn-primary",
  // ".cta-button",
  // 'a[href*="search"]',
  // 'button:has-text("Search")',
  // 'button:has-text("Book")',
  'button[class*="Tabs_tab__"]',
  'div[class*="Toggle_toggle__1qFNC"]',
  'span:has-text("CTA button")',
  // '[data-testid*="verticalTab-flight"]',
];

const clickExpectedEvents = ["enableRoundTrip","seoPageModuleTabs", "bannerPageModuleSeeAllCTA"]

test.describe("Page Mixpanel Analytics", () => {
  let mixpanelTracker: MixpanelTracker;
  let pageHelpers: PageHelpers;

  test.beforeEach(async ({ page }) => {
    mixpanelTracker = new MixpanelTracker(page);
    pageHelpers = new PageHelpers(page);
  });

  test("should track page visit when page loads", async ({ page }) => {
    console.log(`\n🎯 Testing Mixpanel Analytics on: ${mainTestPageUrl}`);
    console.log("=".repeat(60));

    // Navigate to homepage
    await page.goto(mainTestPageUrl);
    await pageHelpers.waitForPageToLoad(30000);

    console.log(`\n📋 Testing for events: ${expectedEvents.join(", ")}`);

    const report = await mixpanelTracker.testForEvents(expectedEvents, {
      timeout: 20000,
      testName: "Page Load Events",
      url: mainTestPageUrl || "Unknown",
    });

    // 🔍 DEBUG: Show what was actually captured vs expected
    console.log('\n🔍 DEBUG INFORMATION:');
    console.log('='.repeat(40));
    console.log(`Expected Events: [${expectedEvents.join(', ')}]`);
    console.log(`Found Events: [${report.foundEvents.join(', ')}]`);
    console.log(`Raw Payload Count: ${report.rawPayloads.length}`);
    
    if (report.rawPayloads.length > 0) {
      console.log('\n📦 ALL CAPTURED EVENTS:');
      report.rawPayloads.forEach((payload, index) => {
        console.log(`  ${index + 1}. "${payload.event}" - ${JSON.stringify(payload.properties?.eventAction || 'no action')}`);
      });
      
      console.log('\n🎯 EVENT NAME EXACT MATCHES:');
      expectedEvents.forEach(expectedEvent => {
        const found = report.rawPayloads.some(p => p.event === expectedEvent);
        const similarFound = report.rawPayloads.filter(p => 
          p.event.toLowerCase().includes(expectedEvent.toLowerCase()) || 
          expectedEvent.toLowerCase().includes(p.event.toLowerCase())
        );
        console.log(`  "${expectedEvent}" → Found exact: ${found ? '✅' : '❌'} | Similar: ${similarFound.map(s => s.event).join(', ')}`);
      });
    }

    // Show device ID immediately after capture
    if (report.deviceId) {
      console.log(`\n🎯 DETECTED DEVICE ID: ${report.deviceId}`);
      console.log(`📋 You can now search for this Device ID in Mixpanel dashboard`);
    }

    // Add to reporter
    reporter.addReport(report);

    // Generate and save reports
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    await reporter.saveToFile(`test-results/mixpanel-report-${timestamp}.json`);
    await reporter.generateHtmlReport(
      `test-results/mixpanel-report-${timestamp}.html`,
    );

    // Console output for immediate feedback
    console.log("\n📊 TEST RESULTS:");
    console.log("=".repeat(40));
    console.log(
      `✅ Found Events: ${report.foundEvents.length}/${report.expectedEvents.length}`,
    );
    console.log(`🔍 Mixpanel Requests: ${report.mixpanelRequests}`);
    console.log(`📡 Total Requests: ${report.totalRequests}`);

    // Display device ID prominently for Mixpanel dashboard lookup
    if (report.deviceId) {
      console.log(`\n🔑 DEVICE ID (for Mixpanel dashboard): ${report.deviceId}`);
      console.log(`📱 Use this Device ID to find events in Mixpanel Dashboard`);
    }
    if (report.mixpanelToken) {
      console.log(`🔐 Mixpanel Token: ${report.mixpanelToken}`);
    }

    if (report.foundEvents.length > 0) {
      console.log("\n🎉 CAPTURED EVENTS:");
      report.testResults
        .filter((r) => r.found)
        .forEach((result, index) => {
          console.log(`  ${index + 1}. ${result.eventName} ✅`);
        });
    }

    if (report.missingEvents.length > 0) {
      console.log("\n❌ MISSING EVENTS:");
      report.missingEvents.forEach((event) => {
        console.log(`  - ${event}`);
      });
    }

    console.log(
      `\n📄 Detailed HTML report saved: test-results/mixpanel-report-${timestamp}.html`,
    );
    console.log(
      `📄 JSON report saved: test-results/mixpanel-report-${timestamp}.json`,
    );

    // Assertions with better error messaging
    expect(report.mixpanelRequests).toBeGreaterThan(0, 
      'Should have made Mixpanel API requests');
    expect(report.foundEvents.length).toBeGreaterThan(0, 
      `Should capture at least one event. Raw payloads captured: ${report.rawPayloads.length}`);

    // Check for pageVisit event with flexible matching
    const hasPageVisitExact = report.foundEvents.includes("pageVisit");
    const hasPageVisitSimilar = report.rawPayloads.some(p => 
      p.event.toLowerCase().includes("pagevisit") || 
      p.event.toLowerCase().includes("page_visit") ||
      p.event.toLowerCase().includes("page-visit")
    );
    
    if (!hasPageVisitExact && hasPageVisitSimilar) {
      const actualPageVisitEvent = report.rawPayloads.find(p => 
        p.event.toLowerCase().includes("pagevisit") || 
        p.event.toLowerCase().includes("page_visit") ||
        p.event.toLowerCase().includes("page-visit")
      );
      console.log(`⚠️  Expected "pageVisit" but found "${actualPageVisitEvent?.event}"`);
      console.log('💡 Consider updating expectedEvents array to match actual event names');
    }
    
    expect(hasPageVisitExact || hasPageVisitSimilar).toBe(true, 
      `Should capture pageVisit event. All events found: [${report.foundEvents.join(', ')}]`);

    // Check for $identify event  
    const hasIdentifyExact = report.foundEvents.includes("$identify");
    const hasIdentifySimilar = report.rawPayloads.some(p => 
      p.event.toLowerCase().includes("identify")
    );
    
    if (!hasIdentifyExact && hasIdentifySimilar) {
      const actualIdentifyEvent = report.rawPayloads.find(p => 
        p.event.toLowerCase().includes("identify")
      );
      console.log(`⚠️  Expected "$identify" but found "${actualIdentifyEvent?.event}"`);
    }
    
    expect(hasIdentifyExact || hasIdentifySimilar).toBe(true, 
      `Should capture $identify event. All events found: [${report.foundEvents.join(', ')}]`);

    // Take screenshot
    await pageHelpers.takeScreenshot(`homepage-test-${timestamp}`);
  });

  test("should track button click events", async ({ page }) => {
    await page.goto(mainTestPageUrl);
    await pageHelpers.waitForPageToLoad();

    // Wait for initial load events
    await page.waitForTimeout(3000);
    mixpanelTracker.clearCapture();

    console.log("\n🎯 Testing Button Click Events");
    console.log("=".repeat(40));

    // Test button interactions
    const clickReport = await testUserInteraction(page, mixpanelTracker, {
      testName: "Button Click Test",
      selectors: clickExpectedSelectors,
      expectedEvents: clickExpectedEvents,
      timeout: 10000,
    });

    reporter.addReport(clickReport);

    // Generate report
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    await reporter.generateHtmlReport(
      `test-results/button-click-report-${timestamp}.html`,
    );

    console.log(
      `\n📄 Button click report: test-results/button-click-report-${timestamp}.html`,
    );

    // Assertions
    expect(clickReport.foundEvents.length).toBeGreaterThan(
      0
    );

    await pageHelpers.takeScreenshot(`button-click-${timestamp}`);
  });

  test("should generate comprehensive analytics report", async ({ page }) => {
    await page.goto(mainTestPageUrl);
    await pageHelpers.waitForPageToLoad();

    console.log("\n📋 Generating Comprehensive Analytics Report");
    console.log("=".repeat(50));

    // Perform various interactions to generate events
    await page.evaluate(() => window.scrollBy(0, 500));
    await page.waitForTimeout(1000);

    // Try clicking interactive elements
    const elements = await page.locator("a, button").count();
    if (elements > 0) {
      try {
        await page.locator("a, button").first().click();
        await page.waitForTimeout(2000);
      } catch {
        console.log("Could not interact with elements");
      }
    }

    await page.waitForTimeout(3000);

    // Generate comprehensive report
    const allEvents = [
      "pageVisit",
      "$identify",
      "globalSearch",
      "scroll",
      "click",
      "interaction",
    ];
    const comprehensiveReport = await mixpanelTracker.testForEvents(allEvents, {
      timeout: 5000,
      testName: "Comprehensive Analytics Report",
      url: mainTestPageUrl,
    });

    reporter.addReport(comprehensiveReport);

    // Generate final reports
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    await reporter.saveToFile(
      `test-results/comprehensive-report-${timestamp}.json`,
    );
    await reporter.generateHtmlReport(
      `test-results/comprehensive-report-${timestamp}.html`,
    );

    console.log("\n🎆 FINAL ANALYTICS SUMMARY:");
    console.log("=".repeat(40));
    console.log(
      `📡 Total Network Requests: ${comprehensiveReport.totalRequests}`,
    );
    console.log(
      `🔥 Mixpanel API Calls: ${comprehensiveReport.mixpanelRequests}`,
    );
    console.log(
      `🎯 Events Captured: ${comprehensiveReport.foundEvents.length}`,
    );
    console.log(
      `📝 Event Types: ${[...new Set(comprehensiveReport.foundEvents)].join(", ")}`,
    );

    console.log(`\n🎉 COMPREHENSIVE REPORT GENERATED!`);
    console.log(`📄 HTML: test-results/comprehensive-report-${timestamp}.html`);
    console.log(`📄 JSON: test-results/comprehensive-report-${timestamp}.json`);

    // Assertions
    expect(comprehensiveReport.mixpanelRequests).toBeGreaterThan(0);
    expect(comprehensiveReport.foundEvents.length).toBeGreaterThan(0);

    await pageHelpers.takeScreenshot(`comprehensive-${timestamp}`);
  });

  test.afterEach(async ({ page }) => {
    console.log(
      "\n🏁 Test completed - Check test-results/ folder for detailed reports",
    );
  });
});

/**
 * Reusable function for testing user interactions
 */
async function testUserInteraction(
  page: any,
  tracker: MixpanelTracker,
  options: {
    testName: string;
    selectors: string[];
    expectedEvents: string[];
    timeout: number;
  },
) {
  const { testName, selectors, expectedEvents, timeout } = options;
  let totalInteractions = 0;
  console.log(`\n📍 ${testName}`);
  let interactionSuccess = false;

  for (const selector of selectors) {
    try {
      const element = page.locator(selector);
      const count = await element.count();

      if (count > 0) {
        console.log(`⚙️  Interacting with: ${selector} (${count} elements found)`);
        
        // Click the first visible element
        const firstElement = element.first();
        if (await firstElement.isVisible()) {
          await firstElement.click();
          await page.waitForTimeout(1500); // Wait for analytics to fire
          totalInteractions++;
          console.log(`✅ Successfully clicked: ${selector}`);
        } else {
          console.log(`⚠️  Element not visible: ${selector}`);
        }
      } else {
        console.log(`❌ Element not found: ${selector}`);
      }
    } catch (error) {
      console.log(`⚠️  Could not interact with ${selector}: ${error.message}`);
    }
  }

  if (interactionSuccess) {
    console.log("✅ Interaction completed, checking for events...");
  }

  // Test for expected events
  return await tracker.testForEvents(expectedEvents, {
    timeout,
    testName,
    url: page.url(),
  });
}
