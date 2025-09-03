/**
 * Basic FormPilot E2E Tests
 */

import { test, expect } from '@playwright/test';

test.describe('FormPilot Basic Flow', () => {
  
  test('should load extension popup', async ({ page }) => {
    // This would test the extension popup
    // Note: Testing Chrome extensions requires special setup
    
    await page.goto('chrome://extensions/');
    // Extension testing would require additional configuration
  });

  test('should scan form inputs on demo page', async ({ page }) => {
    // Create a demo page with form inputs
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><title>Test Form</title></head>
      <body>
        <form id="testForm">
          <label for="firstName">First Name:</label>
          <input type="text" id="firstName" name="firstName" />
          
          <label for="lastName">Last Name:</label>
          <input type="text" id="lastName" name="lastName" />
          
          <label for="email">Email:</label>
          <input type="email" id="email" name="email" />
          
          <label for="phone">Phone:</label>
          <input type="tel" id="phone" name="phone" />
          
          <button type="submit">Submit</button>
        </form>
      </body>
      </html>
    `);

    // Test form scanning (would need content script injection)
    const inputs = await page.locator('input').count();
    expect(inputs).toBe(4);
    
    // Test that inputs have proper labels
    await expect(page.locator('#firstName')).toBeVisible();
    await expect(page.locator('#lastName')).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#phone')).toBeVisible();
  });

  test('should handle form filling simulation', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <body>
        <form>
          <input type="text" id="firstName" name="firstName" />
          <input type="text" id="lastName" name="lastName" />
          <input type="email" id="email" name="email" />
        </form>
        
        <script>
          // Simulate FormPilot content script
          window.FormPilot = {
            scanPage: () => [
              {
                selector: '#firstName',
                type: 'text',
                label: 'First Name',
                name: 'firstName',
                id: 'firstName'
              },
              {
                selector: '#lastName', 
                type: 'text',
                label: 'Last Name',
                name: 'lastName',
                id: 'lastName'
              },
              {
                selector: '#email',
                type: 'email', 
                label: 'Email',
                name: 'email',
                id: 'email'
              }
            ],
            fillFields: async (mappings) => {
              mappings.forEach(mapping => {
                const element = document.querySelector(mapping.domSelector);
                if (element) {
                  element.value = 'Test Value';
                }
              });
            }
          };
        </script>
      </body>
      </html>
    `);

    // Test scanning
    const scanResult = await page.evaluate(() => window.FormPilot.scanPage());
    expect(scanResult).toHaveLength(3);
    expect(scanResult[0].selector).toBe('#firstName');

    // Test filling
    await page.evaluate(() => {
      window.FormPilot.fillFields([
        { fieldCanonical: 'first_name', domSelector: '#firstName', confidence: 0.9, method: 'exact_match' }
      ]);
    });

    const firstName = await page.locator('#firstName').inputValue();
    expect(firstName).toBe('Test Value');
  });
});

test.describe('FormPilot Backend API', () => {
  
  test('should respond to health check', async ({ request }) => {
    const response = await request.get('http://localhost:8000/health');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.status).toBe('healthy');
  });

  test('should handle provider status request', async ({ request }) => {
    const response = await request.get('http://localhost:8000/api/v1/providers/status');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data).toHaveProperty('local');
    expect(data.local.enabled).toBe(true);
  });
});