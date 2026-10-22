import {useEffect} from "react";
import {signInWithEmailAndPassword,signOut} from "firebase/auth";
import {services} from "./firebase";
export function useUnifiedPreview(onMode:(mode:string)=>void,notify:(message:string)=>void){
 useEffect(()=>{if(!import.meta.env.DEV||import.meta.env.VITE_USE_EMULATORS!=="true")return;
  const receive=async(event:MessageEvent)=>{if(event.origin!==location.origin||event.source!==window.parent||event.data?.type!=="aumm-unified-preview")return;
   const mode=String(event.data.mode||"");if(!["entry","guest","member","president","director"].includes(mode))return;
   try{const {auth}=services();if(mode==="entry"||mode==="guest")await signOut(auth);else await signInWithEmailAndPassword(auth,`preview.${mode}@aumm.test`,"DemoAumm2026!");onMode(mode);window.parent.postMessage({type:"aumm-preview-ready",mode},location.origin);}catch{notify("A conta de demonstração não foi preparada. Avise para reiniciar a prévia local.");}
  };window.addEventListener("message",receive);return()=>window.removeEventListener("message",receive);
 },[onMode,notify]);
}
