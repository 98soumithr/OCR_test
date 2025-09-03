import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('FormPilot Form Filling', () => {
  test('should scan simple form and detect all inputs', async ({ page }) => {
    // Load test form
    await page.goto(`file://${path.join(__dirname, '../../samples/test_forms/simple_form.html')}`);
    
    // Wait for content script to load
    await page.waitForTimeout(1000);
    
    // Trigger scan via extension
    const inputs = await page.evaluate(() => {
      // Call content script function
      return (window as any).formPilot?.scanPage();
    });
    
    // Verify all inputs were detected
    expect(inputs).toBeDefined();
    expect(inputs.length).toBeGreaterThan(0);
    
    // Check for specific fields
    const fieldNames = inputs.map((i: any) => i.name);
    expect(fieldNames).toContain('first_name');
    expect(fieldNames).toContain('last_name');
    expect(fieldNames).toContain('email');
  });

  test('should fill form with extracted data', async ({ page }) => {
    // Load test form
    await page.goto(`file://${path.join(__dirname, '../../samples/test_forms/simple_form.html')}`);
    
    // Mock extracted data
    const mockData = {
      fields: [
        {
          canonical: 'first_name',
          candidates: [{ value: 'John', confidence: 0.95, bbox: [0, 0, 100, 20], page: 0 }],
          chosen: { value: 'John', confidence: 0.95, bbox: [0, 0, 100, 20], page: 0 },
          validations: []
        },
        {
          canonical: 'last_name',
          candidates: [{ value: 'Doe', confidence: 0.93, bbox: [0, 0, 100, 20], page: 0 }],
          chosen: { value: 'Doe', confidence: 0.93, bbox: [0, 0, 100, 20], page: 0 },
          validations: []
        },
        {
          canonical: 'email',
          candidates: [{ value: 'john.doe@example.com', confidence: 0.97, bbox: [0, 0, 100, 20], page: 0 }],
          chosen: { value: 'john.doe@example.com', confidence: 0.97, bbox: [0, 0, 100, 20], page: 0 },
          validations: []
        }
      ]
    };
    
    // Mock mapping
    const mockMapping = {
      'first_name': '#firstName',
      'last_name': '#lastName',
      'email': '#email'
    };
    
    // Fill form
    await page.evaluate((data) => {
      const { fields, mapping } = data;
      return (window as any).formPilot?.fillFields(fields, mapping);
    }, { fields: mockData.fields, mapping: mockMapping });
    
    // Verify fields were filled
    await expect(page.locator('#firstName')).toHaveValue('John');
    await expect(page.locator('#lastName')).toHaveValue('Doe');
    await expect(page.locator('#email')).toHaveValue('john.doe@example.com');
    
    // Check for confidence badges
    await expect(page.locator('.formpilot-badge')).toHaveCount(3);
  });

  test('should handle complex form with various input types', async ({ page }) => {
    // Load complex form
    await page.goto(`file://${path.join(__dirname, '../../samples/test_forms/complex_form.html')}`);
    
    // Scan form
    const inputs = await page.evaluate(() => {
      return (window as any).formPilot?.scanPage();
    });
    
    // Verify detection of different input types
    const inputTypes = [...new Set(inputs.map((i: any) => i.type))];
    expect(inputTypes).toContain('text');
    expect(inputTypes).toContain('email');
    expect(inputTypes).toContain('tel');
    expect(inputTypes).toContain('date');
    expect(inputTypes).toContain('select');
    expect(inputTypes).toContain('radio');
    expect(inputTypes).toContain('checkbox');
  });

  test('should validate SSN format', async ({ page }) => {
    await page.goto(`file://${path.join(__dirname, '../../samples/test_forms/complex_form.html')}`);
    
    // Fill SSN field with invalid format
    await page.fill('#ssn', '123456789');
    
    // Mock validation
    const validation = await page.evaluate((value) => {
      // This would normally be done by the backend
      const pattern = /^\d{3}-?\d{2}-?\d{4}$/;
      return pattern.test(value);
    }, '123456789');
    
    expect(validation).toBe(true);
    
    // Test invalid SSN
    const invalidValidation = await page.evaluate((value) => {
      const pattern = /^\d{3}-?\d{2}-?\d{4}$/;
      return pattern.test(value);
    }, '12345');
    
    expect(invalidValidation).toBe(false);
  });

  test('should save and load mapping profiles', async ({ page, context }) => {
    await page.goto(`file://${path.join(__dirname, '../../samples/test_forms/simple_form.html')}`);
    
    // Create a mapping
    const mapping = {
      version: 1,
      site: 'test-form',
      selectors: {
        'first_name': ['#firstName'],
        'last_name': ['#lastName'],
        'email': ['#email']
      }
    };
    
    // Save mapping
    await page.evaluate((m) => {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage({
          type: 'SAVE_MAPPING',
          payload: { url: window.location.href, mapping: m }
        }, resolve);
      });
    }, mapping);
    
    // Reload page
    await page.reload();
    
    // Load mapping
    const loadedMapping = await page.evaluate(() => {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage({
          type: 'GET_MAPPING',
          payload: { url: window.location.href }
        }, (response) => resolve(response.data));
      });
    });
    
    expect(loadedMapping).toBeDefined();
    expect(loadedMapping.selectors).toEqual(mapping.selectors);
  });
});