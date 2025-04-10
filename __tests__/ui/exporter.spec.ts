import { test, expect } from '@sand4rt/experimental-ct-web';
import { Exporter } from '../../packages/ui/src';

test('should display zoom correctly.', async ({ mount }) => {
  const component = await mount(Exporter, {});
  await expect(
    component.locator("sl-icon-button [name='download']"),
  ).toBeVisible();
});
