/** Keep selection within the current list even after deletion or overscroll. */
export function bannerIndex(offset:number,step:number,count:number):number{
 if(!Number.isFinite(offset)||!Number.isFinite(step)||step<=0||!Number.isInteger(count)||count<=0)return 0;
 return Math.max(0,Math.min(count-1,Math.round(offset/step)));
}
export const BANNER_REFRESH_MS=60000;
export const BANNER_ERRORS=['invalid-banner','banner-limit','forbidden','unauthenticated','unavailable'] as const;
export type BannerError=typeof BANNER_ERRORS[number];
export function safeBannerError(value:unknown):BannerError|undefined{
 return BANNER_ERRORS.includes(value as BannerError)?value as BannerError:undefined;
}
export function isBannerRoute(path:string){return path==='/v1/admin/banner'||path==='/v1/admin/banners/list'||path==='/v1/banners/list';}
