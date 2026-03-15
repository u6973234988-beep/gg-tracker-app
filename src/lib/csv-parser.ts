/**
 * CSV Parser per GG Tracker
 * Supporta importazione da diversi broker e formati CSV
 */

export interface OperazioneCSV {
  simbolo: string;
  direzione: 'LONG' | 'SHORT';
  quantita: number;
  prezzo_entrata: number;
  prezzo_uscita: number | null;
  commissione: number;
  strategia?: string;
  note?: string;
  data_apertura: string;
  data_chiusura?: string | null;
  tipo_ordine?: 'MARKET' | 'LIMIT' | 'STOP';
  pnl?: number | null;
  pnl_percentuale?: number | null;
}

/**
 * Converte una stringa di data in formato standardizzato ISO (YYYY-MM-DD)
 */
function parseDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString().split('T')[0];

  // Prova YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }

  // Prova DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    const [day, month, year] = dateStr.split('/');
    return `${year}-${month}-${day}`;
  }

  // Prova MM/DD/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
    const parts = dateStr.split('/');
    if (parseInt(parts[0]) > 12) {
      // Probably DD/MM/YYYY
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    } else {
      // Probably MM/DD/YYYY
      return `${parts[2]}-${parts[0]}-${parts[1]}`;
    }
  }

  // Default: return today's date
  return new Date().toISOString().split('T')[0];
}

/**
 * Normalizza la direzione del trade (LONG o SHORT)
 */
function parseDirection(direction: string): 'LONG' | 'SHORT' {
  const normalized = direction.toUpperCase().trim();
  if (
    normalized === 'LONG' ||
    normalized === 'BUY' ||
    normalized === 'L' ||
    normalized === 'B'
  ) {
    return 'LONG';
  }
  if (
    normalized === 'SHORT' ||
    normalized === 'SELL' ||
    normalized === 'S'
  ) {
    return 'SHORT';
  }
  return 'LONG';
}

/**
 * Effettua il parsing di un CSV nel formato standard
 * Headers attesi: data, ticker, direzione, quantita, prezzo_entrata, prezzo_uscita, commissione, strategia, note
 */
function parseDefaultFormat(rows: string[][]): OperazioneCSV[] {
  const header = rows[0].map((h) => h.toLowerCase().trim());

  const dataIdx = header.findIndex((h) =>
    ['data', 'data_apertura', 'date', 'entry_date'].includes(h),
  );
  const tickerIdx = header.findIndex((h) =>
    ['ticker', 'simbolo', 'symbol', 'instrument'].includes(h),
  );
  const direzioneIdx = header.findIndex((h) =>
    ['direzione', 'direction', 'side', 'type'].includes(h),
  );
  const quantitaIdx = header.findIndex((h) =>
    ['quantita', 'quantity', 'size', 'shares'].includes(h),
  );
  const prezzoEntrata = header.findIndex((h) =>
    ['prezzo_entrata', 'entry_price', 'entry'].includes(h),
  );
  const prezzoUscita = header.findIndex((h) =>
    ['prezzo_uscita', 'exit_price', 'exit'].includes(h),
  );
  const commissioneIdx = header.findIndex((h) =>
    ['commissione', 'commission', 'fee', 'fees'].includes(h),
  );
  const strategiaIdx = header.findIndex((h) =>
    ['strategia', 'strategy', 'sistema'].includes(h),
  );
  const noteIdx = header.findIndex((h) =>
    ['note', 'notes', 'commento', 'comment'].includes(h),
  );
  const dataChiusuraIdx = header.findIndex((h) =>
    ['data_chiusura', 'exit_date', 'data_uscita'].includes(h),
  );

  const operazioni: OperazioneCSV[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0 || !row[tickerIdx]) continue;

    const entryPrice = parseFloat(row[prezzoEntrata]?.replace(',', '.') || '0');
    const exitPrice = prezzoUscita >= 0
      ? parseFloat(row[prezzoUscita]?.replace(',', '.') || '')
      : null;
    const quantity = parseFloat(row[quantitaIdx]?.replace(',', '.') || '0');
    const commission = parseFloat(
      row[commissioneIdx]?.replace(',', '.') || '0',
    );

    operazioni.push({
      data_apertura: parseDate(row[dataIdx] || ''),
      simbolo: row[tickerIdx].toUpperCase().trim(),
      direzione: parseDirection(row[direzioneIdx] || 'LONG'),
      quantita: quantity,
      prezzo_entrata: entryPrice,
      prezzo_uscita: exitPrice,
      commissione: commission,
      strategia: row[strategiaIdx]?.trim() || undefined,
      note: row[noteIdx]?.trim() || undefined,
      data_chiusura: dataChiusuraIdx >= 0 ? parseDate(row[dataChiusuraIdx]) : null,
      tipo_ordine: 'MARKET',
    });
  }

  return operazioni;
}

/**
 * Effettua il parsing di un CSV nel formato TradeZero
 */
function parseTradeZeroFormat(rows: string[][]): OperazioneCSV[] {
  // TradeZero format: [DATE],[SYMBOL],[SIDE],[SHARES],[ENTRY PRICE],[EXIT PRICE],[COMMISSION]
  const operazioni: OperazioneCSV[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 7) continue;

    const quantity = parseFloat(row[3]?.replace(',', '.') || '0');
    const entryPrice = parseFloat(row[4]?.replace(',', '.') || '0');
    const exitPrice = row[5] ? parseFloat(row[5].replace(',', '.')) : null;
    const commission = parseFloat(row[6]?.replace(',', '.') || '0');

    operazioni.push({
      data_apertura: parseDate(row[0] || ''),
      simbolo: row[1].toUpperCase().trim(),
      direzione: parseDirection(row[2] || 'LONG'),
      quantita: quantity,
      prezzo_entrata: entryPrice,
      prezzo_uscita: exitPrice,
      commissione: commission,
      tipo_ordine: 'MARKET',
    });
  }

  return operazioni;
}

/**
 * Effettua il parsing di un CSV nel formato Interactive Brokers
 */
function parseInteractiveBrokersFormat(rows: string[][]): OperazioneCSV[] {
  const header = rows[0].map((h) => h.toLowerCase().trim());

  const symbolIdx = header.indexOf('symbol');
  const tradeIdTimeIdx = header.indexOf('tradeidtime');
  const quantityIdx = header.indexOf('quantity');
  const priceIdx = header.indexOf('price');
  const commissionIdx = header.indexOf('commission');

  const operazioni: OperazioneCSV[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row[symbolIdx]) continue;

    const quantity = Math.abs(parseFloat(row[quantityIdx]?.replace(',', '.') || '0'));
    const price = parseFloat(row[priceIdx]?.replace(',', '.') || '0');
    const commission = Math.abs(parseFloat(row[commissionIdx]?.replace(',', '.') || '0'));

    operazioni.push({
      data_apertura: parseDate(row[tradeIdTimeIdx] || ''),
      simbolo: row[symbolIdx].toUpperCase().trim(),
      direzione: quantity > 0 ? 'LONG' : 'SHORT',
      quantita: quantity,
      prezzo_entrata: price,
      prezzo_uscita: null,
      commissione: commission,
      tipo_ordine: 'MARKET',
    });
  }

  return operazioni;
}

/**
 * Effettua il parsing di un CSV nel formato Directa SIM
 */
function parseDirectaFormat(rows: string[][]): OperazioneCSV[] {
  const header = rows[0].map((h) => h.toLowerCase().trim());

  const dataIdx = header.findIndex((h) =>
    ['data', 'data operazione'].includes(h),
  );
  const simboloIdx = header.findIndex((h) =>
    ['isin', 'simbolo', 'codice'].includes(h),
  );
  const operazioneIdx = header.findIndex((h) =>
    ['operazione', 'tipo', 'side'].includes(h),
  );
  const quantitaIdx = header.findIndex((h) =>
    ['quantita', 'quantity', 'numero'].includes(h),
  );
  const prezzoIdx = header.findIndex((h) =>
    ['prezzo', 'price', 'prezzo unitario'].includes(h),
  );
  const commissioneIdx = header.findIndex((h) =>
    ['commissione', 'commission', 'spese'].includes(h),
  );

  const operazioni: OperazioneCSV[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row[simboloIdx]) continue;

    operazioni.push({
      data_apertura: parseDate(row[dataIdx] || ''),
      simbolo: row[simboloIdx].toUpperCase().trim(),
      direzione: parseDirection(row[operazioneIdx] || 'LONG'),
      quantita: parseFloat(row[quantitaIdx]?.replace(',', '.') || '0'),
      prezzo_entrata: parseFloat(row[prezzoIdx]?.replace(',', '.') || '0'),
      prezzo_uscita: null,
      commissione: parseFloat(
        row[commissioneIdx]?.replace(',', '.') || '0',
      ),
      tipo_ordine: 'MARKET',
    });
  }

  return operazioni;
}

/**
 * Effettua il parsing di un file CSV
 * @param content - Contenuto del file CSV
 * @param broker - Tipo di broker (default, TradeZero, Interactive Brokers, Directa SIM)
 * @returns Array di operazioni parsate
 */
export function parseCSV(
  content: string,
  broker: string = 'default',
): OperazioneCSV[] {
  // Rimuovi BOM e spazi bianchi
  const cleanContent = content.replace(/^\uFEFF/, '').trim();

  // Usa un parser più semplice
  const csvRows = cleanContent.split('\n').map((line) => {
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        cells.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    if (current) {
      cells.push(current.trim());
    }

    return cells;
  });

  // Filtra le righe vuote
  const validRows = csvRows.filter(
    (row) => row.length > 0 && row.some((cell) => cell.length > 0),
  );

  if (validRows.length < 2) {
    throw new Error('File CSV invalido: non contiene intestazione e dati');
  }

  // Effettua il parsing in base al broker
  let operazioni: OperazioneCSV[] = [];

  switch (broker.toLowerCase()) {
    case 'tradezero':
      operazioni = parseTradeZeroFormat(validRows);
      break;
    case 'interactive brokers':
    case 'interactive':
      operazioni = parseInteractiveBrokersFormat(validRows);
      break;
    case 'directa sim':
    case 'directa':
      operazioni = parseDirectaFormat(validRows);
      break;
    case 'default':
    default:
      operazioni = parseDefaultFormat(validRows);
      break;
  }

  // Valida e pulisci le operazioni
  return operazioni.filter((op) => {
    return (
      op.simbolo &&
      op.quantita > 0 &&
      op.prezzo_entrata > 0 &&
      op.data_apertura
    );
  });
}

/**
 * Genera un CSV di esempio per il download
 */
export function generateExampleCSV(): string {
  const header = [
    'Data',
    'Ticker',
    'Direzione',
    'Quantità',
    'Prezzo Entrata',
    'Prezzo Uscita',
    'Commissione',
    'Strategia',
    'Note',
  ];

  const examples = [
    [
      '2024-03-15',
      'AAPL',
      'LONG',
      '100',
      '150.25',
      '152.50',
      '1.99',
      'Trend Following',
      'Breakout ribassista',
    ],
    [
      '2024-03-14',
      'MSFT',
      'SHORT',
      '50',
      '420.00',
      '415.00',
      '1.99',
      'Mean Reversion',
      'Correzione dopo impulso',
    ],
    [
      '2024-03-13',
      'TSLA',
      'LONG',
      '25',
      '200.00',
      '',
      '0.00',
      'Swing Trading',
      'Posizione aperta',
    ],
  ];

  const csv = [
    header.join(','),
    ...examples.map((row) => row.join(',')),
  ].join('\n');

  return csv;
}

/**
 * Esporta operazioni in formato CSV
 */
export function exportToCSV(
  operazioni: any[],
): string {
  const header = [
    'Data Apertura',
    'Data Chiusura',
    'Ticker',
    'Direzione',
    'Quantità',
    'Prezzo Entrata',
    'Prezzo Uscita',
    'Commissione',
    'P&L',
    'P&L %',
    'Strategia',
    'Note',
    'Stato',
  ];

  const rows = operazioni.map((op) => [
    op.data_apertura || '',
    op.data_chiusura || '',
    op.simbolo || '',
    op.direzione || '',
    op.quantita || '',
    op.prezzo_entrata || '',
    op.prezzo_uscita || '',
    op.commissione || '',
    op.pnl || '',
    op.pnl_percentuale || '',
    op.strategia?.nome || '',
    op.note || '',
    op.stato || '',
  ]);

  const csv = [
    header.join(','),
    ...rows.map((row) =>
      row
        .map((cell) => {
          if (typeof cell === 'string' && cell.includes(',')) {
            return `"${cell}"`;
          }
          return cell;
        })
        .join(','),
    ),
  ].join('\n');

  return csv;
}
