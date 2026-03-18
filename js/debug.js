
// debug.js - On-Screen Error Reporter
(function () {
    console.log("Debug script initialized");

    function showOverlay(title, message, details) {
        let overlay = document.getElementById('debug-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'debug-overlay';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                background: rgba(237, 66, 69, 0.95);
                color: white;
                z-index: 9999;
                padding: 20px;
                font-family: monospace;
                box-sizing: border-box;
                max-height: 50vh;
                overflow-y: auto;
                border-bottom: 4px solid #fff;
            `;
            document.body.appendChild(overlay);
        }

        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = "margin-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.3); padding-bottom: 10px;";

        errorDiv.innerHTML = `
            <h3 style="margin: 0 0 5px 0; font-size: 16px; font-weight: bold;">${title}</h3>
            <p style="margin: 0 0 5px 0; font-size: 14px;">${message}</p>
            <pre style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: 4px; overflow-x: auto; white-space: pre-wrap;">${details || ''}</pre>
            <button class="copy-btn" style="background: white; color: #ed4245; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-weight: bold; margin-top: 5px;">Copy Error Report</button>
        `;

        const copyBtn = errorDiv.querySelector('.copy-btn');
        copyBtn.addEventListener('click', () => {
            const textToCopy = `Error: ${title}\nMessage: ${message}\nDetails: ${details}\nnavigator: ${navigator.userAgent}`;
            navigator.clipboard.writeText(textToCopy).then(() => {
                copyBtn.textContent = "Copied!";
                setTimeout(() => copyBtn.textContent = "Copy Error Report", 2000);
            }).catch(err => {
                console.error('Failed to copy text: ', err);
                copyBtn.textContent = "Copy Failed";
            });
        });

        overlay.appendChild(errorDiv);
    }

    window.onerror = function (msg, url, lineNo, columnNo, error) {
        const details = `File: ${url}\nLine: ${lineNo}\nColumn: ${columnNo}\nStack: ${error ? error.stack : 'N/A'}`;
        showOverlay("Global Error", msg, details);
        return false; // Let standard error handling proceed
    };

    window.onunhandledrejection = function (event) {
        showOverlay("Unhandled Promise Rejection", event.reason, event.reason ? event.reason.stack : 'No stack trace');
    };

})();
