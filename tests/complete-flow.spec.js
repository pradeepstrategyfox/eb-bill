import { test, expect } from '@playwright/test';

const BASE_URL = 'https://eb-bill-virid.vercel.app';

test.describe('Complete Application Flow Test', () => {
    const timestamp = Date.now();
    const testEmail = `test${timestamp}@example.com`;
    const testPassword = 'TestPass123!';
    const testName = 'Test User';

    test('Full user journey: Signup → Setup Wizard → Dashboard', async ({ page }) => {
        // Set longer timeout for this comprehensive test
        test.setTimeout(120000);

        console.log('=== Starting Comprehensive Application Test ===');
        console.log(`Test Email: ${testEmail}`);

        // ========================================
        // STEP 1: Navigate to Home/Signup
        // ========================================
        console.log('\n[1/8] Navigating to signup page...');
        await page.goto(BASE_URL);
        await page.waitForLoadState('networkidle');

        // Take screenshot of landing page
        await page.screenshot({ path: `tests/screenshots/01-landing-page.png`, fullPage: true });

        // Check if we're on login or signup page
        const url = page.url();
        console.log(`Current URL: ${url}`);

        // Navigate to signup if on login page
        if (url.includes('/login')) {
            const signupLink = page.locator('a:has-text("Sign")');
            await signupLink.click();
            await page.waitForURL('**/signup', { timeout: 10000 });
        }

        // ========================================
        // STEP 2: Test Signup Form
        // ========================================
        console.log('\n[2/8] Testing signup form...');
        await page.screenshot({ path: `tests/screenshots/02-signup-page.png`, fullPage: true });

        // Check for name field
        const nameField = page.locator('input[name="name"], input#name');
        const emailField = page.locator('input[name="email"], input#email, input[type="email"]');
        const passwordField = page.locator('input[name="password"], input#password, input[type="password"]');

        const nameFieldExists = await nameField.count() > 0;
        console.log(`Name field exists: ${nameFieldExists}`);

        if (nameFieldExists) {
            console.log('✓ Name field found - filling form...');
            await nameField.fill(testName);
            await emailField.fill(testEmail);
            await passwordField.fill(testPassword);
        } else {
            console.log('⚠ Name field NOT found - filling email and password only...');
            await emailField.fill(testEmail);
            await passwordField.fill(testPassword);
        }

        await page.screenshot({ path: `tests/screenshots/03-signup-filled.png`, fullPage: true });

        // Submit signup form
        const submitButton = page.locator('button[type="submit"]');
        await submitButton.click();
        console.log('Signup form submitted...');

        // Wait for response - could be error or redirect
        await page.waitForTimeout(3000);
        await page.screenshot({ path: `tests/screenshots/04-after-signup.png`, fullPage: true });

        // Check for errors
        const errorMessage = page.locator('.error-message, [class*="error"]');
        const hasError = await errorMessage.count() > 0;

        if (hasError) {
            const errorText = await errorMessage.first().textContent();
            console.log(`❌ Signup Error: ${errorText}`);

            // Log console errors
            page.on('console', msg => console.log('Browser Console:', msg.text()));

            throw new Error(`Signup failed: ${errorText}`);
        }

        // Check if redirected to setup wizard
        await page.waitForTimeout(2000);
        const currentUrl = page.url();
        console.log(`After signup URL: ${currentUrl}`);

        if (!currentUrl.includes('/setup')) {
            console.log('❌ Not redirected to setup wizard');
            const bodyText = await page.locator('body').textContent();
            console.log('Page content:', bodyText.substring(0, 500));
            throw new Error('Expected redirect to /setup after signup');
        }

        console.log('✓ Successfully signed up and redirected to setup wizard');

        // ========================================
        // STEP 3: Setup Wizard - Step 1 (Home Details)
        // ========================================
        console.log('\n[3/8] Testing Setup Wizard - Step 1: Home Details...');
        await page.screenshot({ path: `tests/screenshots/05-setup-step1.png`, fullPage: true });

        // Verify we're on step 1
        const step1Active = page.locator('.step.active, .step-indicator .step:first-child.active');
        expect(await step1Active.count()).toBeGreaterThan(0);

        // Fill home details
        const homeNameInput = page.locator('input[type="text"]').first();
        const roomsInput = page.locator('input[type="number"]').first();

        await homeNameInput.fill('My Test Home');
        await roomsInput.fill('3');

        await page.screenshot({ path: `tests/screenshots/06-setup-step1-filled.png`, fullPage: true });

        // Click Next
        const nextButton = page.locator('button:has-text("Next")');
        await nextButton.click();
        await page.waitForTimeout(1000);

        console.log('✓ Step 1 completed');

        // ========================================
        // STEP 4: Setup Wizard - Step 2 (Room Configuration)
        // ========================================
        console.log('\n[4/8] Testing Setup Wizard - Step 2: Room Configuration...');
        await page.screenshot({ path: `tests/screenshots/07-setup-step2.png`, fullPage: true });

        // Verify 3 room cards are created
        const roomCards = page.locator('.room-card');
        const roomCount = await roomCards.count();
        console.log(`Room cards found: ${roomCount}`);
        expect(roomCount).toBe(3);

        // Configure rooms
        const room1Name = roomCards.nth(0).locator('input[type="text"]');
        const room1Type = roomCards.nth(0).locator('select');

        await room1Name.fill('Living Room');
        await room1Type.selectOption('hall');

        await page.screenshot({ path: `tests/screenshots/08-setup-step2-configured.png`, fullPage: true });

        // Click Next to Step 3
        const nextButton2 = page.locator('button:has-text("Next")');
        await nextButton2.click();
        await page.waitForTimeout(1000);

        console.log('✓ Step 2 completed');

        // ========================================
        // STEP 5: Setup Wizard - Step 3 (Appliances)
        // ========================================
        console.log('\n[5/8] Testing Setup Wizard - Step 3: Add Appliances...');
        await page.screenshot({ path: `tests/screenshots/09-setup-step3.png`, fullPage: true });

        // Wait for appliances to load
        await page.waitForTimeout(2000);

        // Check if appliances are displayed
        const applianceCards = page.locator('.appliance-card');
        const applianceCount = await applianceCards.count();
        console.log(`Appliance cards found: ${applianceCount}`);

        if (applianceCount > 0) {
            // Select a few appliances
            await applianceCards.nth(0).click(); // Select first appliance
            await page.waitForTimeout(500);
            await applianceCards.nth(1).click(); // Select second appliance
            await page.waitForTimeout(500);

            console.log('✓ Selected 2 appliances');
        } else {
            console.log('⚠ No appliances found - may be an issue with appliance library');
        }

        await page.screenshot({ path: `tests/screenshots/10-setup-step3-selected.png`, fullPage: true });

        // Click Finish Setup
        const finishButton = page.locator('button:has-text("Finish")');
        await finishButton.click();
        console.log('Clicked Finish Setup...');

        await page.waitForTimeout(3000);
        await page.screenshot({ path: `tests/screenshots/11-after-finish.png`, fullPage: true });

        // ========================================
        // STEP 6: Verify Dashboard Load
        // ========================================
        console.log('\n[6/8] Verifying dashboard loaded...');

        const finalUrl = page.url();
        console.log(`Final URL: ${finalUrl}`);

        if (!finalUrl.includes('/dashboard')) {
            // Check for errors
            const setupError = page.locator('.error-message, [class*="error"]');
            if (await setupError.count() > 0) {
                const errorText = await setupError.first().textContent();
                console.log(`❌ Setup Error: ${errorText}`);
            }

            const bodyText = await page.locator('body').textContent();
            console.log('Page content:', bodyText.substring(0, 500));

            throw new Error('Expected redirect to /dashboard after setup');
        }

        await page.screenshot({ path: `tests/screenshots/12-dashboard.png`, fullPage: true });
        console.log('✓ Dashboard loaded successfully');

        // ========================================
        // STEP 7: Test Dashboard Functionality
        // ========================================
        console.log('\n[7/8] Testing dashboard functionality...');

        // Check for key dashboard elements
        const hasStats = await page.locator('.stat-card, .stats-grid, [class*="stat"]').count() > 0;
        const hasAppliances = await page.locator('.appliance-card, [class*="appliance"]').count() > 0;

        console.log(`Dashboard has stats: ${hasStats}`);
        console.log(`Dashboard has appliances: ${hasAppliances}`);

        if (hasAppliances) {
            // Try toggling an appliance
            const firstAppliance = page.locator('.appliance-card, [class*="appliance"]').first();
            await firstAppliance.click();
            await page.waitForTimeout(1000);
            await page.screenshot({ path: `tests/screenshots/13-appliance-toggled.png`, fullPage: true });
            console.log('✓ Toggled appliance');
        }

        // ========================================
        // STEP 8: Test Navigation
        // ========================================
        console.log('\n[8/8] Testing navigation to other pages...');

        // Try navigating to insights
        const insightsLink = page.locator('a[href="/insights"], a:has-text("Insights")');
        if (await insightsLink.count() > 0) {
            await insightsLink.click();
            await page.waitForTimeout(2000);
            await page.screenshot({ path: `tests/screenshots/14-insights-page.png`, fullPage: true });
            console.log('✓ Navigated to Insights page');
        }

        // Navigate back to dashboard
        const dashboardLink = page.locator('a[href="/dashboard"], a:has-text("Dashboard")');
        if (await dashboardLink.count() > 0) {
            await dashboardLink.click();
            await page.waitForTimeout(1000);
        }

        console.log('\n=== Test Completed Successfully ===');
    });
});
