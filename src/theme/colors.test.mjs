import assert from 'node:assert/strict';
import test from 'node:test';

import { getAppColors } from './colors.ts';

test('uses the warm paper palette in light mode', () => {
  assert.equal(getAppColors('light').background, '#FAF8EF');
  assert.equal(getAppColors('light').accent, '#165D4D');
});

test('uses a dark ink palette in dark mode', () => {
  assert.equal(getAppColors('dark').background, '#171E1A');
  assert.equal(getAppColors('dark').foreground, '#F4F2E9');
});

test('keeps control boundaries and active tab labels at accessible contrast', () => {
  const luminance = (hex) => {
    const channels = hex.match(/[a-f\d]{2}/gi).map((channel) => parseInt(channel, 16) / 255);
    const linear = channels.map((channel) =>
      channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
    );
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  };

  for (const scheme of ['light', 'dark']) {
    const { accentText, inputBorder, surface } = getAppColors(scheme);
    const contrastAgainstSurface = (color) =>
      (Math.max(luminance(color), luminance(surface)) + 0.05) /
      (Math.min(luminance(color), luminance(surface)) + 0.05);
    const borderContrast = contrastAgainstSurface(inputBorder);
    const tabLabelContrast = contrastAgainstSurface(accentText);
    assert.ok(borderContrast >= 3, `${scheme} input border contrast was ${borderContrast.toFixed(2)}:1`);
    assert.ok(tabLabelContrast >= 4.5, `${scheme} active tab label contrast was ${tabLabelContrast.toFixed(2)}:1`);
  }
});
