import { expect, test } from '@playwright/test';

test('changes the application language from Settings', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: '本地用户' }).click();
  await page.getByRole('link', { name: '设置' }).click();
  await expect(page).toHaveURL('/settings/general');

  await page.getByRole('button', { name: '界面语言' }).click();
  await page.getByRole('option', { name: 'English' }).click();

  await expect(page.getByRole('heading', { name: 'General' })).toBeVisible();
  await page.getByRole('link', { name: 'Back to app' }).click();
  await expect(page.getByRole('heading', { name: 'New chat' })).toBeVisible();
});
