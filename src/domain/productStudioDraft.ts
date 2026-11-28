// Untrusted provider response, independent of Firebase and browser.
export type StudioDraft={nomi:string;brend:string;artikul:string;modelSuggestion:string;tavsifUz:string;tavsifRu:string;requiresReview:true};
export type StudioAnalysis={draft:StudioDraft;quota:{remainingGlobal:number;remainingAdmin:number}};
const limits={nomi:160,brend:60,artikul:80,modelSuggestion:300,tavsifUz:1000,tavsifRu:1000} as const;
const control=/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u;
const record=(v:unknown):v is Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v);
export function readStudioAnalysis(value:unknown):StudioAnalysis{
 if(!record(value)||!record(value.draft)||!record(value.quota)||value.draft.requiresReview!==true)throw Error('studio-invalid-response');
 const draft={} as Omit<StudioDraft,'requiresReview'>;
 for(const key of Object.keys(limits) as (keyof typeof limits)[]){
  const v=value.draft[key];
  if(typeof v!=='string'||v.length>limits[key]||control.test(v))throw Error('studio-invalid-response');
  draft[key]=v.trim();
 }
 const g=value.quota.remainingGlobal,a=value.quota.remainingAdmin;
 if(typeof g!=='number'||typeof a!=='number'||!Number.isSafeInteger(g)||!Number.isSafeInteger(a)||g<0||g>20||a<0||a>5)throw Error('studio-invalid-response');
 return {draft:{...draft,requiresReview:true},quota:{remainingGlobal:g,remainingAdmin:a}};
}
export function appendStudioImage(images:string[],url:string,limit:number):string[]{
 if(!Number.isSafeInteger(limit)||limit<1||limit>10||images.length>=limit||!/^https:\/\/\S{1,1992}$/.test(url)||images.includes(url))return images;
 return [...images,url];
}

export type ProductStudioProps={nomi:string;model:string;images:string[];imageLimit:number;blocked:boolean;onAttach:(blob:Blob)=>Promise<string>};
