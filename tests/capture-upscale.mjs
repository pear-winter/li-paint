import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('src/studio.js','utf8');
const code=source.slice(source.indexOf('function extract('),source.indexOf('// PNG text chunks'));
const scope={};vm.createContext(scope);vm.runInContext(code,scope);
const prompt='sfw, 2boys, anime style, masterpiece, medium shot, bar counter,\n(boyA:1.2, black long hair, looking at boyB),\n(boyB:1.2, blue eyes, looking at boyA), cinematic lighting';
const message='<imageTag>\n<imgthink>思考：image###do not draw this###</imgthink>\n┈┈✧✦吧台的视线交汇✦✧┈┈\nimage###\n'+prompt+'###\n</imageTag>';
const scenes=scope.messageScenes(message);
assert.equal(scenes.length,1);assert.equal(scenes[0].prompt,prompt);assert.equal(scenes[0].characters.length,0);
const labelled='image###Scene Composition: garden; Scene UC: blurry; Character 1 Prompt: 1girl | centers: B3; Character 1 UC: bad hands;###';
const mixed=scope.messageScenes(message+labelled);
assert.equal(mixed.length,2);assert.equal(mixed[1].prompt,'garden');assert.equal(mixed[1].characters[0].x,.25);
for(const bad of ['','Scene UC: blurry;','Scene Composition: garden; Scene Composition: sky;','Scene Composition: garden; Character 1 UC: bad hands;','<b>not a prompt</b>'])assert.equal(scope.messageScenes('image###'+bad+'###')[0],null);
assert.equal(scope.messageScenes('IMAGE###cat\nflowers###')[0].prompt,'cat\nflowers');
assert.equal(scope.messageScenes('<nai>cat</nai>')[0].prompt,'cat');
assert.equal(scope.messageScenes('image###unfinished').length,0);
assert.throws(()=>scope.messageScenes('image###cat###'.repeat(41)));

// Exercise the real paid-operation function with a transport stub, never a live Key.
const original={id:'original',image:'data:image/png;base64,b3JpZw==',request:{input:prompt,model:'nai-diffusion-4-5-full',parameters:{width:832,height:1216,seed:123}},meta:{scene:scenes[0]}};
let saved=[],requests=[],refreshes=0,fail=false;
Object.assign(scope,{copy:structuredClone,activeProfile:()=>({id:'official',type:'official'}),run:fn=>fn(),imageData:async url=>({url,width:url===original.image?832:1664,height:url===original.image?1216:2432}),notify:()=>{},api:async(path,payload,profile)=>{requests.push({path,payload,profile});if(fail)throw Error('network failed');return {};},decodeImages:async()=>['data:image/png;base64,aGQ='],acceptImages:async(images,request,source)=>{const item={images,request:structuredClone(request),source};saved.push(item);return[item];},s:{activeApi:'official'},refreshBalance:async()=>{refreshes++;}});
vm.runInContext(source.slice(source.indexOf('async function upscaleItem('),source.indexOf('function artistPair(')),scope);
const before=JSON.stringify(original);await scope.upscaleItem(original);
assert.equal(JSON.stringify(original),before);assert.equal(requests.length,1);assert.equal(requests[0].path,'/ai/upscale');
assert.equal(requests[0].payload.image,'b3JpZw==');assert.equal(requests[0].payload.width,832);assert.equal(requests[0].payload.height,1216);assert.equal(requests[0].payload.scale,2);
assert.equal(saved[0].request.parameters.width,1664);assert.equal(saved[0].request.parameters.height,2432);assert.equal(saved[0].request.parameters.seed,123);assert.equal(saved[0].request._pear.upscale.sourceId,'original');assert.equal(refreshes,1);
fail=true;await assert.rejects(scope.upscaleItem(original),/network failed/);assert.equal(requests.length,2);assert.equal(saved.length,1);assert.equal(JSON.stringify(original),before);
console.log('PASS: plain/structured capture, thinking exclusion, original preservation, upscale payload, dimensions, balance and no paid retry on failure');
