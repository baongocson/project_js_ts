import { expect, type Page } from '@playwright/test';
import { methodGroups } from '../../src/features/processing/methods';
import type { WorkspaceTab } from '../../src/shared/ui';

export async function openStep(page: Page, step: WorkspaceTab) {
  const button = page.locator(`.section-tabs button[data-step="${step}"]`);
  await expect(button).toBeVisible();
  if (await button.getAttribute('aria-current') !== 'page') await button.click();
}
export async function ensureProcessing(page: Page) {
  if (!await page.getByLabel('Phương pháp', { exact: true }).isVisible()) await openStep(page, 'cleaning');
}
export async function chooseMethod(page: Page, method: string) {
  const group = Object.entries(methodGroups).find(([, methods]) => methods.some(value => value === method))?.[0] as WorkspaceTab | undefined;
  if (!group) throw new Error(`No UI group for ${method}`);
  await openStep(page, group);
  await page.getByLabel('Phương pháp', { exact: true }).selectOption(method);
}
