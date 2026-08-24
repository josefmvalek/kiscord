/**
 * PDF & ZIP Export Tools for Matura Module
 */

import { state } from '@core/state.js';
import { supabase } from '@core/supabase.js';
import { showNotification } from '@core/theme.js';
import { triggerHaptic } from '@core/utils.js';
import { renderModal } from '@core/ui.js';

export function openPDFViewer(url, title) {
    const modalHtml = `
        <div class="flex-1 w-full bg-black relative animate-fade-in">
            <iframe src="${url}" class="absolute inset-0 w-full h-full border-none" title="${title}"></iframe>
        </div>
        <div class="p-4 bg-black/40 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
            <div class="flex items-center gap-4">
                <p class="text-[10px] text-gray-500 uppercase tracking-widest font-black">Maturitní materiály 🎓</p>
                <a href="${url}" download class="bg-[#5865F2] hover:bg-[#4752c4] text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition flex items-center gap-2">
                    <i class="fas fa-download"></i> Stáhnout PDF
                </a>
            </div>
            <p class="text-[10px] text-gray-400 italic font-medium opacity-60">Problémy se zobrazením? Použijte Chrome nebo Stáhnout PDF.</p>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', renderModal({
        id: 'pdf-modal',
        title: title,
        subtitle: 'Režim soustředěného čtení 📖',
        content: modalHtml,
        size: 'full',
        onClose: "document.getElementById('pdf-modal')?.remove()"
    }));
    document.getElementById('pdf-modal')?.classList.remove('hidden');
    document.getElementById('pdf-modal')?.classList.add('flex');
    triggerHaptic('medium');
}

/**
 * Converts markdown text into a formatted PDF document using jsPDF
 */
export function generatePDFFromMarkdown(title, markdownText) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const margin = 15;
    const pageWidth = 210;
    const contentWidth = pageWidth - (margin * 2);
    let y = margin;

    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(88, 101, 242);
    doc.text(title, margin, y);
    y += 10;

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150, 150, 150);
    doc.text(`Kiscord Maturitní Akademie • Vygenerováno: ${new Date().toLocaleDateString('cs-CZ')}`, margin, y);
    y += 4;

    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.5);
    doc.line(margin, y, margin + contentWidth, y);
    y += 8;

    // Content Lines
    const lines = (markdownText || '').split('\n');
    doc.setTextColor(40, 40, 40);

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (y > 275) {
            doc.addPage();
            y = margin;
        }

        if (!line) {
            y += 4;
            continue;
        }

        if (line.startsWith('# ')) {
            y += 4;
            doc.setFont("helvetica", "bold");
            doc.setFontSize(14);
            doc.setTextColor(40, 40, 40);
            const text = line.replace('# ', '').trim();
            doc.text(text, margin, y);
            y += 7;
        } else if (line.startsWith('## ')) {
            y += 3;
            doc.setFont("helvetica", "bold");
            doc.setFontSize(12);
            doc.setTextColor(88, 101, 242);
            const text = line.replace('## ', '').trim();
            doc.text(text, margin, y);
            y += 6;
        } else if (line.startsWith('### ')) {
            y += 2;
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.setTextColor(80, 80, 80);
            const text = line.replace('### ', '').trim();
            doc.text(text, margin, y);
            y += 5;
        } else if (line.startsWith('- ') || line.startsWith('* ')) {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
            doc.setTextColor(50, 50, 50);
            const text = line.replace(/^[-*]\s+/, '').trim();
            const splitLines = doc.splitTextToSize(`• ${text}`, contentWidth - 4);
            doc.text(splitLines, margin + 4, y);
            y += splitLines.length * 4.5;
        } else {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
            doc.setTextColor(50, 50, 50);
            const cleanLine = line.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1');
            const splitLines = doc.splitTextToSize(cleanLine, contentWidth);
            doc.text(splitLines, margin, y);
            y += splitLines.length * 4.5;
        }
    }

    return doc.output('blob');
}

/**
 * Export single topic to PDF
 */
export async function downloadSinglePDF(itemId) {
    const btn = document.getElementById(`btn-pdf-${itemId}`);
    if (!btn) return;

    if (!window.jspdf?.jsPDF) {
        showNotification('Chyba: PDF knihovna se nepodařila načíst.', 'error');
        return;
    }

    let topicData = null;
    if (state.maturaTopics) {
        for (const cat in state.maturaTopics) {
            const found = state.maturaTopics[cat].find(i => i.id === itemId);
            if (found) { topicData = found; break; }
        }
    }
    const title = topicData?.title || 'Maturitní otázka';

    const originalIcon = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    btn.disabled = true;

    try {
        let markdownContent = state.maturaKBContent?.[itemId]?.content || null;
        if (!markdownContent) {
            const { data } = await supabase.from('matura_kb').select('content').eq('item_id', itemId).maybeSingle();
            markdownContent = data?.content || '';
        }

        const blob = generatePDFFromMarkdown(title, markdownContent);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title.replace(/[^a-z0-9A-Z_]/gi, '_').substring(0, 60)}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showNotification('PDF staženo! 📄', 'success');
    } catch (err) {
        console.error('PDF Generation Error:', err);
        showNotification('Chyba při generování PDF.', 'error');
    } finally {
        btn.innerHTML = originalIcon;
        btn.disabled = false;
    }
}

/**
 * Export all topics in subject to ZIP of PDFs
 */
export async function downloadAllAsZip(subject) {
    const items = state.maturaTopics?.[subject] || [];
    if (items.length === 0) {
        showNotification('Kategorie je prázdná.', 'warning');
        return;
    }

    if (!window.jspdf?.jsPDF || !window.JSZip) {
        showNotification('Chyba: PDF/ZIP knihovna se nepodařila načíst.', 'error');
        return;
    }

    const btn = document.getElementById('btn-zip-all');
    let originalIcon = '';
    if (btn) {
        originalIcon = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span class="hidden sm:inline">Generuji...</span>';
        btn.disabled = true;
    }

    showNotification('Generuji ZIP, chvíli počkej...', 'info');

    try {
        const zip = new window.JSZip();

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (btn) btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> <span class="hidden sm:inline">${i + 1}/${items.length}: ${item.title.substring(0, 20)}</span>`;

            try {
                const { data } = await supabase.from('matura_kb').select('content').eq('item_id', item.id).maybeSingle();
                const content = data?.content || '';
                if (content.trim().length > 10) {
                    const blob = generatePDFFromMarkdown(item.title, content);
                    const safeName = `${String(i + 1).padStart(2, '0')}_${item.title.replace(/[^a-z0-9A-Z_]/gi, '_').substring(0, 50)}.pdf`;
                    zip.file(safeName, blob);
                }
            } catch (err) {
                console.warn(`Skipping item ${item.title} due to error:`, err);
            }
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Maturita_${subject}_${new Date().toISOString().split('T')[0]}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showNotification('ZIP archiv stažen! 📦🎉', 'success');
        triggerHaptic('success');
    } catch (err) {
        console.error('ZIP Error:', err);
        showNotification('Chyba při tvorbě ZIP archivu.', 'error');
    } finally {
        if (btn) {
            btn.innerHTML = originalIcon;
            btn.disabled = false;
        }
    }
}
