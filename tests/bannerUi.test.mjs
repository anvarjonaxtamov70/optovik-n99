import test from 'node:test';
import assert from 'node:assert/strict';
import {bannerIndex,safeBannerError,isBannerRoute,BANNER_REFRESH_MS} from '../src/domain/bannerUi.ts';
test('banner selection clamps after removal, resize and overscroll',()=>{
 assert.equal(bannerIndex(999,100,2),1);assert.equal(bannerIndex(-20,100,3),0);assert.equal(bannerIndex(151,100,4),2);assert.equal(bannerIndex(100,0,4),0);assert.equal(bannerIndex(100,100,0),0);
});
test('banner diagnostics are fixed allowlisted codes and routes only',()=>{
 assert.equal(safeBannerError('invalid-banner'),'invalid-banner');assert.equal(safeBannerError('private upstream content'),undefined);assert.equal(isBannerRoute('/v1/admin/banner'),true);assert.equal(isBannerRoute('/v1/transition'),false);assert.equal(BANNER_REFRESH_MS,60000);
});
