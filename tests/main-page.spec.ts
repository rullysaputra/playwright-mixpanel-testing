import { test, expect } from "@playwright/test";
import {
  MixpanelTracker,
  MixpanelTestReporter,
} from "../utils/mixpanel-tracker";
import { PageHelpers } from "../utils/page-helpers";

const mainUrl = process.env.BASE_URL;
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
  '[data-testid*="verticalTab-flight"]',
];

const clickExpectedEvents = ["enterVertical"]

test.describe("Homepage Mixpanel Analytics", () => {
  let mixpanelTracker: MixpanelTracker;
  let pageHelpers: PageHelpers;

  test.beforeEach(async ({ page }) => {
    mixpanelTracker = new MixpanelTracker(page);
    pageHelpers = new PageHelpers(page);
  });

  test("should track page visit when homepage loads", async ({ page }) => {
    console.log(`\n🎯 Testing Mixpanel Analytics on: ${mainUrl}`);
    console.log("=".repeat(60));

    // Navigate to homepage
    await page.goto(mainUrl);
    await pageHelpers.waitForPageToLoad(30000);

    console.log(`\n📋 Testing for events: ${expectedEvents.join(", ")}`);

    const report = await mixpanelTracker.testForEvents(expectedEvents, {
      timeout: 20000,
      testName: "Homepage Load Events",
      url: mainUrl || "Unknown",
    });

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

    // Assertions
    expect(report.mixpanelRequests).toBeGreaterThan(0);
    expect(report.foundEvents.length).toBeGreaterThan(0);

    // At minimum expect pageVisit event for homepage
    const hasPageVisit = report.foundEvents.includes("pageVisit");
    expect(hasPageVisit).toBe(true, "Should capture pageVisit event");

    // Take screenshot
    await pageHelpers.takeScreenshot(`homepage-test-${timestamp}`);
  });

  test("should track button click events", async ({ page }) => {
    await page.goto(mainUrl);
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
      0,
      "Should capture click events",
    );

    await pageHelpers.takeScreenshot(`button-click-${timestamp}`);
  });

  test("should generate comprehensive analytics report", async ({ page }) => {
    await page.goto(mainUrl);
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
      url: mainUrl || "Unknown",
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

  console.log(`\n📍 ${testName}`);
  let interactionSuccess = false;

  for (const selector of selectors) {
    try {
      const element = page.locator(selector);
      const count = await element.count();

      if (count > 0) {
        console.log(`⚙️  Interacting with: ${selector}`);
        await element.first().click();
        await page.waitForTimeout(1000);
        interactionSuccess = true;
        break;
      }
    } catch (error) {
      console.log(`⚠️  Could not interact with ${selector}`);
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
