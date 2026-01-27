# Mixpanel Analytics E2E Testing Suite

A comprehensive Playwright-based testing suite for validating Mixpanel analytics migration across different environments.

## 🎯 Purpose

This testing suite ensures that your Mixpanel analytics implementation works correctly by:
- ✅ Verifying page visit events are tracked
- ✅ Testing user interaction tracking (clicks, form submissions)
- ✅ Validating API calls to `https://api-js.mixpanel.com/track/`
- ✅ Inspecting and validating event payloads
- ✅ Supporting multiple environments (staging/production)
- ✅ Cross-browser testing support

## 🚀 Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Install Playwright Browsers

```bash
pnpm run install-browsers
```

**Or run setup command to do both:**
```bash
pnpm run setup
```

### 3. Configure Environment

Copy the environment file:

```bash
cp .env.staging .env.local
```

Edit `.env.local` and update the URLs to match your actual page:
```env
BASE_URL=https://your-staging-domain.com
```

### 4. Run Tests

**Run with Browser UI (Debug Mode):**
```bash
pnpm run test:headed
```

**Interactive Debug Mode:**
```bash
pnpm run test:debug
```

## 📊 Test Reports

After running tests, view the detailed HTML report:
```bash
pnpm run show-report
```

You can also check the button click report on `tests-results folder with the filename button-click-report.html`.

## 🧪 Test Suites

### 1. Main Page Analytics (`main-page.spec.ts`)
- Tests page visit tracking on your desired page
- Validates button click events
- Verifies Mixpanel API calls and payloads

### 4. Network Validation (`network-validation.spec.ts`)
- API endpoint verification
- Payload structure validation
- Performance monitoring
- Cross-environment consistency checks

## 🔧 Configuration

### Add Expected Events 
In `tests/data/main-page.ts`, define the expected initial Mixpanel events for page with add new events as needed on the array:
```typescript
export const expectedEvents = [
  'page_view',
];
```

also to add new click expected events on the array:
```typescript
export const expectedClickEvents = [
  'button_click',
];
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ENV` | Environment (staging/production) | `staging` |
| `BASE_URL` | Your main Page | - |
| `MIXPANEL_API_URL` | Mixpanel API endpoint | `https://api-js.mixpanel.com/track/` |
| `DEFAULT_TIMEOUT` | Default test timeout (ms) | `30000` |
| `PAGE_LOAD_TIMEOUT` | Page load timeout (ms) | `10000` |
| `DEBUG_MODE` | Enable debug logging | `false` |
| `HEADLESS_MODE` | Run tests in headless mode | `true` |

### Browser Configuration

Tests run on multiple browsers by default:
- Chrome (Desktop)
- Firefox (Desktop)  
- Safari (Desktop)
- Chrome (Mobile)
- Safari (Mobile)

To run on specific browser:
```bash
npx playwright test --project=chromium
```

## 📝 Test Output

The test suite provides comprehensive logging:

1. **Event Tracking:** Detailed logs of all captured Mixpanel events
2. **API Calls:** Complete list of network requests to Mixpanel
3. **Payloads:** Decoded and formatted event payloads
4. **Screenshots:** Automatic screenshots at key test points
5. **Performance:** Response times and network analysis

Example output:
```json
{
  "event": "page_view",
  "properties": {
    "url": "https://gatotkaca.tiket.com/",
    "timestamp": 1643723400000,
    "user_agent": "Mozilla/5.0...",
    "screen_width": 1920
  }
}
```

## 🐛 Debugging

### Common Issues

1. **No events captured:**
   - Check if Mixpanel is properly loaded on the page
   - Verify the correct API endpoint in logs
   - Increase timeout values

2. **Environment-specific failures:**
   - Ensure correct `.env.local` configuration
   - Verify URL accessibility
   - Check for environment-specific Mixpanel configurations

3. **Test timeouts:**
   - Increase `DEFAULT_TIMEOUT` in environment file
   - Check network connectivity
   - Run with `--headed` flag to observe browser behavior

### Debug Mode

Run tests in debug mode to step through:
```bash
npm run test:debug
```

View browser console logs:
```bash
npx playwright test --headed --debug
```

## 🎨 Customization

### Adding New Tests

1. Create new test file in `/tests/` directory
2. Import required utilities:
```typescript
import { test, expect } from '@playwright/test';
import { MixpanelTracker } from '../utils/mixpanel-tracker';
import { PageHelpers } from '../utils/page-helpers';
```

3. Follow the existing pattern:
```typescript
test.describe('Your Test Suite', () => {
  let mixpanelTracker: MixpanelTracker;
  let pageHelpers: PageHelpers;

  test.beforeEach(async ({ page }) => {
    mixpanelTracker = new MixpanelTracker(page);
    pageHelpers = new PageHelpers(page);
  });

  test('should track your event', async ({ page }) => {
    await page.goto('/your-page');
    // Your test logic
    const event = await mixpanelTracker.waitForEvent('your_event');
    expect(event).toBeDefined();
  });
});
```

### Custom Event Tracking

Extend `MixpanelTracker` for custom event validation:
```typescript
// Check for specific event properties
const hasCustomProperty = event.properties.your_custom_field;
expect(hasCustomProperty).toBeDefined();

// Wait for events with specific conditions
const filteredEvents = mixpanelTracker.getMixpanelPayloads()
  .filter(event => event.properties.page_type === 'checkout');
```

**Happy Testing! 🎉**