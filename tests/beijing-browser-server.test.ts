import { expect, it } from 'vitest';

const helperModule: string = new URL('beijing-browser-server.cjs', import.meta.url).href;
const { compiledBase } = await import(helperModule) as { compiledBase(html: string): string };

it.each(['/', '/TransitTales/', '/nested/TransitTales/'])('infers compiled %s independently of the current environment', base => {
  const html = `<html><script type="module" crossorigin src="${base}assets/beijing-123.js"></script></html>`;
  expect(compiledBase(html)).toBe(base);
});

it('accepts reordered attributes and single-quoted asset paths', () => {
  expect(compiledBase("<script src='/TransitTales/assets/beijing-123.js' crossorigin type='module'></script>")).toBe('/TransitTales/');
});

it('fails clearly instead of silently serving an unknown compiled base at root', () => {
  expect(() => compiledBase('<html></html>')).toThrow(/Set TRANSIT_PREVIEW_BASE explicitly/);
  expect(() => compiledBase('<script src="https://example.com/assets/beijing.js"></script>')).toThrow(/Set TRANSIT_PREVIEW_BASE explicitly/);
});
