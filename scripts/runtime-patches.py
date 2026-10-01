"""Small shared runtime fixes; uploaded studio source stays unchanged."""
def patch_runtime(source, once):
    source=once(source,"const uid=()=>W.crypto.randomUUID(),copy=x=>structuredClone(x);", "const uid=()=>{if(W.crypto.randomUUID)return W.crypto.randomUUID();const a=W.crypto.getRandomValues(new Uint8Array(16));a[6]=(a[6]&15)|64;a[8]=(a[8]&63)|128;const h=Array.from(a,x=>x.toString(16).padStart(2,'0')).join('');return h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20);},copy=x=>structuredClone(x);")
    source=once(source,"txt='绘画中 '","txt='绘画中 · 估算 '")
    source=once(source,"else{frac=1;txt='完成 · 用时 '+((g.done-g.start)/1000).toFixed(1)+' 秒';}","else{frac=g.ok?1:0;txt=(g.ok?'完成':'未完成')+' · 用时 '+((g.done-g.start)/1000).toFixed(1)+' 秒';}")
    source=once(source,"if(g.active)g.raf=W.requestAnimationFrame(()=>W.setTimeout(drawProgress,200));", "if(g.active&&!dead)g.raf=W.requestAnimationFrame(()=>{g.raf=0;g.timer=W.setTimeout(()=>{g.timer=0;if(g.active&&!dead)drawProgress();},200);});")
    source=once(source,"g.start=Date.now();g.active=true;W.clearTimeout(g.hideTimer);if(!g.raf)drawProgress();", "g.start=Date.now();g.active=true;g.ok=false;W.clearTimeout(g.hideTimer);W.clearTimeout(g.timer);W.cancelAnimationFrame(g.raf);g.timer=g.raf=0;drawProgress();")
    source=once(source,"g.active=false;g.done=Date.now();if(ok)", "g.active=false;g.ok=ok;g.done=Date.now();W.clearTimeout(g.timer);W.cancelAnimationFrame(g.raf);g.timer=g.raf=0;if(ok)")
    source=once(source,"save();drawProgress();}g.hideTimer=", "save();}drawProgress();g.hideTimer=")
    source=once(source,"controller?.abort();notify(waiting?", "controller?.abort();endProgress(false);notify(waiting?")
    source=once(source,"if(dead)return;dead=true;controller?.abort();observer.disconnect();", "if(dead)return;dead=true;controller?.abort();const progress=genProgress();progress.active=false;W.clearTimeout(progress.timer);W.clearTimeout(progress.hideTimer);W.cancelAnimationFrame(progress.raf);progress.timer=progress.raf=0;observer.disconnect();")
    return source
