import { describe, it, expect } from 'vitest';
import { escapeHTML, safeHTML, rawHTML } from '../../js/core/security.js';

describe('Security & Template Sanitization', () => {
    it('escapeHTML properly escapes HTML special characters', () => {
        const malicious = '<script>alert("XSS")</script>&"\'';
        const clean = escapeHTML(malicious);

        expect(clean).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;&amp;&quot;&#39;');
    });

    it('safeHTML tagged template escapes dynamic parameters automatically', () => {
        const username = '<img src=x onerror=alert(1)>';
        const count = 5;
        const result = safeHTML`<div class="user">${username} - <span>${count}</span></div>`;

        expect(result).toBe('<div class="user">&lt;img src=x onerror=alert(1)&gt; - <span>5</span></div>');
    });

    it('safeHTML respects trusted rawHTML tokens', () => {
        const icon = rawHTML('<i class="fas fa-heart"></i>');
        const text = '<script>';
        const result = safeHTML`<div>${icon} ${text}</div>`;

        expect(result).toBe('<div><i class="fas fa-heart"></i> &lt;script&gt;</div>');
    });
});
