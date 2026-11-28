/** Serialize same-device profile edits, including failure recovery. No data persists here. */
export function createProfileWriteQueue(){
 let tail:Promise<void>=Promise.resolve(),pending=0;
 return {
  busy:()=>pending>0,
  run<T>(task:()=>Promise<T>):Promise<T>{
   pending++;
   const result=tail.then(task);
   tail=result.then(()=>{},()=>{});
   return result.finally(()=>{pending--;});
  },
 };
}
