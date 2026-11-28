import {STUDIO_LIMITS,validateStudioImage} from './product-studio-policy.mjs';
import {checkStudioAdmin,reserveStudioAttempt} from './product-studio-quota.mjs';
const fail=(code,status)=>{throw Object.assign(new Error(code),{code,status});};

// Internal staging service, not a public route. UID MUST come from a verified ID token.
// The injected decoder must inspect and fully decode actual bytes within resource
// limits, reject malformed files, strip metadata and re-encode before returning.
export function createStudioService({run,decodeImage,analyze,enabled=false,clock=Date.now}={}){
  return async ({uid,bytes}={})=>{
    if(enabled!==true)fail('studio-disabled',503);
    if(typeof run!=='function'||typeof decodeImage!=='function'||typeof analyze!=='function')fail('studio-unavailable',503);
    await checkStudioAdmin(run,uid);
    if(!(bytes instanceof Uint8Array)||bytes.byteLength<1||bytes.byteLength>STUDIO_LIMITS.maxBytes)fail('invalid-image-size',400);
    const decoded=await decodeImage(bytes);
    const invalid=validateStudioImage(decoded?.meta);
    if(invalid)fail(invalid,400);
    if(!(decoded.bytes instanceof Uint8Array)||decoded.bytes.byteLength!==decoded.meta.bytes)fail('invalid-image-bytes',400);
    // Recheck role in the reservation transaction, including after slow decoding.
    const quota=await reserveStudioAttempt(run,uid,clock());
    const draft=await analyze(decoded);
    return {draft,quota};
  };
}
