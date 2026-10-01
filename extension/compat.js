// Bridge host APIs without changing SillyTavern's global context or settings.
export function makeContextReader(host, core = {}, extensions = {}) {
    return () => {
        const raw = host.SillyTavern?.getContext?.() || extensions.getContext?.();
        if (!raw) return null;
        return {
            ...raw,
            extensionSettings: raw.extensionSettings || extensions.extension_settings,
            saveSettingsDebounced: raw.saveSettingsDebounced || core.saveSettingsDebounced,
            getRequestHeaders: raw.getRequestHeaders || core.getRequestHeaders,
            saveChat: raw.saveChat || core.saveChatConditional,
            getCurrentChatId: raw.getCurrentChatId || core.getCurrentChatId || (() => raw.chatId),
            eventSource: raw.eventSource || core.eventSource,
            eventTypes: raw.eventTypes || raw.event_types || core.event_types,
            generateRaw: raw.generateRaw || core.generateRaw,
        };
    };
}
export function normalizeImagePath(path, base) {
    if (typeof path !== 'string' || !path || path.includes('\\') || path.startsWith('//') || /^[a-z][a-z\d+.-]*:/i.test(path)) throw Error('酒馆返回了无效的图片路径。');
    const url = new URL(path, base);
    if (url.origin !== new URL(base).origin || url.search || url.hash) throw Error('酒馆图片路径无效。');
    return url.pathname;
}
export function makeImageUploader(saveBase64AsFile, base) {
    return async (item, signal) => {
        const check = () => { if (signal?.aborted) throw new DOMException('Aborted', 'AbortError'); };
        check();
        if (typeof saveBase64AsFile !== 'function') throw Error('当前酒馆缺少图片保存接口；图片仍保存在画室图库中。');
        // Host helper selects its own endpoint and data-URL/raw-base64 format.
        const path = await saveBase64AsFile(item.image.split(',')[1], 'pear-nai', item.id, 'png');
        check();
        return { path: normalizeImagePath(path, base) };
    };
}
export async function loadHostCompatibility(host = window, importer = url => import(url)) {
    const base = host.document.baseURI;
    const modules = await Promise.allSettled([
        importer(new URL('script.js', base).href),
        importer(new URL('scripts/extensions.js', base).href),
        importer(new URL('scripts/utils.js', base).href),
    ]);
    const [core, extensions, utils] = modules.map(result => result.status === 'fulfilled' ? result.value : {});
    return { getContext: makeContextReader(host, core, extensions), uploadImage: makeImageUploader(utils.saveBase64AsFile, base) };
}
