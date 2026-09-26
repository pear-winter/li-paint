import { startAtelier } from './studio.js';
let disposed=false,started=false,timer;
function start(){
 if(disposed||started)return;
 const context=window.SillyTavern?.getContext?.();
 if(!context?.extensionSettings||!document.body){timer=setTimeout(start,100);return;}
 try{startAtelier();started=true;}catch(error){console.error('[梨梨画室]',error);window.toastr?.error('画室加载失败，请查看控制台。','梨梨画室');}
}
export function onDisable(){disposed=true;clearTimeout(timer);window.__pear_nai_studio_v1?.dispose?.();started=false;}
export function onEnable(){disposed=false;start();}
// Defer until Tavern has loaded its settings; never await a long startup in an event handler.
const context=window.SillyTavern?.getContext?.();
const ready=context?.eventTypes?.APP_READY||context?.event_types?.APP_READY;
if(ready&&context?.eventSource){context.eventSource.once(ready,()=>setTimeout(start,0));}
else if(document.readyState==='complete')setTimeout(start,0);
else window.addEventListener('load',()=>setTimeout(start,0),{once:true});
