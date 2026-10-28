import { it,expect } from 'vitest';
import { galleryTarget } from './gallery-publisher';
it('exports live gallery drafts only to the real catalog and keeps test drafts isolated',()=>{
 expect(galleryTarget({PAYMENT_ENVIRONMENT:'production',CUADROS_SANITY_TEST_DATASET:'inventory_test'},'production')).toEqual({dataset:'production',environment:'production'});
 expect(galleryTarget({PAYMENT_ENVIRONMENT:'test',CUADROS_SANITY_TEST_DATASET:'inventory_test'},'production')).toEqual({dataset:'inventory_test',environment:'test'});
 for(const env of [{},{PAYMENT_ENVIRONMENT:'test'},{PAYMENT_ENVIRONMENT:'test',CUADROS_SANITY_TEST_DATASET:'production'},{PAYMENT_ENVIRONMENT:'invalid'}])expect(()=>galleryTarget(env,'production')).toThrow();
});
