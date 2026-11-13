import { expect, it } from 'vitest';
import { initialWorkshopDocument } from './initial-workshop';
import { parseWorkshopDocument } from '../domain/workshop-document';
import { dimensions } from '../domain/design';

it('applies confirmed frame, Classic palette and integer sizes without approving pending data', async () => {
  const doc = await initialWorkshopDocument();
  expect(doc.geometry).toMatchObject({ tileMm:11, frameMm:10, minCells:15, maxCells:90, step:1 });
  expect(doc.colors).toHaveLength(29);expect(doc.largeFormat?.colors).toHaveLength(36);
  expect(doc.colors.every(c => c.enabled)).toBe(true);
  expect(doc.confirmations).toEqual({ geometry:false, palette:true, pricing:false, packaging:false, production:false, terms:false });
  for (let n=15;n<=90;n++) expect(dimensions(doc.geometry,n).framedMm).toBeGreaterThan(0);
  expect([15,45,90].map(n=>dimensions(doc.geometry,n).framedMm)).toEqual([199,559,1099]);
  expect(doc.productionDays).toBeNull();
  expect(doc.capacity).toBeNull();
  expect(() => parseWorkshopDocument(doc)).toThrow(/pending/);
  expect(doc.termsText).toContain('entre partidas');
});
