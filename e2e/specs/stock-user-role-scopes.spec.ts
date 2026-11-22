import { expect, test } from '@playwright/test';
import { roleScopeOperationTypes, userRoleScopeMock } from '../../__mocks__/user-role-scope.mock';

test.use({ viewport: { width: 1024, height: 900 } });

test('keeps role scope actions visible and usable at 1024px with long location names', async ({ page }) => {
  await page.route('**/ws/rest/v1/stockmanagement/userrolescope?*', (route) =>
    route.fulfill({
      json: {
        results: [{ ...userRoleScopeMock, operationTypes: userRoleScopeMock.operationTypes.slice(0, 4) }],
        totalCount: 1,
        links: [],
      },
    }),
  );
  await page.route('**/ws/rest/v1/stockmanagement/stockoperationtype?*', (route) =>
    route.fulfill({
      json: { results: roleScopeOperationTypes, totalCount: roleScopeOperationTypes.length, links: [] },
    }),
  );

  await page.goto(`${process.env.E2E_BASE_URL.replace(/\/$/, '')}/spa/stock-management/user-scopes`);
  const row = page.getByRole('row', { name: /Doe Jane/ });
  await expect(row).toBeVisible();
  await page.evaluate(() => document.fonts.ready);

  await expect(page.getByRole('link', { name: 'User role scopes', exact: true })).toBeInViewport({ ratio: 1 });
  await expect(row.getByText('Central Medical Supplies Main Store +children')).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Actions', exact: true })).toBeInViewport({ ratio: 1 });
  const edit = row.getByRole('button', { name: 'Edit user role scope', exact: true });
  const remove = row.getByRole('button', { name: 'Delete user role scope', exact: true });
  await expect(edit).toBeInViewport({ ratio: 1 });
  await expect(remove).toBeInViewport({ ratio: 1 });
  await edit.click({ trial: true });

  await row.getByRole('button', { name: '+2 more', exact: true }).click();
  await expect(page.getByText('Community Outreach Supply Store', { exact: true })).toBeVisible();
  await expect(edit).toBeInViewport({ ratio: 1 });
  await expect(remove).toBeInViewport({ ratio: 1 });
  await edit.click({ trial: true });
});
