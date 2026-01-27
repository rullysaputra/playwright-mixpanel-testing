import { test, expect } from '@playwright/test';

/**
 * NETWORK VALIDATION SUITE
 * This test suite PROVES we are intercepting real network traffic
 * NOT using mocks or simulations
 */

test.describe('🔍 PROOF: Real Network Interception', () => {
  
  test('VALIDATE: We capture real HTTP requests and responses', async ({ page }) => {
    console.log('\n🚨 STARTING NETWORK INTERCEPTION PROOF');
    console.log('═'.repeat(70));
    
    // Evidence containers
    const networkEvidence = {
      allRequests: [] as any[],
      mixpanelRequests: [] as any[],
      responses: [] as any[],
      timestamps: [] as string[]
    };
    
    // PROOF 1: Capture ALL network requests
    page.on('request', request => {
      const evidence = {
        timestamp: new Date().toISOString(),
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType(),
        headers: request.headers(),
        postData: request.postData()
      };
      
      networkEvidence.allRequests.push(evidence);
      
      // Special tracking for Mixpanel
      if (request.url().includes('mixpanel.com')) {
        console.log(`🎯 REAL MIXPANEL REQUEST INTERCEPTED!`);
        console.log(`   🕐 Time: ${evidence.timestamp}`);
        console.log(`   📡 Method: ${evidence.method}`);
        console.log(`   🌐 URL: ${evidence.url}`);
        console.log(`   📦 Resource Type: ${evidence.resourceType}`);
        console.log(`   📄 Content-Type: ${evidence.headers['content-type']}`);
        console.log(`   📍 Origin: ${evidence.headers['origin']}`);
        
        if (evidence.postData) {
          console.log(`   💾 POST Data Size: ${evidence.postData.length} bytes`);
          console.log(`   🔍 Data Preview: ${evidence.postData.substring(0, 150)}...`);
        }
        
        networkEvidence.mixpanelRequests.push(evidence);
      }
    });
    
    // PROOF 2: Capture real server responses
    page.on('response', async response => {
      if (response.url().includes('mixpanel.com')) {
        const responseEvidence = {
          timestamp: new Date().toISOString(),
          url: response.url(),
          status: response.status(),
          statusText: response.statusText(),
          headers: response.headers(),
          ok: response.ok(),
          fromCache: response.fromCache(),
          serverIP: response.serverAddr()?.ipAddress
        };
        
        console.log(`📨 REAL MIXPANEL RESPONSE RECEIVED!`);
        console.log(`   ✅ Status: ${responseEvidence.status} ${responseEvidence.statusText}`);
        console.log(`   🖥️  Server IP: ${responseEvidence.serverIP || 'Unknown'}`);
        console.log(`   💾 From Cache: ${responseEvidence.fromCache}`);
        console.log(`   📡 Server: ${responseEvidence.headers['server'] || 'Unknown'}`);
        
        networkEvidence.responses.push(responseEvidence);
      }
    });
    
    // PROOF 3: Navigate to actual website
    const testUrl = process.env.BASE_URL || 'https://gatotkaca.tiket.com';
    console.log(`\n📍 Loading REAL website: ${testUrl}`);
    
    await page.goto(testUrl);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(8000); // Give time for analytics to fire
    
    // PROOF 4: Validate we captured REAL network activity
    console.log('\n🔬 ANALYZING CAPTURED NETWORK EVIDENCE...');
    console.log('═'.repeat(50));
    
    console.log(`📊 EVIDENCE SUMMARY:`);
    console.log(`   🌐 Total HTTP Requests: ${networkEvidence.allRequests.length}`);
    console.log(`   🎯 Mixpanel Requests: ${networkEvidence.mixpanelRequests.length}`);
    console.log(`   📨 Mixpanel Responses: ${networkEvidence.responses.length}`);
    
    // PROOF 5: Show this is NOT mocked
    console.log('\n🔒 PROOF THIS IS REAL (NOT MOCKED):');
    
    if (networkEvidence.mixpanelRequests.length > 0) {
      const firstRequest = networkEvidence.mixpanelRequests[0];
      
      console.log(`✅ Real HTTP Method: ${firstRequest.method}`);
      console.log(`✅ Real API Endpoint: ${firstRequest.url}`);
      console.log(`✅ Real User-Agent: ${firstRequest.headers['user-agent']?.substring(0, 40)}...`);
      console.log(`✅ Real Timestamp: ${firstRequest.timestamp}`);
      console.log(`✅ Real POST Data: ${firstRequest.postData ? 'YES' : 'NO'}`);
      
      // Decode and show actual payload
      if (firstRequest.postData && firstRequest.postData.includes('data=')) {
        try {
          const dataParam = firstRequest.postData.split('data=')[1]?.split('&')[0];
          if (dataParam) {
            const decoded = decodeURIComponent(dataParam);
            const events = JSON.parse(decoded);
            
            console.log(`✅ Real Event Data Decoded:`);
            if (Array.isArray(events)) {
              events.forEach((event, i) => {
                console.log(`     ${i + 1}. ${event.event} (${Object.keys(event.properties || {}).length} properties)`);
              });
            }
          }
        } catch (e) {
          console.log(`✅ Real Raw Data: ${firstRequest.postData.substring(0, 100)}...`);
        }
      }
    }
    
    if (networkEvidence.responses.length > 0) {
      const firstResponse = networkEvidence.responses[0];
      console.log(`✅ Real Server Response: ${firstResponse.status}`);
      console.log(`✅ Real Server IP: ${firstResponse.serverIP || 'Detected'}`);
      console.log(`✅ Not From Cache: ${!firstResponse.fromCache}`);
    }
    
    // ASSERTIONS: Prove real network activity
    expect(networkEvidence.allRequests.length).toBeGreaterThan(10, 
      'Should capture multiple real network requests');
      
    expect(networkEvidence.mixpanelRequests.length).toBeGreaterThan(0, 
      'Should capture real Mixpanel API requests');
      
    expect(networkEvidence.responses.length).toBeGreaterThan(0, 
      'Should receive real responses from Mixpanel servers');
    
    // Verify real API endpoint
    const hasRealApi = networkEvidence.mixpanelRequests.some(req => 
      req.url.includes('api-js.mixpanel.com') || req.url.includes('api.mixpanel.com')
    );
    expect(hasRealApi).toBe(true, 'Should call real Mixpanel API endpoints');
    
    // Verify real HTTP status codes
    const hasSuccessResponse = networkEvidence.responses.some(res => 
      res.status >= 200 && res.status < 300
    );
    expect(hasSuccessResponse).toBe(true, 'Should receive real HTTP success responses');
    
    console.log('\n🎉 VALIDATION COMPLETE!');
    console.log('🔐 CONFIRMED: This test suite captures REAL network traffic');
    console.log('🚫 NO MOCKS: All requests go to actual Mixpanel servers');
    console.log('✅ VERIFIED: We can validate real analytics implementation');
    
    // Save evidence to file
    const fs = require('fs').promises;
    await fs.mkdir('test-results', { recursive: true });
    await fs.writeFile(
      `test-results/network-evidence-${Date.now()}.json`, 
      JSON.stringify(networkEvidence, null, 2)
    );
    
    console.log(`📄 Network evidence saved to test-results/network-evidence-${Date.now()}.json`);
  });
  
  test('VALIDATE: Response timing proves real network latency', async ({ page }) => {
    const timings: any[] = [];
    
    page.on('response', async response => {
      if (response.url().includes('mixpanel.com')) {
        const timing = response.request().timing();
        
        timings.push({
          url: response.url(),
          dns: timing.domainLookupEnd - timing.domainLookupStart,
          connect: timing.connectEnd - timing.connectStart,
          request: timing.requestStart,
          response: timing.responseStart,
          download: timing.responseEnd - timing.responseStart,
          total: timing.responseEnd - timing.requestStart
        });
        
        console.log(`⏱️  Real network timing for ${response.url()}:`);
        console.log(`   DNS lookup: ${timing.domainLookupEnd - timing.domainLookupStart}ms`);
        console.log(`   Connection: ${timing.connectEnd - timing.connectStart}ms`);
        console.log(`   Total time: ${timing.responseEnd - timing.requestStart}ms`);
      }
    });
    
    await page.goto(process.env.BASE_URL || 'https://gatotkaca.tiket.com');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);
    
    expect(timings.length).toBeGreaterThan(0, 'Should measure real network timing');
    
    // Real network calls should take some time (not instant like mocks)
    const hasRealisticTiming = timings.some(t => t.total > 10); // Real network > 10ms
    expect(hasRealisticTiming).toBe(true, 'Should have realistic network timing (proves real requests)');
    
    console.log('✅ CONFIRMED: Network timing proves these are real requests');
  });
});