import { startAtelier } from './studio.js';
import { loadHostCompatibility } from './compat.js';
let disabled=false,started=false,starting=false,timer,host,readySource,readyEvent,epoch=0;
const ready=()=>schedule(0);
function detachReady(){if(readySource&&readyEvent){const remove=readySource.removeListener||readySource.off;remove?.call(readySource,readyEvent,ready);}readySource=readyEvent=null;}
function schedule(delay=250){if(disabled||started)return;clearTimeout(timer);timer=setTimeout(start,delay);}
async function start(){
 if(disabled||started||starting)return;
 starting=true;const attempt=epoch;
 try{
  host||=await loadHostCompatibility();
  if(disabled||attempt!==epoch)return;
  const context=host.getContext();
  if(!context||!document.body){schedule();return;}
  if(!context.extensionSettings||typeof context.saveSettingsDebounced!=='function'||typeof context.saveChat!=='function')throw Error('当前酒馆缺少设置或聊天保存接口，请检查酒馆版本和浏览器控制台。');
  // Old hosts have no APP_READY. Modern hosts may already have fired it.
  if(context.isReady===false){const event=context.eventTypes?.APP_READY;if(!readySource&&event&&context.eventSource?.on){readySource=context.eventSource;readyEvent=event;readySource.on(event,ready);}schedule();return;}
  startAtelier(host.getContext,host.uploadImage);started=true;clearTimeout(timer);detachReady();
 }catch(error){window.__pear_nai_studio_v1?.dispose?.();console.error('[梨梨画室]',error);window.toastr?.error(error.message||'画室加载失败，请查看控制台。','梨梨画室');}
 finally{starting=false;if(!disabled&&attempt!==epoch)schedule(0);}
}
export function onDisable(){disabled=true;epoch++;clearTimeout(timer);detachReady();window.__pear_nai_studio_v1?.dispose?.();started=false;}
export function onEnable(){disabled=false;schedule(0);}
// Detached from host module evaluation to avoid circular waits.
schedule(0);
