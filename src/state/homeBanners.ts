import { useCallback,useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { AppState } from 'react-native';
import type {Banner} from '../domain/content';
import {BANNER_REFRESH_MS} from '../domain/bannerUi';
import {candidatePublicBanners} from '../lib/candidateData';
import {usesFirestoreCandidate} from '../lib/orderBackend';
import {auth} from '../lib/firebase';
import {useUid} from './account';
import {useBanners} from './catalog';

// Independent lightweight read: a slow catalog or stock query never blocks new banners.
// Only poll while Home is focused and foregrounded; no persisted private data.
export function useHomeBanners(){
 const fallback=useBanners(),uid=useUid();
 const [attempt,setAttempt]=useState(0);
 const [state,setState]=useState<{uid:string;items:Banner[]|null}|null>(null);
 useFocusEffect(useCallback(()=>{
  if(!usesFirestoreCandidate||!uid)return;
  let disposed=false,running=false,generation=0,queued=false;
  let timer:ReturnType<typeof setTimeout>|undefined;
  const clear=()=>{if(timer!==undefined)clearTimeout(timer);};
  const active=()=>!disposed&&auth.currentUser?.uid===uid&&AppState.currentState!=='background'&&AppState.currentState!=='inactive';
  const refresh=async()=>{
   if(!active()||running)return;
   clear();running=true;queued=false;const revision=generation;
   try{const items=await candidatePublicBanners(uid);if(active()&&revision===generation)setState({uid,items});}
   catch{/* retain last successful public snapshot */}
   finally{running=false;if(active()){if(queued)void refresh();else timer=setTimeout(()=>{void refresh();},BANNER_REFRESH_MS);}}
  };
  const sub=AppState.addEventListener('change',s=>{
   if(s==='active'){if(running)queued=true;else void refresh();}
   else{generation++;clear();}
  });
  void refresh();
  return()=>{disposed=true;clear();sub.remove();};
 },[uid,attempt]));
 return {banners:usesFirestoreCandidate&&state&&state.uid===uid?state.items:fallback,refresh:useCallback(()=>setAttempt(n=>n+1),[])};
}
