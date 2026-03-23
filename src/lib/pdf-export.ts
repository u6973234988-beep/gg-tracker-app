/**
 * PDF Export per Playbook Trading
 * Genera un PDF professionale con descrizione, regole, performance e screenshot grafici
 */
import jsPDF from 'jspdf';

interface PlaybookPdfData {
  nome: string;
  descrizione?: string | null;
  descrizione_dettagliata?: string | null;
  colore?: string | null;
  attiva?: boolean;
  rischio_max_importo?: number | null;
  rischio_max_percentuale?: number | null;
  regole?: any[];
  operazioniCount?: number;
  winRate?: number;
  profitFactor?: number;
}

interface ScreenshotPdfData {
  id: string;
  imageData: string;
  data: string;
  asset: string;
  entrata: string;
  uscita: string;
  direzione: string;
  timestamp: number;
}

// Colori tema
const COLORS = {
  primary: [127, 0, 255] as [number, number, number],       // Viola
  primaryLight: [139, 92, 246] as [number, number, number],
  dark: [30, 30, 48] as [number, number, number],
  text: [30, 30, 48] as [number, number, number],
  textLight: [120, 120, 140] as [number, number, number],
  green: [34, 197, 94] as [number, number, number],
  red: [239, 68, 68] as [number, number, number],
  amber: [245, 158, 11] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  bgLight: [248, 247, 255] as [number, number, number],
  border: [230, 225, 245] as [number, number, number],
};

function addHeader(doc: jsPDF, nome: string, colore: string) {
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, 210, 28, 'F');

  const [r, g, b] = hexToRgb(colore || '#7F00FF');
  doc.setFillColor(r, g, b);
  doc.circle(22, 14, 4, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text(nome, 32, 17);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(200, 200, 220);
  doc.text('Trading Playbook — GG Tracker', 32, 23);

  const dateStr = new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });
  doc.setFontSize(8);
  doc.setTextColor(200, 200, 220);
  doc.text(dateStr, 195, 17, { align: 'right' });
}

function addSectionTitle(doc: jsPDF, y: number, title: string): number {
  doc.setFillColor(...COLORS.bgLight);
  doc.roundedRect(14, y - 5, 182, 10, 2, 2, 'F');
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, y - 5, 182, 10, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.primary);
  doc.text(title, 20, y + 1);
  return y + 12;
}

function addWrappedText(doc: jsPDF, text: string, x: number, y: number, maxWidth: number, lineHeight: number = 5): number {
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
}

function checkPageBreak(doc: jsPDF, y: number, needed: number = 30): number {
  if (y + needed > 275) {
    doc.addPage();
    return 20;
  }
  return y;
}

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [127, 0, 255];
}

export async function generatePlaybookPdf(strategia: PlaybookPdfData, screenshots: ScreenshotPdfData[]) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  let y = 38;

  // ─── HEADER ───────────────────────────────────
  addHeader(doc, strategia.nome, strategia.colore || '#7F00FF');

  // ─── SEZIONE 1: DESCRIZIONE ──────────────────
  y = addSectionTitle(doc, y, 'Descrizione');

  if (strategia.descrizione) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.text);
    y = addWrappedText(doc, strategia.descrizione, 20, y, 170, 4.5);
    y += 4;
  }

  if (strategia.descrizione_dettagliata) {
    const cleanText = strategia.descrizione_dettagliata.replace(/<[^>]*>/g, '').trim();
    if (cleanText) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...COLORS.text);
      y = checkPageBreak(doc, y, 20);
      y = addWrappedText(doc, cleanText, 20, y, 170, 4.5);
      y += 4;
    }
  }

  if (strategia.rischio_max_importo || strategia.rischio_max_percentuale) {
    y = checkPageBreak(doc, y, 15);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.amber);
    const riskParts: string[] = [];
    if (strategia.rischio_max_importo) riskParts.push(`Max Rischio: €${strategia.rischio_max_importo}`);
    if (strategia.rischio_max_percentuale) riskParts.push(`Max Rischio: ${strategia.rischio_max_percentuale}%`);
    doc.text(riskParts.join('   |   '), 20, y);
    y += 8;
  }

  // ─── SEZIONE 2: REGOLE / CONDIZIONI ──────────
  const regole = strategia.regole || [];
  if (regole.length > 0) {
    y = checkPageBreak(doc, y, 20);
    y = addSectionTitle(doc, y, `Regole / Condizioni (${regole.length})`);

    const grouped: Record<string, any[]> = {};
    regole.forEach((r: any) => {
      const g = r.gruppo || 'entry';
      if (!grouped[g]) grouped[g] = [];
      grouped[g].push(r);
    });

    const groupLabels: Record<string, string> = {
      entry: 'Condizioni di Ingresso',
      stop_loss: 'Stop Loss',
      take_profit: 'Take Profit',
      condizioni_mercato: 'Condizioni di Mercato',
    };

    for (const [gruppo, rules] of Object.entries(grouped)) {
      y = checkPageBreak(doc, y, 15);
      const label = groupLabels[gruppo] || gruppo.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.primaryLight);
      doc.text(label.toUpperCase(), 20, y);
      y += 5;

      for (const rule of rules) {
        y = checkPageBreak(doc, y, 8);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(...COLORS.text);
        doc.setFillColor(...COLORS.primaryLight);
        doc.circle(22, y - 1.2, 1, 'F');
        const wrappedY = addWrappedText(doc, rule.descrizione || '', 26, y, 164, 4.2);
        y = wrappedY + 2;
      }
      y += 3;
    }
  }

  // ─── SEZIONE 3: PERFORMANCE ──────────────────
  y = checkPageBreak(doc, y, 30);
  y = addSectionTitle(doc, y, 'Performance');

  const stats = [
    { label: 'Operazioni', value: String(strategia.operazioniCount || 0) },
    { label: 'Win Rate', value: `${(strategia.winRate || 0).toFixed(1)}%` },
    { label: 'Profit Factor', value: (strategia.profitFactor || 0).toFixed(2) },
  ];

  const boxWidth = 55;
  stats.forEach((stat, idx) => {
    const bx = 20 + idx * (boxWidth + 5);
    doc.setFillColor(...COLORS.bgLight);
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.3);
    doc.roundedRect(bx, y - 2, boxWidth, 16, 2, 2, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.textLight);
    doc.text(stat.label, bx + boxWidth / 2, y + 3, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...COLORS.text);
    doc.text(stat.value, bx + boxWidth / 2, y + 10.5, { align: 'center' });
  });
  y += 22;

  // ─── SEZIONE 4: SCREENSHOT GRAFICI ────────────
  if (screenshots && screenshots.length > 0) {
    y = checkPageBreak(doc, y, 20);
    y = addSectionTitle(doc, y, `Screenshot Grafici (${screenshots.length})`);

    for (const shot of screenshots) {
      // Each screenshot needs ~80mm (image) + ~15mm (metadata)
      y = checkPageBreak(doc, y, 95);

      // Metadata strip above image
      doc.setFillColor(...COLORS.bgLight);
      doc.roundedRect(20, y - 3, 170, 12, 2, 2, 'F');
      doc.setDrawColor(...COLORS.border);
      doc.setLineWidth(0.3);
      doc.roundedRect(20, y - 3, 170, 12, 2, 2, 'S');

      // Asset + Direction
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...COLORS.text);
      doc.text(shot.asset, 24, y + 4);

      // Direction badge
      const isLong = shot.direzione === 'LONG';
      const dirColor = isLong ? COLORS.green : COLORS.red;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(dirColor[0], dirColor[1], dirColor[2]);
      doc.text(shot.direzione, 50, y + 4);

      // Date
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.textLight);
      doc.text(shot.data, 75, y + 4);

      // Entry/Exit
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.text);
      const entryExitText = `Entry: $${shot.entrata || '-'}  |  Exit: $${shot.uscita || '-'}`;
      doc.text(entryExitText, 185, y + 4, { align: 'right' });

      y += 13;

      // Image
      try {
        if (shot.imageData && shot.imageData.startsWith('data:image/')) {
          const imgWidth = 170;
          const imgHeight = 70;
          const imgFormat = shot.imageData.includes('image/jpeg') ? 'JPEG' : 'PNG';
          doc.addImage(shot.imageData, imgFormat, 20, y, imgWidth, imgHeight);
          y += imgHeight + 5;
        }
      } catch (err) {
        // If image fails, skip it
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(...COLORS.textLight);
        doc.text('[Immagine non disponibile]', 20, y + 5);
        y += 12;
      }

      y += 3;
    }
  }

  // ─── FOOTER ──────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.textLight);
    doc.text(`GG Tracker — ${strategia.nome} — Pagina ${i}/${pageCount}`, 105, 290, { align: 'center' });

    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.2);
    doc.line(20, 286, 190, 286);
  }

  // Salva
  const fileName = `playbook-${strategia.nome.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}
