import { expect, test, type Page } from '@playwright/test';

const credentials = {
  ADMIN: process.env.ESTATEOS_ADMIN,
  MANAGER: process.env.ESTATEOS_MANAGER,
  OWNER: process.env.ESTATEOS_OWNER,
  TENANT: process.env.ESTATEOS_TENANT,
  MAINTENANCE: process.env.ESTATEOS_MAINTENANCE,
} as const;

async function signIn(page: Page, credential: string) {
  const [email, password] = credential.split(':');
  await page.goto('/');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
}

for (const [role, credential] of Object.entries(credentials)) {
  test(`${role} can authenticate and open the role workspace`, async ({ page }) => {
    test.skip(!credential, `Set ESTATEOS_${role}=email:password to run this production workflow`);
    await signIn(page, credential!);
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
    await expect(page.getByText(role === 'TENANT' ? 'Resident portal' : role === 'OWNER' ? 'Owner portal' : 'Portfolio workspace')).toBeVisible();
  });
}

test('tenant can submit a maintenance request', async ({ page }) => {
  test.skip(!credentials.TENANT, 'Set ESTATEOS_TENANT=email:password');
  await signIn(page, credentials.TENANT!);
  await page.getByRole('button', { name: /Request service/ }).click();
  await page.getByLabel('Issue').fill('E2E test maintenance request');
  await page.getByLabel('Details').fill('Automated end-to-end workflow verification request.');
  await page.getByRole('button', { name: 'Save maintenance' }).click();
  await expect(page.getByText('Maintenance saved successfully')).toBeVisible();
});
