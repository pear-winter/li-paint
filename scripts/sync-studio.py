"""Generate the standalone app and native ST extension from the supplied studio source."""
from pathlib import Path
root=Path(__file__).resolve().parents[1]
source=(root/'src/studio.js').read_text()
def once(s,a,b):
 if s.count(a)!=1:raise ValueError('Source changed, inspect adapter: '+a[:100])
 return s.replace(a,b,1)
import runpy
source=runpy.run_path(str(root/'scripts/runtime-patches.py'))['patch_runtime'](source,once)
# Native extension: shared UI, settings namespace and database, no Tavern Helper required.
import json
# Script 4.0.4 carries the cancellation fix; standalone stays on its released source.
ext_source=json.loads((root/'downloads/pear-atelier-script-4.0.4.json').read_text())['content']
ext=once(ext_source,'(function startAtelier(){','export function startAtelier(getContext,uploadImage){')
ext=once(ext,'const W=window.parent||window,','const W=window,')
ext=once(ext,'const ctx=()=>W.SillyTavern?.getContext();if(!ctx())return;','const ctx=getContext;if(!ctx())return;')
# Use the host's image helper: endpoints and payloads changed between releases.
a=ext.index("const response=await awaitTask(task,()=>W.fetch('/api/images/upload'")
z=ext.index('if(!validSource(src))return;',a)
ext=ext[:a]+"const result=await awaitTask(task,()=>uploadImage(item,task.controller.signal));"+ext[z:]
ext=once(ext,'cleanup.push(()=>ctx().eventSource.removeListener(event,fn));', 'cleanup.push(()=>{const bus=ctx().eventSource;const off=bus?.removeListener||bus?.off;off?.call(bus,event,fn);});')
ext=once(ext,"let hostIsGenerating=null;import('/script.js')","let hostIsGenerating=null;import(new URL('script.js',D.baseURI).href)")
ext=ext.removesuffix('\n')
assert ext.endswith('})();')
ext=ext[:-5]+'}\n'
(root/'extension/studio.js').write_text(ext)
# Standalone uses the existing origin, settings key and IndexedDB scope.
s=once(source,"const W=window.parent||window,D=W.document,OWNER='__pear_nai_studio_v1';", "const W=window,D=W.document,OWNER='__pear_atelier_app';")
s=once(s,'const ctx=()=>W.SillyTavern?.getContext();if(!ctx())return;',"let appState={};try{appState=JSON.parse(W.localStorage.getItem('pear-atelier-state')||'{}');}catch{}\nconst ctx=()=>({extensionSettings:appState,chat:[]});")
s=once(s,'function save(){ctx().saveSettingsDebounced?.();scheduleTokens();}',"function save(){W.localStorage.setItem('pear-atelier-state',JSON.stringify(appState));scheduleTokens();}")
s=s.replace("['绘图','文生图配置','元数据库','Vibe 库','图库','设置']","['绘图','元数据库','Vibe 库','图库','设置']")
s='\n'.join(l for l in s.splitlines() if not l.startswith(("box=section(pages['文生图配置']", "{const pg=pages['文生图配置'];")))+'\n'
s=once(s,"let area=section(pages['设置'],'正文图片与按钮',true);", "let area; if(false){area=section(pages['设置'],'正文图片与按钮',true);")
s=once(s," const themeArea=section(pages['设置'],'内置美化',true)"," }\n const themeArea=section(pages['设置'],'内置美化',true)")
s=once(s,"note(themeArea,'跟随酒馆主题会随酒馆颜色实时变化，无需重复导入 CSS。');", """themeArea.append(uploadButton('导入酒馆主题配色',async file=>{if(file.size>1024*1024)throw Error('主题文件过大。');const data=JSON.parse(await file.text()),map={main_text_color:'Body',em_text_color:'Em',quote_text_color:'Quote',blur_tint_color:'BlurTint',chat_tint_color:'ChatTint',border_color:'Border',shadow_color:'Shadow'},colors={};for(const[k,n]of Object.entries(map)){const value=data[k];if(typeof value==='string'&&W.CSS?.supports('color',value))colors['--SmartTheme'+n+'Color']=value;}if(!Object.keys(colors).length)throw Error('请选择酒馆导出的主题 JSON。');s.ui.tavernColors=colors;applyTavernColors();s.ui.theme='tavern';host.dataset.theme='tavern';s.ui.css=BUILTIN_THEMES.find(x=>x.id==='tavern').css;themeMenu.value='tavern';style.textContent=s.ui.css;layoutStyle.textContent='';save();notify('已应用酒馆主题配色。');},'.json,application/json'));note(themeArea,'独立画室可导入酒馆主题配色；配色保存在当前设备。');""")
s=once(s,"r=await W.fetch(endpointBase", "r=await W.pearFetch(endpointBase")
s=once(s,"function download(url,name){const a=e('a');", "function download(url,name){if(W.PearAndroid||W.__pearDesktopNonce){return W.pearSave(url,name).then(()=>notify('文件已保存。')).catch(err=>notify(err.message,true));}const a=e('a');")
s=once(s,"function downloadBlob(blob,name){const url=", "function downloadBlob(blob,name){if(W.PearAndroid||W.__pearDesktopNonce){return W.pearSaveBlob(blob,name).then(()=>notify('文件已保存。')).catch(err=>notify(err.message,true));}const url=")
# No chat scanners, chat writes, or floating Tavern entrances in standalone builds.
s=once(s,"const fab=b('',open);fab.className='fab';", "const fab=b('',open);fab.className='fab';fab.hidden=true;")
start=s.index('function renderEntries(){');end=s.index('\nfab.onpointerdown',start)
s=s[:start]+"function renderEntries(){fab.hidden=true;}"+s[end:]
start=s.index("on('GENERATION_STARTED'");end=s.index('\nconst resize=',start)
s=s[:start]+"const observer={disconnect(){}};\n"+s[end:]
s=once(s,"async function pruneDeletedCurrent(){", "async function pruneDeletedCurrent(){return;}\nasync function unusedPruneDeletedCurrent(){")
s=once(s,"图库及对应正文插图会同步删除，其他聊天下次打开时同步。", "将删除当前画室图库中的所选图片。")
s=once(s,"b('收起',()=>closeShell())", "b('绘图',()=>closeShell())")
# Keep the new parameter-save prompt, but standalone must remain open.
start=s.index('function closeShell(){');end=s.index('\nfunction sync(){',start)
s=s[:start]+s[start:end].replace('shell.hidden=true;',"page('绘图');")+s[end:]
# The standalone app has no current Tavern API. Only user-configured providers apply.
s=once(s,"const next={...subDefaults(),...v};", "const next={...subDefaults(),...v,mode:'custom'};")
s=once(s,"Object.assign(e('option','酒馆当前 API'),{value:'__tavern'}),", "")
s=once(s,"prov.value=p?p.id:'__tavern';", "prov.value=p?p.id:'__new';")
s=once(s,"row(b('测试连接',act(testConn)),b('一键使用酒馆 API',act(async()=>{subState().mode='tavern';await persist();refreshSubApi();await testConn();})))", "row(b('测试连接',act(testConn)))")
s=once(s,"if(!st.active)st.mode='tavern';", "if(!st.active)st.mode='custom';")
s=once(s,"return st.mode==='tavern'||!p?'酒馆当前 API':p.name+' · '+p.model;", "return !p?'未配置服务商':p.name+' · '+p.model;")
s=once(s,"r=await W.fetch(subUrl(c.url,", "r=await W.pearFetch(subUrl(c.url,")
s=once(s,"r=await W.fetch(subUrl(url.value,", "r=await W.pearFetch(subUrl(url.value,")
s=once(s,"buildSubApiSettings(subApiBox);", "buildSubApiSettings(subApiBox);note(subApiBox,'网页版请配置允许浏览器跨域访问的 HTTPS 副 API；配置和译文保存在当前设备。');")
start=s.index('W[OWNER]={dispose,open,inline:{');end=s.index(";window.addEventListener('pagehide'",start);s=s[:start]+'W[OWNER]={dispose,open}'+s[end:]
s=once(s,"W[OWNER]={dispose,open};", """function applyTavernColors(){for(const [key,value]of Object.entries(s.ui.tavernColors||{})){if(/^--SmartTheme[A-Za-z]+Color$/.test(key)&&typeof value==='string'&&W.CSS?.supports('color',value))host.style.setProperty(key,value);}}
applyTavernColors();
const standaloneStyle=e('style');standaloneStyle.textContent='.shell{inset:0!important;width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;border:0!important}.fab{display:none!important}';root.append(standaloneStyle);
W[OWNER]={dispose,open};D.getElementById('startup')?.remove();W.PearApp={version:'4.0.2',back(){const dialogs=root.querySelectorAll('.modal');if(dialogs.length){dialogs[dialogs.length-1].remove();return true;}return false;}};open();""")
s=s.replace('独立酒馆助手脚本 · SillyTavern 1.19 / 酒馆助手 4.10','独立画室 · 网页 / Android / Windows')
(root/'dist/app.js').write_text(s)
print('Generated standalone 4.0.2 and native extension 4.0.4')
