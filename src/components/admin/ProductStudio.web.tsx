import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {useT} from '../../i18n';
import {STUDIO_SOURCE_LIMITS,studioImageMime,type StudioFormat,type StudioTemplate} from '../../domain/productStudioArtwork';
import {prepareStudioAnalysis,renderStudioArtwork} from '../../lib/productStudioCanvas.web';
import {createStudioCutoutEngine} from '../../lib/productStudioCutout.web';

import {analyzeStudioPhoto,studioAnalysisEnabled} from '../../lib/productStudioAnalysis.web';
import type {StudioAnalysis,ProductStudioProps} from '../../domain/productStudioDraft';
const copy={
 uz:{title:'AI Product Studio',open:'Studiyani ochish',close:'Yopish',intro:'Mahsulot rasmini reklama uchun tayyorlang. Hozircha matnlar qo‘lda tasdiqlanadi.',photo:'Mahsulot rasmini tanlang',name:'Reklamadagi mahsulot nomi',model:'Avtomobil modeli',fit:'Avtomobilga mosligini tekshirdim',review:'Nom va ma’lumotlarni tekshirdim',format:'Rasm formati',style:'Reklama uslubi',cutout:'AI yordamida fonni o‘chirish (sinov)',cutoutNote:'Mahalliy model fayllari kerak. Ishlamasa ushbu tanlovni o‘chirib, oddiy rasm bilan davom eting.',generate:'Reklamaga tayyorlash',working:'Rasm tayyorlanmoqda…',cancel:'Bekor qilish',preview:'Tayyor reklama',download:'PNG yuklab olish',manual:'Natijani tekshiring. Bu reklama avtomatik katalogga saqlanmaydi.',source:'JPG, PNG, WebP · 15 MB gacha',badFile:'Rasm formati yoki hajmi mos emas.',badSize:'Rasm juda katta yoki o‘lchami mos emas.',badText:'Matn juda uzun yoki to‘ldirilmagan. Matnni qisqartiring.',failed:'Rasm tayyorlanmadi. Boshqa rasm tanlang yoki qayta urinib ko‘ring.',maskFailed:'AI fonni ajrata olmadi. Model fayllarini tekshiring yoki fonni o‘chirishni bekor qiling.',cancelled:'Jarayon bekor qilindi.',local:'Mahalliy rejim · AI tahlili hali ulanmagan'},
 ru:{title:'AI Product Studio',open:'Открыть студию',close:'Закрыть',intro:'Подготовьте рекламное фото товара. Пока данные подтверждаются вручную.',photo:'Выберите фото товара',name:'Название товара на рекламе',model:'Модель автомобиля',fit:'Совместимость проверена',review:'Название и данные проверены',format:'Формат изображения',style:'Стиль рекламы',cutout:'Удаление фона с ИИ (тест)',cutoutNote:'Нужны локальные файлы модели. При ошибке отключите опцию и используйте исходное фото.',generate:'Подготовить рекламу',working:'Подготовка изображения…',cancel:'Отмена',preview:'Готовая реклама',download:'Скачать PNG',manual:'Проверьте результат. Реклама не сохраняется в каталог автоматически.',source:'JPG, PNG, WebP · до 15 МБ',badFile:'Недопустимый формат или размер файла.',badSize:'Недопустимые размеры изображения.',badText:'Проверьте данные или сократите текст.',failed:'Не удалось подготовить фото. Выберите другое фото или повторите попытку.',maskFailed:'ИИ не смог отделить фон. Проверьте файлы модели или отключите эту опцию.',cancelled:'Операция отменена.',local:'Локальный режим · анализ ИИ ещё не подключён'}
};
const base:CSSProperties={fontFamily:'inherit',fontSize:14,color:'#18344d'};
const button:CSSProperties={...base,padding:'12px 16px',borderRadius:12,border:'1px solid #bdd6e9',background:'#fff',cursor:'pointer',fontWeight:600,minHeight:44};
const primary:CSSProperties={...button,background:'#0875be',color:'#fff',borderColor:'#0875be'};
const field:CSSProperties={...base,boxSizing:'border-box',width:'100%',border:'1px solid #c7dbe9',borderRadius:10,padding:12,background:'#fff'};
const row:CSSProperties={display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'};
const stack:CSSProperties={display:'grid',gap:8};
function message(e:unknown,c:typeof copy.uz){
 const code=e instanceof Error?e.message:'';
 if(code==='studio-cancelled')return c.cancelled;
 if(code==='studio-source-type'||code==='studio-source-size')return c.badFile;
 if(code==='studio-source-dimensions')return c.badSize;
 if(['studio-review-required','studio-product-name-required','studio-model-required','studio-artwork-text-too-long'].includes(code))return c.badText;
 if(/studio-(mask|model|cutout|browser)/.test(code))return c.maskFailed;
 return c.failed;
}
export function ProductStudio({nomi,model,images,imageLimit,blocked,onAttach}:ProductStudioProps){
 const {lang}=useT(),c=copy[lang];
 const words=lang==='uz'?{analyze:'AI bilan tahlil qilish',consent:'Rasm Gemini xizmatiga yuboriladi. Faqat shaxsiy ma’lumotsiz mahsulot rasmini tanlang.',draft:'AI tavsiyasi — tekshirilmagan',apply:'Nom va modelni reklama formasiga olish',quota:'Qolgan sinov limiti',attach:'Katalog formasiga biriktirish',attached:'Rasm formaga biriktirildi. Mahsulotni saqlashni unutmang.',attachFailed:'Biriktirib bo‘lmadi. Rasm limiti yoki yuklash sozlamalarini tekshiring.',analysisFailed:'AI tahlili ishlamadi. Qo‘lda davom etishingiz mumkin.',limited:'AI so‘rov limiti yoki vaqtinchalik cheklov.'}:{analyze:'Анализировать с ИИ',consent:'Фото отправляется в Gemini. Используйте только товарные фото без личных данных.',draft:'Предложение ИИ — не проверено',apply:'Перенести название и модель в рекламу',quota:'Остаток тестового лимита',attach:'Добавить в форму товара',attached:'Фото добавлено в форму. Сохраните товар.',attachFailed:'Не удалось добавить фото. Проверьте лимит и настройки загрузки.',analysisFailed:'Анализ не удался. Продолжите вручную.',limited:'Лимит ИИ или временное ограничение.'};
 const [open,setOpen]=useState(false),[source,setSource]=useState<File|null>(null);
 const [name,setName]=useState(''),[car,setCar]=useState(''),[fit,setFit]=useState(false),[review,setReview]=useState(false);
 const [template,setTemplate]=useState<StudioTemplate>('premium'),[format,setFormat]=useState<StudioFormat>('square');
 const [cutout,setCutout]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[preview,setPreview]=useState('');
 const [analysis,setAnalysis]=useState<StudioAnalysis|null>(null),[artwork,setArtwork]=useState<Blob|null>(null),[attaching,setAttaching]=useState(false),[attachedUrl,setAttachedUrl]=useState('');
 const active=useRef<AbortController|null>(null),engine=useRef<ReturnType<typeof createStudioCutoutEngine>|null>(null),url=useRef('');
 useEffect(()=>()=>{active.current?.abort();active.current=null;engine.current?.dispose();engine.current=null;if(url.current)URL.revokeObjectURL(url.current);url.current='';},[]);
 function clearPreview(){if(url.current)URL.revokeObjectURL(url.current);url.current='';setPreview('');setArtwork(null);setAttachedUrl('');}
 function resetReview(){setReview(false);setFit(false);clearPreview();setError('');}
 function show(){setName(nomi);setCar(model);resetReview();setOpen(true);}
 function hide(){if(active.current||attaching)return;clearPreview();setAnalysis(null);engine.current?.dispose();engine.current=null;setSource(null);setOpen(false);setError('');}
 async function choose(file:File|null){
  if(active.current||attaching)return;
  resetReview();setAnalysis(null);setSource(null);
  if(!file)return;
  const controller=new AbortController();active.current=controller;setBusy(true);
  try{
   if(file.size<1||file.size>STUDIO_SOURCE_LIMITS.bytes)throw Error('studio-source-size');
   const mime=studioImageMime(new Uint8Array(await file.slice(0,12).arrayBuffer()));
   if(!mime||(file.type&&file.type!==mime))throw Error('studio-source-type');
   if(active.current===controller&&!controller.signal.aborted)setSource(file);
  }catch(e){if(active.current===controller)setError(message(e,c));}
  finally{if(active.current===controller){active.current=null;setBusy(false);}}
 }
 async function generate(){
  if(!source||active.current||!review||attaching)return;
  clearPreview();setError('');
  const controller=new AbortController();active.current=controller;setBusy(true);
  try{
   let photo:Blob=source;
   if(cutout){engine.current??=createStudioCutoutEngine();photo=await engine.current.removeBackground(source,controller.signal);}
   const blob=await renderStudioArtwork(photo,{approved:review,nomi:name,model:car,fitmentConfirmed:fit,template,format},{signal:controller.signal,transparentCutout:cutout});
   if(active.current!==controller||controller.signal.aborted)return;
   url.current=URL.createObjectURL(blob);setPreview(url.current);setArtwork(blob);
  }catch(e){if(active.current===controller)setError(message(e,c));}
  finally{if(active.current===controller){active.current=null;setBusy(false);}}
 }
 async function analyze(){
  if(!source||active.current||!studioAnalysisEnabled||attaching)return;
  resetReview();setAnalysis(null);
  const controller=new AbortController();active.current=controller;setBusy(true);
  try{
   const png=await prepareStudioAnalysis(source,controller.signal);
   const result=await analyzeStudioPhoto(png,controller.signal);
   if(active.current===controller&&!controller.signal.aborted)setAnalysis(result);
  }catch(e){if(active.current===controller){const code=e instanceof Error?e.message:'';setError(code==='studio-cancelled'?c.cancelled:/limit|cooldown|quota/.test(code)?words.limited:words.analysisFailed);}}
  finally{if(active.current===controller){active.current=null;setBusy(false);}}
 }
 async function attach(){
  if(!artwork||!preview||blocked||attaching||busy||images.length>=imageLimit||attachedUrl)return;
  setAttaching(true);setError('');
  try{setAttachedUrl(await onAttach(artwork));}catch{setError(words.attachFailed);}
  finally{setAttaching(false);}
 }
 const localModel=typeof window!=='undefined'&&['localhost','127.0.0.1','[::1]'].includes(window.location.hostname);
 return <section aria-label={c.title} style={{...base,background:'linear-gradient(145deg,#f7fcff,#eaf4ff)',border:'1px solid #c5dff3',borderRadius:18,padding:16,display:'grid',gap:14,minWidth:0}}>
  <div style={{...row,justifyContent:'space-between'}}>
   <div style={stack}><strong style={{fontSize:19}}>{c.title}</strong><span style={{fontSize:12,color:'#526b82'}}>{studioAnalysisEnabled?'Gemini · staging':c.local}</span></div>
   <button type="button" style={button} disabled={busy||attaching} onClick={open?hide:show}>{open?c.close:c.open}</button>
  </div>
  {open&&<>
   <span>{c.intro}</span>
   <label style={stack}><strong>{c.photo}</strong><input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e=>{const file=e.currentTarget.files?.[0]??null;e.currentTarget.value='';void choose(file);}}/><small>{source?source.name:c.source}</small></label>
   {studioAnalysisEnabled&&<><small>{words.consent}</small><button type="button" style={button} disabled={busy||attaching||!source} onClick={()=>void analyze()}>{words.analyze}</button></>}
   {analysis&&<div style={{...stack,background:'#fff',padding:12,borderRadius:12}}><strong>{words.draft}</strong>{[analysis.draft.nomi,analysis.draft.brend,analysis.draft.artikul,analysis.draft.modelSuggestion,analysis.draft.tavsifUz,analysis.draft.tavsifRu].filter(Boolean).map((v,i)=><span key={i}>{v}</span>)}<small>{words.quota}: {analysis.quota.remainingAdmin} / {analysis.quota.remainingGlobal}</small><button type="button" style={button} disabled={busy||attaching} onClick={()=>{if(analysis.draft.nomi)setName(analysis.draft.nomi);if(analysis.draft.modelSuggestion)setCar(analysis.draft.modelSuggestion);resetReview();}}>{words.apply}</button></div>}
   <label style={stack}>{c.name}<input style={field} value={name} maxLength={160} disabled={busy} onChange={e=>{setName(e.target.value);resetReview();}}/></label>
   <label style={stack}>{c.model}<input style={field} value={car} maxLength={300} disabled={busy} onChange={e=>{setCar(e.target.value);resetReview();}}/></label>
   <label style={row}><input type="checkbox" checked={fit} disabled={busy||attaching||!car.trim()} onChange={e=>{setFit(e.target.checked);setReview(false);clearPreview();}}/>{c.fit}</label>
   <strong>{c.style}</strong>
   <div style={row}>{(['premium','classic','cinematic'] as const).map(v=><button key={v} type="button" aria-pressed={template===v} disabled={busy} style={template===v?primary:button} onClick={()=>{setTemplate(v);clearPreview();}}>{v[0].toUpperCase()+v.slice(1)}</button>)}</div>
   <strong>{c.format}</strong>
   <div style={row}>{(['square','portrait'] as const).map(v=><button key={v} type="button" aria-pressed={format===v} disabled={busy} style={format===v?primary:button} onClick={()=>{setFormat(v);clearPreview();}}>{v==='square'?'1080 × 1080':'1080 × 1350'}</button>)}</div>
   {localModel&&<><label style={row}><input type="checkbox" checked={cutout} disabled={busy} onChange={e=>{setCutout(e.target.checked);clearPreview();}}/>{c.cutout}</label><small>{c.cutoutNote}</small></>}
   <label style={row}><input type="checkbox" checked={review} disabled={busy} onChange={e=>{setReview(e.target.checked);clearPreview();}}/>{c.review}</label>
   <button type="button" style={{...primary,opacity:busy||!source||!review||!name.trim() ? 0.8 : 1}} disabled={busy||attaching||!source||!review||!name.trim()} onClick={()=>void generate()}>{busy?c.working:c.generate}</button>
   {busy&&<button type="button" style={button} onClick={()=>active.current?.abort()}>{c.cancel}</button>}
   {error&&<div role="alert" style={{color:'#a52c2c'}}>{error}</div>}
   {preview&&<div style={stack}><strong>{c.preview}</strong><img src={preview} alt={c.preview} style={{width:'100%',maxHeight:440,objectFit:'contain',borderRadius:14,background:'#fff'}}/><small>{c.manual}</small><a style={{...button,textAlign:'center',textDecoration:'none'}} href={preview} download="optovik-n99-reklama.png">{c.download}</a>{attachedUrl?<small role="status">{images.includes(attachedUrl)?words.attached:words.attachFailed}</small>:<button type="button" style={primary} disabled={blocked||busy||attaching||images.length>=imageLimit} onClick={()=>void attach()}>{attaching?c.working:words.attach}</button>}</div>}
  </>}
 </section>;
}
