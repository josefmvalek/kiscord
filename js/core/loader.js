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
