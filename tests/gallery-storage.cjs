const fs=require('fs'),assert=require('node:assert/strict');
const {JSDOM}=require('jsdom'),{indexedDB,IDBObjectStore}=require('fake-indexeddb');
const png='data:image/png;base64,iVBORw0KGgo=',jpg='data:image/jpeg;base64,/9j/AA==';
const timeout=p=>Promise.race([p,new Promise((_,reject)=>{const timer=setTimeout(()=>reject(Error('storage promise stalled')),3000);timer.unref();})]);
(async()=>{
 for(const mode of ['standalone','extension']){
  const dom=new JSDOM('<body><div id="top-settings-holder"></div><div id="extensionsMenu"></div></body>',{url:'https://gallery.test',runScripts:'outside-only',pretendToBeVisual:true}),W=dom.window;
  Object.assign(W,{indexedDB,structuredClone,TextDecoder,TextEncoder,Response,Blob,DecompressionStream,fetch:async()=>{throw Error('network disabled')}});
  W.HTMLElement.prototype.scrollIntoView=function(){};
  const query=W.Element.prototype.querySelector;W.Element.prototype.querySelector=function(s){if(s===':scope>summary')return [...this.children].find(n=>n.tagName==='SUMMARY')||null;return query.call(this,s);};
  W.Image.prototype.decode=async()=>{};Object.defineProperty(W.Image.prototype,'naturalWidth',{get:()=>832});Object.defineProperty(W.Image.prototype,'naturalHeight',{get:()=>1216});
  W.HTMLCanvasElement.prototype.getContext=()=>({fillRect(){},drawImage(){}});W.HTMLCanvasElement.prototype.toDataURL=type=>type==='image/jpeg'?jpg:'data:image/webp;base64,UklGRg==';
  const context={extensionSettings:{},chat:[],characterId:0,getCurrentChatId:()=> 'test',saveChat:async()=>{},saveSettingsDebounced:()=>{},getRequestHeaders:()=>({})};W.SillyTavern={getContext:()=>context};
  const expose='W.test={dbReady,dbOp,s,acceptImages,galleryIndex,removeAlbum,setImageAlbum,setFavorite,deleteImages,preview,previewFold,pages,saveGalleryBatch,gallerySelection,imageExtension,previewTools,galleryViewer,getSelected:()=>selected};';
  let code=fs.readFileSync(mode==='standalone'?'dist/app.js':'extension/studio.js','utf8');
  if(mode==='standalone')code=code.replace('W[OWNER]={dispose,open};',expose+'W[OWNER]={dispose,open};');
  else code=code.replace('export function startAtelier','function startAtelier').replace('W[OWNER]={dispose,open,inline:{',expose+'W[OWNER]={dispose,open,inline:{')+';startAtelier(()=>window.SillyTavern.getContext(),async()=>({path:"/images/test.png"}));';
  W.eval(code);const t=W.test;await t.dbReady;
  assert.equal(t.s.ui.storePng,true);assert(t.pages['设置'].textContent.includes('存储 PNG 原图'));
  await t.galleryIndex(); // Reproduce the error only triggered after opening the gallery.
  t.previewFold.open=false;
  const req={input:'garden',parameters:{seed:42},model:'nai-diffusion-4-5-full'};
  const original=(await timeout(t.acceptImages([png],req)))[0];assert.equal(original.image,png);assert.equal(t.previewFold.open,true);assert.equal(t.preview.querySelector('img').src,png);
  assert.equal((await t.galleryIndex()).length,1);assert.equal((await t.dbOp('images','get',original.id)).image,png);
  t.s.ui.storePng=false;const small=(await timeout(t.acceptImages([png],req)))[0];assert.equal(small.image,jpg);assert.equal(t.imageExtension(small.image),'jpg');assert.equal((await t.dbOp('images','get',small.id)).request.parameters.seed,42);
  const downloads=[];W.HTMLAnchorElement.prototype.click=function(){downloads.push(this.download);};[...t.previewTools.querySelectorAll('button')].find(b=>b.textContent==='保存图片').click();assert(downloads.at(-1).endsWith('.jpg'));t.galleryViewer(small);[...t.pages['绘图'].getRootNode().querySelectorAll('.viewer-actions button')].find(b=>b.textContent==='保存图片').click();assert(downloads.at(-1).endsWith('.jpg'));let archive;W.URL.createObjectURL=blob=>{archive=blob;return 'blob:test';};W.URL.revokeObjectURL=()=>{};t.gallerySelection.add(small.id);t.gallerySelection.add(original.id);await t.saveGalleryBatch();const zip=Buffer.from(await archive.arrayBuffer());assert(zip.includes(Buffer.from(small.id+'.jpg')));assert(zip.includes(Buffer.from(original.id+'.png')));t.gallerySelection.clear();
  t.s.ui.storePng=true;const restored=(await timeout(t.acceptImages([png],req)))[0];assert.equal(restored.image,png);assert.equal(t.imageExtension(restored.image),'png');
  t.s.albums.push({id:'album',name:'相册'});await t.setImageAlbum([original.id,small.id],'album');await t.setFavorite(original.id,true);
  const getAll=IDBObjectStore.prototype.getAll,put=IDBObjectStore.prototype.put;let fullReads=0,fullWrites=0;
  IDBObjectStore.prototype.getAll=function(...args){if(this.name==='images')fullReads++;return getAll.apply(this,args);};
  IDBObjectStore.prototype.put=function(...args){if(this.name==='images')fullWrites++;return put.apply(this,args);};
  try{
   await timeout(t.removeAlbum('album'));assert.equal(fullReads,0);assert.equal(fullWrites,0);assert.equal(t.s.albums.length,0);
   assert.equal((await t.dbOp('images','get',original.id)).favorite,true);assert.equal((await t.dbOp('images','get',small.id)).image,jpg);
   await timeout(t.deleteImages([original.id,small.id],true));assert.equal(fullReads,0);assert(await t.dbOp('images','get',original.id));assert.equal(await t.dbOp('images','get',small.id),undefined);assert.equal(await t.dbOp('thumbs','get',small.id),undefined);
  }finally{IDBObjectStore.prototype.getAll=getAll;IDBObjectStore.prototype.put=put;}
  assert(t.pages['图库'].querySelector('.album-controls'));W[mode==='standalone'?'__pear_atelier_app':'__pear_nai_studio_v1'].dispose();dom.window.close();
  console.log('PASS '+mode+': generation after opening gallery settles; preview reopens; PNG/JPG storage and extensions; album deletion has zero original reads/writes; batch deletion keeps favorites');
 }
})().catch(e=>{console.error(e);process.exit(1)});
