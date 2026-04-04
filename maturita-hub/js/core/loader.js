/**
 * MaturitaHub 2026 - Resource Loader
 * Dynamically loads external dependencies only when needed.
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

export async function loadMarked() {
    return loadExternalScript('https://cdn.jsdelivr.net/npm/marked/marked.min.js');
}

export async function loadKaTeX() {
    // 1. Load styles and core script first
    await Promise.all([
        loadExternalStyle('https://cdn.jsdelivr.net/npm/katex@0.16.10/dist/katex.min.css'),
        loadExternalScript('https://cdn.jsdelivr.net/npm/katex@0.16.10/dist/katex.min.js')
    ]);

    // 2. Load auto-render extension only AFTER core is ready
    return loadExternalScript('https://cdn.jsdelivr.net/npm/katex@0.16.10/dist/contrib/auto-render.min.js');
}

export async function loadCodeMirror() {
    await Promise.all([
        loadExternalStyle('https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/codemirror.min.css'),
        loadExternalStyle('https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/theme/abbott.min.css'), // Using a balanced dark theme
        loadExternalScript('https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/codemirror.min.js')
    ]);

    // Load modes sequentially after base
    await loadExternalScript('https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/xml/xml.min.js'); // For HTML in MD
    await loadExternalScript('https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/markdown/markdown.min.js');
    await loadExternalScript('https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/addon/mode/overlay.js'); // Required for GFM
    await loadExternalScript('https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/gfm/gfm.min.js');
    await loadExternalScript('https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/addon/edit/continuelist.min.js');
}
