import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const assets={};
for(const [name,type] of [['index.html','text/html; charset=utf-8'],['app.js','application/javascript; charset=utf-8'],['settings-backup.js','application/javascript; charset=utf-8'],['themes.js','application/javascript; charset=utf-8'],['native-bridge.js','application/javascript; charset=utf-8'],['manifest.webmanifest','application/manifest+json']]) assets['/'+name]={body:readFileSync(new URL('dist/'+name,import.meta.url),'utf8'),type};
mkdirSync(new URL('dist/server/',import.meta.url),{recursive:true});
writeFileSync(new URL('dist/server/index.js',import.meta.url),'const ASSETS='+JSON.stringify(assets)+';\n'+readFileSync(new URL('server/handler.js',import.meta.url),'utf8'));
console.log('Built standalone Worker');

