import { test, expect } from '@playwright/test';

test.describe('FormPilot Extension', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to test form
    await page.goto('/samples/test-form.html');
  });

  test('should load the test form', async ({ page }) => {
    await expect(page).toHaveTitle(/FormPilot Test Form/);
    await expect(page.locator('input[name="firstName"]')).toBeVisible();
    await expect(page.locator('input[name="lastName"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
  });

  test('should fill form fields with test data', async ({ page }) => {
    // Fill form fields
    await page.fill('input[name="firstName"]', 'John');
    await page.fill('input[name="lastName"]', 'Doe');
    await page.fill('input[name="email"]', 'john.doe@example.com');
    await page.fill('input[name="phone"]', '(555) 123-4567');
    await page.fill('input[name="address"]', '123 Main St');
    await page.fill('input[name="city"]', 'Anytown');
    await page.selectOption('select[name="state"]', 'CA');
    await page.fill('input[name="zip"]', '12345');
    await page.fill('input[name="dob"]', '1990-01-01');
    await page.fill('input[name="ssn"]', '123-45-6789');

    // Verify values
    await expect(page.locator('input[name="firstName"]')).toHaveValue('John');
    await expect(page.locator('input[name="lastName"]')).toHaveValue('Doe');
    await expect(page.locator('input[name="email"]')).toHaveValue('john.doe@example.com');
    await expect(page.locator('input[name="phone"]')).toHaveValue('(555) 123-4567');
    await expect(page.locator('input[name="address"]')).toHaveValue('123 Main St');
    await expect(page.locator('input[name="city"]')).toHaveValue('Anytown');
    await expect(page.locator('select[name="state"]')).toHaveValue('CA');
    await expect(page.locator('input[name="zip"]')).toHaveValue('12345');
    await expect(page.locator('input[name="dob"]')).toHaveValue('1990-01-01');
    await expect(page.locator('input[name="ssn"]')).toHaveValue('123-45-6789');
  });

  test('should validate required fields', async ({ page }) => {
    // Try to submit without filling required fields
    await page.click('button[type="submit"]');
    
    // Check that required field validation is triggered
    await expect(page.locator('input[name="firstName"]:invalid')).toBeVisible();
    await expect(page.locator('input[name="lastName"]:invalid')).toBeVisible();
    await expect(page.locator('input[name="email"]:invalid')).toBeVisible();
  });

  test('should submit form with valid data', async ({ page }) => {
    // Fill all required fields
    await page.fill('input[name="firstName"]', 'John');
    await page.fill('input[name="lastName"]', 'Doe');
    await page.fill('input[name="email"]', 'john.doe@example.com');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Check for success message (alert)
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('Form submitted');
      await dialog.accept();
    });
  });
});

test.describe('Complex Form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/samples/complex-test-form.html');
  });

  test('should load the complex form', async ({ page }) => {
    await expect(page).toHaveTitle(/Complex FormPilot Test Form/);
    await expect(page.locator('input[name="firstName"]')).toBeVisible();
    await expect(page.locator('input[name="ssn"]')).toBeVisible();
    await expect(page.locator('input[name="ein"]')).toBeVisible();
  });

  test('should fill complex form fields', async ({ page }) => {
    // Personal Information
    await page.fill('input[name="firstName"]', 'Jane');
    await page.fill('input[name="middleName"]', 'Marie');
    await page.fill('input[name="lastName"]', 'Smith');
    await page.fill('input[name="dob"]', '1985-05-15');
    await page.fill('input[name="ssn"]', '987-65-4321');
    
    // Contact Information
    await page.fill('input[name="email"]', 'jane.smith@example.com');
    await page.fill('input[name="phone"]', '(555) 987-6543');
    await page.fill('input[name="address"]', '456 Oak Ave');
    await page.fill('input[name="city"]', 'Springfield');
    await page.selectOption('select[name="state"]', 'NY');
    await page.fill('input[name="zip"]', '54321');
    
    // Employment Information
    await page.fill('input[name="employer"]', 'Acme Corp');
    await page.fill('input[name="jobTitle"]', 'Software Engineer');
    await page.fill('input[name="salary"]', '75000');
    await page.fill('input[name="ein"]', '98-7654321');
    
    // Preferences
    await page.check('input[name="contactMethod"][value="email"]');
    await page.check('input[name="interests"][value="technology"]');
    await page.check('input[name="interests"][value="finance"]');
    
    // Additional Information
    await page.fill('textarea[name="comments"]', 'This is a test comment');
    await page.fill('input[name="reference"]', 'REF-789012');

    // Verify some key values
    await expect(page.locator('input[name="firstName"]')).toHaveValue('Jane');
    await expect(page.locator('input[name="ssn"]')).toHaveValue('987-65-4321');
    await expect(page.locator('input[name="ein"]')).toHaveValue('98-7654321');
    await expect(page.locator('input[name="contactMethod"][value="email"]')).toBeChecked();
    await expect(page.locator('input[name="interests"][value="technology"]')).toBeChecked();
  });
});