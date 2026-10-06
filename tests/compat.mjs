import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { EventEmitter } from 'node:events';
import { JSDOM } from 'jsdom';
import { indexedDB } from 'fake-indexeddb';
import { makeContextReader, makeImageUploader, normalizeImagePath, loadHostCompatibility } from '../extension/compat.js';

for (const version of ['1.10.0','1.12.0','1.19.0']) {
 const dom=new JSDOM('<body><div id="top-settings-holder"></div><div id="extensionsMenu"></div></body>',{url:'https://tavern.test/',runScripts:'outside-only',pretendToBeVisual:true});
 const W=dom.window;Object.assign(W,{indexedDB,structuredClone,TextEncoder,TextDecoder,Blob,Response,DecompressionStream});
 W.HTMLElement.prototype.scrollIntoView=function(){};
 const query=W.Element.prototype.querySelector;W.Element.prototype.querySelector=function(s){if(s===':scope>summary')return [...this.children].find(x=>x.tagName==='SUMMARY')||null;return query.call(this,s);};
 // Older HTTP-hosted Taverns may lack randomUUID even in a modern browser.
 Object.defineProperty(W.crypto,'randomUUID',{value:undefined});
 const settings={pear_nai_studio:{scope:'compat-'+version,settings:{}}},events=new EventEmitter();let settingsSaves=0,chatSaves=0,chatId='first';
 const core={saveSettingsDebounced(){settingsSaves++;},getRequestHeaders:()=>({'X-CSRF-Token':'test'}),saveChatConditional:async()=>{chatSaves++;},getCurrentChatId:()=>chatId,eventSource:events,event_types:{CHAT_CHANGED:'chat_changed'}};
 let raw={chat:[],characterId:0,chatId,eventSource:events,event_types:core.event_types,saveChat:core.saveChatConditional};
 if(version==='1.19.0')Object.assign(raw,{extensionSettings:settings,saveSettingsDebounced:core.saveSettingsDebounced,getRequestHeaders:core.getRequestHeaders,eventTypes:core.event_types,getCurrentChatId:core.getCurrentChatId});
 W.SillyTavern={getContext:()=>raw};const read=makeContextReader(W,core,{extension_settings:settings});
 assert.equal(read().extensionSettings,settings);assert.equal(read().getRequestHeaders()['X-CSRF-Token'],'test');chatId='second';assert.equal(read().getCurrentChatId(),'second');
 await read().saveChat();assert.equal(chatSaves,1);
 const source=fs.readFileSync('extension/studio.js','utf8').replace('export function startAtelier','function startAtelier').replace('W[OWNER]={dispose,open,inline:{','W.testReady=dbReady;W.testScan=renderMessageButtons;W[OWNER]={dispose,open,inline:{');
 W.eval(source);W.startAtelier(read,async()=>({path:'/user/images/test.png'}));await W.testReady;
 assert(W.__pear_nai_studio_v1);assert(settingsSaves>0);assert(settings.pear_nai_studio.studio2);assert(W.document.querySelector('#pear-nai-host').shadowRoot.textContent.includes('副 API'));
 if(version==='1.19.0'){
  const rawText='<imageTag><imgthink>画面分析，不进入提示词</imgthink>┈┈✧吧台的视线交汇✧┈┈\nimage###sfw, 2boys, bar counter, (boyA:1.2, black long hair), (boyB:1.2, blue eyes)###</imageTag>';
  raw.chat=[{mes:rawText,is_user:false}];
  const mes=W.document.createElement('div');mes.className='mes';mes.setAttribute('mesid','0');const body=W.document.createElement('div');body.className='mes_text';body.innerHTML=rawText;mes.append(body);W.document.body.append(mes);
  W.testScan();assert.equal(body.querySelectorAll('.pear-image-control').length,1);assert.equal(raw.chat[0].mes,rawText);assert(body.querySelector('imgthink').textContent.includes('画面分析'));assert(body.querySelector('.pear-paint').textContent.includes('吧台的视线交汇'));
 }
 W.__pear_nai_studio_v1.dispose();assert.equal(events.listenerCount('chat_changed'),0);dom.window.close();
 console.log('PASS extension startup/settings/chat identity/event cleanup with '+version+' API shape');
}

const item={id:'image1',image:'data:image/png;base64,iVBORw0KGgo='};let args;
const upload=makeImageUploader(async(...a)=>{args=a;return 'user/images/pear-nai/image1.png';},'https://tavern.test/');
assert.deepEqual(await upload(item),{path:'/user/images/pear-nai/image1.png'});assert.deepEqual(args,['iVBORw0KGgo=','pear-nai','image1','png']);
await upload({id:'jpeg',image:'data:image/jpeg;base64,/9j/AA=='});assert.deepEqual(args,['/9j/AA==','pear-nai','jpeg','jpg']);
assert.equal(normalizeImagePath('user/images/a.png','https://tavern.test/st/'),'/st/user/images/a.png');
for(const path of ['https://other.test/a.png','//other.test/a.png','javascript:alert(1)','a\\b.png'])assert.throws(()=>normalizeImagePath(path,'https://tavern.test/'));
await assert.rejects(upload(item,AbortSignal.abort()),e=>e.name==='AbortError');

// Execute the actual upstream image helpers when the locally fetched tag sources are available.
if(process.env.PEAR_ST_REFERENCE)for(const version of ['1.10.0','1.12.0','1.19.0']){
 const source=fs.readFileSync(process.env.PEAR_ST_REFERENCE+'/'+version+'/public/scripts/utils.js','utf8');const start=source.indexOf('export async function saveBase64AsFile'),end=source.indexOf('\n}',start)+2;let request;
 const sandbox={getRequestHeaders:()=>({'X-CSRF-Token':'test'}),fetch:async(url,init)=>{request={url,body:JSON.parse(init.body),headers:init.headers};return {ok:true,json:async()=>({path:'user/images/image1.png'})};}};
 vm.runInNewContext(source.slice(start,end).replace('export ',''),sandbox);
 await makeImageUploader(sandbox.saveBase64AsFile,'https://tavern.test/')(item);
 assert.equal(request.url,version==='1.10.0'?'/uploadimage':'/api/images/upload');assert.equal(request.body.image,version==='1.19.0'?'iVBORw0KGgo=':item.image);assert.equal(request.headers['X-CSRF-Token'],'test');
 console.log('PASS actual upstream '+version+' image upload helper and payload');
}

// Entry point must work when APP_READY is absent or already happened, and after disable/re-enable.
const entry=fs.readFileSync('extension/index.js','utf8').replace(/^import .*;\n/gm,'').replaceAll('export function','function');
for(const initiallyReady of [undefined,true,false]){
 let current={extensionSettings:{},saveSettingsDebounced(){},saveChat(){},isReady:initiallyReady,eventSource:new EventEmitter(),eventTypes:{APP_READY:'app_ready'}},starts=0,disposed=0,serial=0;const timers=new Map();
 const sandbox={document:{body:{}},window:{__pear_nai_studio_v1:{dispose(){disposed++;}},toastr:{error(message){throw Error(message);}}},console,setTimeout(fn){const id=++serial;timers.set(id,fn);return id;},clearTimeout(id){timers.delete(id);},loadHostCompatibility:async()=>({getContext:()=>current,uploadImage(){}}),startAtelier(){starts++;}};
 vm.runInNewContext(entry,sandbox);async function tick(){const [id,fn]=timers.entries().next().value;timers.delete(id);await fn();}
 await tick();if(initiallyReady===false){assert.equal(starts,0);current.isReady=true;current.eventSource.emit('app_ready');await tick();}
 assert.equal(starts,1);sandbox.onEnable();assert.equal(timers.size,0);sandbox.onDisable();assert.equal(disposed,1);assert.equal(current.eventSource.listenerCount('app_ready'),0);sandbox.onEnable();await tick();assert.equal(starts,2);sandbox.onDisable();
}
console.log('PASS host-owned uploads, safe paths, entry startup before/after ready and lifecycle');

