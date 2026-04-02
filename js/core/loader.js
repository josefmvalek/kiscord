/**
 * Dynamic Asset Loader
 * Used to load heavy external dependencies (Leaflet, etc.) only when requested.
 */

const loadedAssets = new Set();

export async function loadExternalScript(url) {
    if (loadedAssets.has(url)) return Promise.resolve();

    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = url;
        script.onload = () => {
            loadedAssets.add(url);
            resolve();
        };
        script.onerror = (err) => reject(new Error(`Failed to load script: ${url}`));
        document.body.appendChild(script);
    });
}

export async function loadExternalStyle(url) {
    if (loadedAssets.has(url)) return Promise.resolve();

    return new Promise((resolve, reject) => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = url;
        link.onload = () => {
            loadedAssets.add(url);
            resolve();
        };
        link.onerror = (err) => reject(new Error(`Failed to load stylesheet: ${url}`));
        document.head.appendChild(link);
    });
}

export async function loadLeaflet() {
    try {
        await Promise.all([
            loadExternalStyle('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'),
            loadExternalScript('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js')
        ]);
        console.log('✅ Leaflet loaded successfully');
    } catch (err) {
        console.error('❌ Leaflet load failed:', err);
    }
}

export async function loadMarked() {
    return loadExternalScript('https://cdn.jsdelivr.net/npm/marked/marked.min.js');
}

export async function loadApexCharts() {
    return loadExternalScript('https://cdn.jsdelivr.net/npm/apexcharts');
}

export async function loadKaTeX() {
    await Promise.all([
        loadExternalStyle('https://cdn.jsdelivr.net/npm/katex@0.16.10/dist/katex.min.css'),
        loadExternalScript('https://cdn.jsdelivr.net/npm/katex@0.16.10/dist/katex.min.js')
    ]);
}

export async function loadHighlightJS() {
    await Promise.all([
        loadExternalStyle('https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css'),
        loadExternalScript('https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js')
    ]);
}
