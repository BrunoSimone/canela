import { expect,it } from 'vitest';
import {AVAILABILITY_CASE_SETS,studyCaseSet} from './available-study-cases';
it('restricts selectable sources/output paths and preserves original cases',()=>{
  expect(studyCaseSet(undefined)).toBe('original');expect(studyCaseSet('paisajes')).toBe('paisajes');
  expect(studyCaseSet('simples')).toBe('simples');
  for(const v of ['../private','__proto__',{},null])expect(()=>studyCaseSet(v)).toThrow();
  expect(AVAILABILITY_CASE_SETS.original.cases.map(c=>c.theme)).toEqual(['mascota','pareja','familia']);
  expect(AVAILABILITY_CASE_SETS.paisajes.cases.map(c=>c.theme)).toEqual(['lago-montana','rio-bosque','retrato-individual']);
  for(const c of AVAILABILITY_CASE_SETS.paisajes.cases){expect(c.file).not.toContain('..');expect(c.photographer).toBeTruthy();expect(['unsplash.com','images.unsplash.com']).toContain(new URL(c.sourcePage!).hostname);}
  expect(AVAILABILITY_CASE_SETS.original.directory).not.toBe(AVAILABILITY_CASE_SETS.paisajes.directory);
});
it('archives the three simple subjects with credits/licenses in separate fixed paths',()=>{
  const selected=AVAILABILITY_CASE_SETS.simples;
  expect(selected.cases.map(c=>c.theme)).toEqual(['faro-mar','montana-nevada','flor-primer-plano']);
  expect(new Set(Object.values(AVAILABILITY_CASE_SETS).map(s=>s.directory)).size).toBe(3);
  for(const item of selected.cases){
    expect(item.file).toMatch(/^fuentes\/[a-z-]+\.jpg$/);
    expect(item.photographer).toBeTruthy();
    for(const value of [item.sourcePage!,item.licenseUrl!]){
      const url=new URL(value);expect(url.protocol).toBe('https:');
      expect(['www.pexels.com','unsplash.com']).toContain(url.hostname);
    }
  }
  expect(selected.cases[0].framing).toEqual({zoom:2.5,x:0.5,y:1});
});
