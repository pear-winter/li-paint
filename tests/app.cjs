const fs=require('fs'),assert=require('node:assert/strict');
const {JSDOM}=require(process.env.PEAR_TEST_MODULES?process.env.PEAR_TEST_MODULES+'/jsdom':'jsdom'),{indexedDB}=require(process.env.PEAR_TEST_MODULES?process.env.PEAR_TEST_MODULES+'/fake-indexeddb':'fake-indexeddb');
(async()=>{
 const old=await new Promise((resolve,reject)=>{const r=indexedDB.open('pear-nai-migration-test',2);r.onupgradeneeded=()=>{for(const n of ['images','vibes','vault'])r.result.createObjectStore(n,{keyPath:'id'});};r.onsuccess=()=>resolve(r.result);r.onerror=reject;});
 await new Promise(resolve=>{const tx=old.transaction('images','readwrite');tx.objectStore('images').put({id:'retained',time:1,image:'data:image/png;base64,iVBORw0KGgo='});tx.oncomplete=resolve;});old.close();
 const dom=new JSDOM('<main id="startup"></main>',{url:'https://li-paint.pages.dev',runScripts:'outside-only'}),W=dom.window;
 Object.assign(W,{indexedDB,structuredClone,TextDecoder,TextEncoder,Response,Blob,DecompressionStream,fetch:async()=>{throw Error('Network disabled');}});W.HTMLElement.prototype.scrollIntoView=function(){};
 // jsdom 30 cannot resolve :scope across a ShadowRoot; browsers can.
 const query=W.Element.prototype.querySelector;W.Element.prototype.querySelector=function(selector){if(selector===':scope>summary')return [...this.children].find(x=>x.tagName==='SUMMARY')||null;return query.call(this,selector);};
 W.localStorage.setItem('pear-atelier-state',JSON.stringify({pear_nai_studio:{scope:'migration-test',settings:{}}}));
 for(const p of ['dist/settings-backup.js','dist/themes.js'])W.eval(fs.readFileSync(p,'utf8'));
 W.eval(fs.readFileSync('dist/app.js','utf8').replace('W[OWNER]={dispose,open};','W[OWNER]={dispose,open};W.test={run,stopAll,inlineProfile,enterStudio,savePromptAsPair,subState,subLoad,subProfile,translateScene,translateBox,closeShell,markPairBaseline,applyPairParams,shapeBtn,seedBox,allTags,dbReady,dbOp,s,cfg,PARAMS,pages,normalizeMetadata,metadataVibes,buildRequest,importMetadataVibes,snapshotVibes,cancelAllVibes,updateMetadataEntry,showMetadata,applyCorners,dispose};'));
 const t=W.test;await t.dbReady;assert.equal((await t.dbOp('images','get','retained')).id,'retained');assert(t.pages['元数据库']);assert(!t.pages['文生图配置']);
 const fixture={Source:'NovelAI Diffusion V4.5 4BDE2A90',Comment:JSON.stringify({prompt:'garden',reference_image_multiple:['YWJjZA=='],reference_strength_multiple:[.6],reference_information_extracted_multiple:[1],model_name:'NovelAI Diffusion V4.5'})};
 const metadata=t.normalizeMetadata(fixture),v=t.metadataVibes(fixture);assert.equal(metadata.settings.model,'nai-diffusion-4-5-full');assert.equal(v.items.length,1);v.items[0].selected=true;const req=t.buildRequest({...t.PARAMS,...metadata.settings},metadata,{positive:'',negative:''},v.items,true);assert.equal(req.parameters.reference_image_multiple[0],'YWJjZA==');
 await t.importMetadataVibes(v.items,false);assert.equal((await t.dbOp('vibes','getAll')).length,0);assert.equal(t.snapshotVibes().filter(v=>v.selected).length,1);
 const v5=t.buildRequest({...t.PARAMS,model:'nai-diffusion-5-full'},{prompt:'garden',characters:[]},{positive:'',negative:''},v.items,true);assert(!v5.parameters.reference_image_multiple);await t.cancelAllVibes();assert.equal(t.snapshotVibes().filter(v=>v.selected).length,0);
 await t.dbOp('metadata','put',{id:'m',name:'original',time:1,data:metadata,tags:[],favorite:false});await t.updateMetadataEntry('m',{name:'new name',tags:['light'],favorite:true});const saved=await t.dbOp('metadata','get','m');assert.equal(saved.name,'new name');assert.equal(saved.favorite,true);assert(t.pages['元数据库'].textContent.includes('new name'));assert.equal((await t.dbOp('vibes','getAll')).length,0);
 t.cfg.pair='quality';t.showMetadata({...metadata,warnings:[],vibes:v.items});const shadow=W.document.querySelector('#pear-nai-host').shadowRoot;[...shadow.querySelectorAll('button')].find(x=>x.textContent==='导入选中内容').click();await new Promise(r=>setTimeout(r,20));assert.equal(t.cfg.pair,'none');assert.equal(t.pages['绘图'].hidden,false);assert.equal((await t.dbOp('vibes','getAll')).length,0);
 t.s.ui.cornerStyle='round';t.applyCorners();assert.equal(W.document.querySelector('#pear-nai-host').dataset.corners,'round');
 if(process.env.PEAR_ORIGINALS)for(let i=0;i<3;i++){const raw=JSON.parse(fs.readFileSync(process.env.PEAR_ORIGINALS+'/'+i+'.json')),data=t.normalizeMetadata(raw),parsed=t.metadataVibes(raw);assert.equal(parsed.items.length,[1,4,0][i]);if(i<2){parsed.items.forEach(v=>v.selected=true);const request=t.buildRequest({...t.PARAMS,...data.settings},data,{positive:'',negative:''},parsed.items,true);assert.deepEqual(Array.from(request.parameters.reference_image_multiple),JSON.parse(raw.Comment).reference_image_multiple);}else assert.equal(data.settings.model,'nai-diffusion-5-full');}
 const order=[];let release;const gate=new Promise(r=>release=r);const first=t.run(async()=>{order.push('first');await gate;order.push('first-end');});const second=t.run(async()=>{order.push('second');});await new Promise(r=>setTimeout(r,0));assert.deepEqual(order,['first']);release();await Promise.all([first,second]);assert.deepEqual(order,['first','first-end','second']);
 let finish;const blocking=t.run(()=>new Promise(r=>finish=r));const skipped=t.run(()=>{throw Error('Cancelled queued task executed');}).catch(e=>e.name);await new Promise(r=>setTimeout(r,0));t.stopAll();finish();await blocking;assert.equal(await skipped,'AbortError');await t.run(async()=>order.push('recovered'));assert.equal(order.at(-1),'recovered');assert(t.inlineProfile('v5')!==t.inlineProfile('v45'));
 console.log('PASS generation queue order, cancellation/recovery, separate inline profiles');
 const before=t.s.pairs.length;
 const imported={id:'prompt-import',image:'data:image/png;base64,iVBORw0KGgo=',meta:{settings:{...t.PARAMS},scene:{prompt:'garden',negative:'rain',characters:[]},pair:{positive:'soft light',negative:'blur'}},request:{parameters:{seed:123}}};
 await t.dbOp('images','put',imported);await t.enterStudio(imported.id);
 assert.equal(t.s.pairs.length,before);assert.equal(t.cfg.pair,'none');assert(t.cfg.prompt.includes('soft light'));assert(t.cfg.prompt.includes('garden'));assert(t.cfg.negative.includes('blur'));assert.equal(t.cfg.seed,-1);assert.equal(t.seedBox.value,'123');
 t.s.pairs.push({id:'saved-light',name:'光线',positive:'soft light',negative:'blur'});
 await t.enterStudio(imported.id);assert.equal(t.cfg.pair,'saved-light');assert.equal(t.cfg.prompt,'garden');assert.equal(t.cfg.negative,'rain');
 t.savePromptAsPair(t.cfg);let dialog=[...shadow.querySelectorAll('.dialog')].at(-1);dialog.querySelector('input[type=text]').value='花园';[...dialog.querySelectorAll('label')].find(x=>x.textContent.includes('设为画室当前内置词')).querySelector('input').checked=true;[...dialog.querySelectorAll('button')].find(x=>x.textContent==='保存').click();
 const pair=t.s.pairs.find(x=>x.name==='花园');assert(pair);assert.equal(pair.positive,'garden');assert.equal(pair.negative,'rain');assert.equal(t.cfg.pair,pair.id);assert.equal(t.cfg.prompt,'');assert.equal(t.cfg.negative,'');assert.equal(JSON.parse(W.localStorage.getItem('pear-atelier-state')).pear_nai_studio.studio2.draw.pair,pair.id);
 console.log('PASS 3.11.1: unsaved image prompts stay inline, saved pairs reused, save-and-apply persists without duplicate prompts');


 assert.equal(W.PearApp.version,'3.16.4');
 assert(!t.pages['设置'].textContent.includes('酒馆当前 API'));assert(!t.pages['设置'].textContent.includes('一键使用酒馆 API'));
 assert.equal(pair.params.model,t.cfg.model);t.applyPairParams(t.cfg,{params:{steps:32,scale:6}});assert.equal(t.cfg.steps,32);
 t.markPairBaseline();t.cfg.steps=33;t.closeShell();dialog=[...shadow.querySelectorAll('.dialog')].at(-1);assert(dialog.textContent.includes('参数有改动'));[...dialog.querySelectorAll('button')].find(x=>x.textContent==='存进当前画师串').click();assert.equal(pair.params.steps,33);assert.equal(shadow.querySelector('.shell').hidden,false);
 t.cfg.width=832;t.cfg.height=1216;t.shapeBtn.click();assert.equal(t.cfg.width,1216);assert.equal(t.cfg.height,832);t.shapeBtn.click();assert.equal(t.cfg.width,t.cfg.height);
 t.seedBox.value='567';[...shadow.querySelectorAll('button')].find(x=>x.textContent==='应用种子').click();assert.equal(t.cfg.seed,567);
 await t.subLoad();const st=t.subState();Object.assign(st,{mode:'custom',active:'provider',activeModel:'second',profiles:[{id:'provider',name:'模拟服务商',url:'https://api.test/v1',key:'test-only',models:['first','second']}]});
 const calls=[];W.pearFetch=async(url,options)=>{calls.push({url,body:JSON.parse(options.body)});return Response.json({choices:[{message:{content:calls.length===1?'### 正面\n花园':'女孩'}}]});};
 const zh=await t.translateScene('### 正面\ngarden\n\n### 人物1\n1girl');assert.equal(zh,'【正面】\n花园\n\n【人物1】\n女孩');assert.equal(calls.length,2);assert.equal(calls[0].url,'https://api.test/v1/chat/completions');assert.equal(calls[0].body.model,'second');
 assert.equal(t.allTags({prompt:'garden， light',characters:[{prompt:'1girl'},{prompt:'hidden',enabled:false}]}),'garden, light, 1girl');
 await t.dbOp('vault','put',{id:'zh-test',kind:'zh',src:'garden',text:'花园'});const holder=W.document.createElement('div');shadow.append(holder);t.translateBox(holder,()=> 'garden','zh-test');await new Promise(r=>setTimeout(r,20));assert(holder.textContent.includes('花园'));
 console.log('PASS 3.16.4: artist parameters/save confirmation, shape/seed controls, custom provider selection, translation fallback, stored translations');
 t.dispose();dom.window.close();console.log('PASS standalone: startup, v2 migration, Vibe models, no automatic library writes, V5 cancellation, metadata edits/import/navigation, corners, original PNG fixtures');
})().catch(e=>{console.error(e);process.exit(1)});
