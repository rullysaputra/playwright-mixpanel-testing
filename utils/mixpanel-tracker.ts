import { Page, Request, Response } from '@playwright/test';

export interface TestResult {
  success: boolean;
  eventName: string;
  found: boolean;
  payload?: MixpanelEvent;
  timestamp: string;
  error?: string;
}

export interface NetworkTestReport {
  testName: string;
  url: string;
  timestamp: string;
  deviceId?: string;
  mixpanelToken?: string;
  totalRequests: number;
  mixpanelRequests: number;
  expectedEvents: string[];
  foundEvents: string[];
  missingEvents: string[];
  testResults: TestResult[];
  rawPayloads: MixpanelEvent[];
  networkDetails: {
    url: string;
    method: string;
    status?: number;
    postDataPreview: string;
  }[];
}

export class MixpanelTestReporter {
  private results: NetworkTestReport[] = [];

  addReport(report: NetworkTestReport): void {
    this.results.push(report);
  }

  async saveToFile(filePath: string): Promise<void> {
    const fs = require('fs').promises;
    const path = require('path');
    
    // Ensure directory exists
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    
    await fs.writeFile(filePath, JSON.stringify(this.results, null, 2));
  }

  async generateHtmlReport(filePath: string): Promise<void> {
    const fs = require('fs').promises;
    const path = require('path');
    
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Mixpanel Analytics Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .report { border: 1px solid #ddd; margin: 20px 0; padding: 20px; border-radius: 8px; }
        .success { background: #d4edda; border-color: #c3e6cb; }
        .warning { background: #fff3cd; border-color: #ffeaa7; }
        .error { background: #f8d7da; border-color: #f5c6cb; }
        .event { margin: 10px 0; padding: 10px; background: #f8f9fa; border-radius: 4px; }
        .payload { background: #e9ecef; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 12px; white-space: pre-wrap; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background: #f2f2f2; }
        .status-success { color: #28a745; font-weight: bold; }
        .status-error { color: #dc3545; font-weight: bold; }
    </style>
</head>
<body>
    <h1>🔍 Mixpanel Analytics Test Report</h1>
    <p>Generated: ${new Date().toLocaleString()}</p>
    
    ${this.results.map((report, index) => `
        <div class="report ${report.missingEvents.length === 0 ? 'success' : 'warning'}">
            <h2>Test ${index + 1}: ${report.testName}</h2>
            <p><strong>URL:</strong> ${report.url}</p>
            <p><strong>Timestamp:</strong> ${report.timestamp}</p>
            ${report.deviceId ? `<p><strong>🔍 Device ID:</strong> <code style="background: #e9ecef; padding: 2px 4px; border-radius: 3px; font-family: monospace;">${report.deviceId}</code></p>` : ''}
            ${report.mixpanelToken ? `<p><strong>🔑 Mixpanel Token:</strong> <code style="background: #e9ecef; padding: 2px 4px; border-radius: 3px; font-family: monospace;">${report.mixpanelToken}</code></p>` : ''}
            
            <h3>📊 Summary</h3>
            <table>
                <tr><th>Metric</th><th>Value</th></tr>
                <tr><td>Total Requests</td><td>${report.totalRequests}</td></tr>
                <tr><td>Mixpanel Requests</td><td>${report.mixpanelRequests}</td></tr>
                <tr><td>Expected Events</td><td>${report.expectedEvents.length}</td></tr>
                <tr><td>Found Events</td><td>${report.foundEvents.length}</td></tr>
                <tr><td>Missing Events</td><td>${report.missingEvents.length}</td></tr>
            </table>
            
            <h3>🎯 Event Results</h3>
            ${report.testResults.map(result => `
                <div class="event">
                    <strong>${result.eventName}</strong> 
                    <span class="${result.found ? 'status-success' : 'status-error'}">
                        ${result.found ? '✅ FOUND' : '❌ MISSING'}
                    </span>
                    ${result.payload ? `<div class="payload">${JSON.stringify(result.payload, null, 2)}</div>` : ''}
                    ${result.error ? `<div style="color: red;">Error: ${result.error}</div>` : ''}
                </div>
            `).join('')}
            
            <h3>🌐 Network Details</h3>
            <table>
                <tr><th>URL</th><th>Method</th><th>Status</th><th>Data Preview</th></tr>
                ${report.networkDetails.map(req => `
                    <tr>
                        <td>${req.url}</td>
                        <td>${req.method}</td>
                        <td>${req.status || 'N/A'}</td>
                        <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis;">${req.postDataPreview}</td>
                    </tr>
                `).join('')}
            </table>
        </div>
    `).join('')}
</body>
</html>`;
    
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, html);
  }

  getLatestReport(): NetworkTestReport | null {
    return this.results.length > 0 ? this.results[this.results.length - 1] : null;
  }

  getAllReports(): NetworkTestReport[] {
    return this.results;
  }
}

export interface MixpanelEvent {
  event: string;
  properties: Record<string, any>;
  timestamp?: number;
}

export interface MixpanelPayload {
  data: string; // Base64 encoded JSON
  ip?: number;
  _?: number; // timestamp
}

export interface NetworkCapture {
  requests: Request[];
  responses: Response[];
  mixpanelRequests: Request[];
  mixpanelPayloads: MixpanelEvent[];
}

export class MixpanelTracker {
  private page: Page;
  private mixpanelApiUrl: string;
  private networkCapture: NetworkCapture;

  constructor(page: Page, mixpanelApiUrl: string = 'https://api-js.mixpanel.com/track/') {
    this.page = page;
    this.mixpanelApiUrl = mixpanelApiUrl;
    this.networkCapture = {
      requests: [],
      responses: [],
      mixpanelRequests: [],
      mixpanelPayloads: []
    };
    this.setupNetworkListeners();
  }

  /**
   * Extract device ID from cookies or Mixpanel events
   */
  async extractDeviceInfo(): Promise<{ deviceId?: string, mixpanelToken?: string }> {
    const result: { deviceId?: string, mixpanelToken?: string } = {};
    
    try {
      // Try to get device ID from cookies
      const cookies = await this.page.context().cookies();
      const mixpanelCookies = cookies.filter(cookie => 
        cookie.name.includes('mp_') || 
        cookie.name.includes('mixpanel') ||
        cookie.name.includes('distinct_id') ||
        cookie.name.includes('device_id')
      );
      
      for (const cookie of mixpanelCookies) {
        console.log(`🍪 Found Mixpanel cookie: ${cookie.name} = ${cookie.value}`);
        if (cookie.name.includes('device') || cookie.name.includes('distinct_id')) {
          result.deviceId = cookie.value;
        }
      }
      
      // Try to extract from captured events
      const events = this.getMixpanelPayloads();
      if (events.length > 0) {
        const latestEvent = events[events.length - 1];
        if (latestEvent.properties) {
          result.deviceId = result.deviceId || 
            latestEvent.properties.$device_id || 
            latestEvent.properties.device_id ||
            latestEvent.properties.deviceId ||
            latestEvent.properties.distinct_id ||
            latestEvent.properties.$distinct_id;
            
          result.mixpanelToken = latestEvent.properties.token;
        }
      }
      
      // Try to extract from localStorage
      const localStorageData = await this.page.evaluate(() => {
        try {
          const items = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.includes('mixpanel') || key.includes('mp_') || key.includes('device'))) {
              const value = localStorage.getItem(key);
              items.push({ key, value });
            }
          }
          return items;
        } catch (e) {
          return [];
        }
      });
      
      for (const item of localStorageData) {
        console.log(`💾 Found Mixpanel localStorage: ${item.key} = ${item.value?.substring(0, 100)}...`);
        try {
          const parsed = JSON.parse(item.value);
          if (parsed.device_id || parsed.$device_id) {
            result.deviceId = result.deviceId || parsed.device_id || parsed.$device_id;
          }
          if (parsed.token) {
            result.mixpanelToken = result.mixpanelToken || parsed.token;
          }
        } catch {
          // Not JSON, might be plain device ID
          if (item.key.includes('device') && !result.deviceId) {
            result.deviceId = item.value;
          }
        }
      }
      
    } catch (error) {
      console.log('Error extracting device info:', error);
    }
    
    return result;
  }

  private setupNetworkListeners(): void {
    // Capture all requests
    this.page.on('request', (request) => {
      this.networkCapture.requests.push(request);
      
      // Check if this is a Mixpanel request
      if (this.isMixpanelRequest(request)) {
        this.networkCapture.mixpanelRequests.push(request);
        this.extractMixpanelPayload(request);
      }
    });

    // Capture all responses
    this.page.on('response', (response) => {
      this.networkCapture.responses.push(response);
    });
  }

  private isMixpanelRequest(request: Request): boolean {
    const url = request.url();
    return url.includes('api-js.mixpanel.com/track/') || url.includes(this.mixpanelApiUrl);
  }

  private extractMixpanelPayload(request: Request): void {
    try {
      const url = new URL(request.url());
      const dataParam = url.searchParams.get('data');
      
      if (dataParam) {
        // Decode base64 data
        const decodedData = Buffer.from(dataParam, 'base64').toString('utf-8');
        const eventData = JSON.parse(decodedData) as MixpanelEvent;
        this.networkCapture.mixpanelPayloads.push(eventData);
      }

      // Handle POST request with form data
      if (request.method() === 'POST') {
        const postData = request.postData();
        if (postData) {
          try {
            // Handle form-encoded data (data=...)
            if (postData.startsWith('data=')) {
              const encodedData = postData.substring(5); // Remove 'data=' prefix
              const decodedData = decodeURIComponent(encodedData);
              const events = JSON.parse(decodedData) as MixpanelEvent[];
              
              // Add all events from the array
              if (Array.isArray(events)) {
                events.forEach(event => {
                  this.networkCapture.mixpanelPayloads.push(event);
                  console.log(`Captured Mixpanel event: ${event.event}`);
                });
              } else {
                this.networkCapture.mixpanelPayloads.push(events);
              }
            } else {
              // Try to parse as direct JSON
              const parsed = JSON.parse(postData) as MixpanelEvent;
              this.networkCapture.mixpanelPayloads.push(parsed);
            }
          } catch (e) {
            console.log('Could not parse POST data:', e);
            console.log('Raw POST data:', postData);
          }
        }
      }
    } catch (error) {
      console.error('Error extracting Mixpanel payload:', error);
    }
  }

  /**
   * Get all captured Mixpanel requests
   */
  getMixpanelRequests(): Request[] {
    return this.networkCapture.mixpanelRequests;
  }

  /**
   * Get all captured Mixpanel payloads
   */
  getMixpanelPayloads(): MixpanelEvent[] {
    return this.networkCapture.mixpanelPayloads;
  }

  /**
   * Get all network requests
   */
  getAllRequests(): Request[] {
    return this.networkCapture.requests;
  }

  /**
   * Check if a specific event was tracked
   */
  hasEvent(eventName: string): boolean {
    return this.networkCapture.mixpanelPayloads.some(payload => payload.event === eventName);
  }

  /**
   * Get events by name
   */
  getEventsByName(eventName: string): MixpanelEvent[] {
    return this.networkCapture.mixpanelPayloads.filter(payload => payload.event === eventName);
  }

  /**
   * Get the latest event
   */
  getLatestEvent(): MixpanelEvent | null {
    const payloads = this.networkCapture.mixpanelPayloads;
    return payloads.length > 0 ? payloads[payloads.length - 1] : null;
  }

  /**
   * Check if page visit event was tracked
   */
  hasPageVisitEvent(): boolean {
    return this.hasEvent('page_view') || this.hasEvent('Page View') || this.hasEvent('pageVisit');
  }

  /**
   * Clear all captured data
   */
  clearCapture(): void {
    this.networkCapture = {
      requests: [],
      responses: [],
      mixpanelRequests: [],
      mixpanelPayloads: []
    };
  }

  /**
   * Wait for a specific Mixpanel event to be tracked
   */
  async waitForEvent(eventName: string, timeout: number = 10000): Promise<MixpanelEvent> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const events = this.getEventsByName(eventName);
      if (events.length > 0) {
        return events[events.length - 1]; // Return the latest one
      }
      await this.page.waitForTimeout(100);
    }
    
    throw new Error(`Timeout waiting for Mixpanel event: ${eventName}`);
  }

  /**
   * Wait for any Mixpanel event to be tracked
   */
  async waitForAnyEvent(timeout: number = 10000): Promise<MixpanelEvent> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      if (this.networkCapture.mixpanelPayloads.length > 0) {
        return this.getLatestEvent()!;
      }
      await this.page.waitForTimeout(100);
    }
    
    throw new Error('Timeout waiting for any Mixpanel event');
  }

  /**
   * Wait for multiple specific events to be tracked
   */
  async waitForEvents(eventNames: string[], timeout: number = 10000): Promise<MixpanelEvent[]> {
    const startTime = Date.now();
    const foundEvents: MixpanelEvent[] = [];
    
    while (Date.now() - startTime < timeout && foundEvents.length < eventNames.length) {
      for (const eventName of eventNames) {
        if (!foundEvents.some(e => e.event === eventName)) {
          const events = this.getEventsByName(eventName);
          if (events.length > 0) {
            foundEvents.push(events[events.length - 1]);
          }
        }
      }
      
      if (foundEvents.length === eventNames.length) {
        return foundEvents;
      }
      
      await this.page.waitForTimeout(100);
    }
    
    throw new Error(`Timeout waiting for events: ${eventNames.filter(name => 
      !foundEvents.some(e => e.event === name)
    ).join(', ')}`);
  }

  /**
   * Test for specific events with detailed reporting
   */
  async testForEvents(eventNames: string[], options: {
    timeout?: number;
    testName?: string;
    url?: string;
  } = {}): Promise<NetworkTestReport> {
    const { timeout = 15000, testName = 'Event Test', url = 'Unknown' } = options;
    const startTime = Date.now();
    const testResults: TestResult[] = [];
    
    // Wait for events
    while (Date.now() - startTime < timeout) {
      const foundEvents = this.getMixpanelPayloads();
      const foundEventNames = foundEvents.map(e => e.event);
      
      // Check each expected event
      for (const eventName of eventNames) {
        const existing = testResults.find(r => r.eventName === eventName);
        if (!existing) {
          const found = foundEventNames.includes(eventName);
          const payload = found ? foundEvents.find(e => e.event === eventName) : undefined;
          
          testResults.push({
            success: found,
            eventName,
            found,
            payload,
            timestamp: new Date().toISOString()
          });
        }
      }
      
      // If all events found, break early
      if (testResults.length === eventNames.length && testResults.every(r => r.found)) {
        break;
      }
      
      await this.page.waitForTimeout(100);
    }
    
    // Ensure we have results for all expected events
    for (const eventName of eventNames) {
      if (!testResults.some(r => r.eventName === eventName)) {
        testResults.push({
          success: false,
          eventName,
          found: false,
          timestamp: new Date().toISOString(),
          error: 'Timeout waiting for event'
        });
      }
    }
    
    const allPayloads = this.getMixpanelPayloads();
    const foundEventNames = allPayloads.map(e => e.event);
    const missingEvents = eventNames.filter(name => !foundEventNames.includes(name));
    
    // Extract device information
    const deviceInfo = await this.extractDeviceInfo();
    
    return {
      testName,
      url,
      timestamp: new Date().toISOString(),
      deviceId: deviceInfo.deviceId,
      mixpanelToken: deviceInfo.mixpanelToken,
      totalRequests: this.networkCapture.requests.length,
      mixpanelRequests: this.networkCapture.mixpanelRequests.length,
      expectedEvents: eventNames,
      foundEvents: foundEventNames,
      missingEvents,
      testResults,
      rawPayloads: allPayloads,
      networkDetails: this.networkCapture.mixpanelRequests.map(req => ({
        url: req.url(),
        method: req.method(),
        postDataPreview: req.postData()?.substring(0, 200) || 'No data'
      }))
    };
  }

  /**
   * Quick test for single event
   */
  async testForEvent(eventName: string, timeout: number = 10000): Promise<TestResult> {
    const report = await this.testForEvents([eventName], { timeout, testName: `Single Event Test: ${eventName}` });
    return report.testResults[0];
  }

  /**
   * Get a detailed report of all captured events (legacy method)
   */
  getDetailedReport(): object {
    return {
      summary: {
        totalRequests: this.networkCapture.requests.length,
        mixpanelRequests: this.networkCapture.mixpanelRequests.length,
        totalEvents: this.networkCapture.mixpanelPayloads.length,
        uniqueEvents: [...new Set(this.networkCapture.mixpanelPayloads.map(p => p.event))]
      },
      events: this.networkCapture.mixpanelPayloads,
      requests: this.networkCapture.mixpanelRequests.map(req => ({
        url: req.url(),
        method: req.method(),
        headers: req.headers()
      }))
    };
  }

  /**
   * Get the latest test report (for compatibility)
   */
  getLatestReport(): object {
    return this.getDetailedReport();
  }
}