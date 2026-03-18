/**
 * CSV Parser per GG Tracker
 * Supporta importazione da diversi broker e formati CSV
 *
 * Logica direzione TradeZero:
 *   B  = Buy (apertura LONG)
 *   S  = Sell (chiusura LONG)
 *   SS = Sell Short (apertura SHORT)
 *   BC = Buy to Cover (chiusura SHORT)
 *
 * Consolidamento posizioni per ticker+data:
 *   - Si identifica la leg di apertura (B o SS) per prezzo_entrata e quantita
 *   - Si identifica la leg di chiusura (S o BC) per prezzo_uscita
 *   - Più aperture → prezzo medio ponderato
 *   - La quantita dell'operazione = qty della leg di apertura (non somma totale)
 *   - Net Proceeds da TradeZero è già il P&L netto (commissioni già incluse)
 */

export interface OperazioneCSV {
  ticker: string;
  direzione: 'LONG' | 'SHORT';
  quantita: number;
  prezzo_entrata: number;
  prezzo_uscita: number | null;
  commissione: number;
  note?: string;
  data: string;
  pnl?: number | null;
  pnl_percentuale?: number | null;
  ora_entrata?: string;
  ora_uscita?: string;
  durata?: string;
  timestamp?: number;
  esecuzioni?: { ora: string; prezzo: number; quantita: number; lato: string; pnl: number }[];
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
 * Supporta: B, BUY, LONG, L → LONG
 *           S, SS, SELL, SHORT → SHORT
 * NB: BC (Buy to Cover) e S/SS sono gestiti separatamente nel parser TradeZero.
 */
function parseDirection(direction: string): 'LONG' | 'SHORT' {
  const normalized = direction.toUpperCase().trim();
  if (['LONG', 'BUY', 'L', 'B'].includes(normalized)) return 'LONG';
  if (['SHORT', 'SELL', 'S', 'SS'].includes(normalized)) return 'SHORT';
  return 'LONG';
}

/**
 * Identifica se un lato TradeZero è un'apertura o una chiusura.
 * B  → apertura LONG
 * SS → apertura SHORT
 * S  → chiusura LONG
 * BC → chiusura SHORT
 */
function tzSideInfo(side: string): { direzione: 'LONG' | 'SHORT'; isApertura: boolean } {
  const s = side.toUpperCase().trim();
  if (s === 'B')  return { direzione: 'LONG',  isApertura: true };
  if (s === 'SS') return { direzione: 'SHORT', isApertura: true };
  if (s === 'S')  return { direzione: 'LONG',  isApertura: false };
  if (s === 'BC') return { direzione: 'SHORT', isApertura: false };
  // fallback
  return { direzione: 'LONG', isApertura: true };
}


/**
 * Calcola la durata tra due ore nel formato HH:MM
 */
function calculateTradeDuration(entryTime: string, exitTime: string): string {
  try {
    const [entryHours, entryMinutes] = entryTime.split(':').map(Number);
    const [exitHours, exitMinutes] = exitTime.split(':').map(Number);

    // Converti in minuti totali
    const entryTotalMinutes = entryHours * 60 + entryMinutes;
    const exitTotalMinutes = exitHours * 60 + exitMinutes;

    // Calcola la differenza in minuti
    let diffMinutes = exitTotalMinutes - entryTotalMinutes;

    // Gestisci il caso in cui l'uscita sia il giorno successivo
    if (diffMinutes < 0) {
      diffMinutes += 24 * 60; // Aggiungi 24 ore in minuti
    }

    // Converti in ore e minuti
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  } catch (e) {
    console.error('Errore nel calcolo della durata dell\'operazione:', e);
    return '00:00';
  }
}

/**
 * Effettua il parsing di un CSV nel formato standard
 * Headers attesi: data, ticker, direzione, quantita, prezzo_entrata, prezzo_uscita, commissione, strategia, note
 */
function parseDefaultFormat(rows: string[][]): OperazioneCSV[] {
  // Normalizza gli header: minuscolo, trim, e sostituisci spazi con underscore
  const header = rows[0].map((h) =>
    h.toLowerCase().trim().replace(/\s+/g, '_').normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
  );

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
  const noteIdx = header.findIndex((h) =>
    ['note', 'notes', 'commento', 'comment'].includes(h),
  );

  // Log per debug: mostra gli header trovati
  console.log('CSV Parser - Header normalizzati:', header);
  console.log('CSV Parser - Indici trovati:', { dataIdx, tickerIdx, direzioneIdx, quantitaIdx, prezzoEntrata, prezzoUscita, commissioneIdx, noteIdx });

  // Verifica che almeno ticker e prezzo_entrata siano trovati
  if (tickerIdx === -1) {
    throw new Error('Colonna Ticker non trovata. Header trovati: ' + header.join(', '));
  }
  if (prezzoEntrata === -1) {
    throw new Error('Colonna Prezzo Entrata non trovata. Header trovati: ' + header.join(', '));
  }

  const operazioni: OperazioneCSV[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;
    // Se l'indice ticker è valido ma il valore è vuoto, salta la riga
    if (tickerIdx >= 0 && !row[tickerIdx]?.trim()) continue;

    const entryPrice = parseFloat(row[prezzoEntrata]?.replace(',', '.') || '0') || 0;
    const rawExit = prezzoUscita >= 0 ? row[prezzoUscita]?.replace(',', '.').trim() : '';
    const exitPrice = rawExit && !isNaN(parseFloat(rawExit)) ? parseFloat(rawExit) : null;
    const quantity = parseFloat(row[quantitaIdx]?.replace(',', '.') || '0') || 0;
    const commission = parseFloat(row[commissioneIdx]?.replace(',', '.') || '0') || 0;

    // Calcola PnL solo se abbiamo un prezzo di uscita valido (posizione chiusa)
    let pnl: number | null = null;
    let pnlPercentuale: number | null = null;
    const dir = parseDirection(row[direzioneIdx] || 'LONG');
    const isClosed = exitPrice !== null && exitPrice > 0;

    if (isClosed) {
      // LONG:  (uscita - entrata) × qty
      // SHORT: (entrata - uscita) × qty
      const pnlLordo = dir === 'LONG'
        ? (exitPrice! - entryPrice) * quantity
        : (entryPrice - exitPrice!) * quantity;
      pnl = pnlLordo - commission;
      const capitaleImpiegato = entryPrice * quantity;
      pnlPercentuale = capitaleImpiegato > 0 ? (pnl / capitaleImpiegato) * 100 : 0;
    }

    operazioni.push({
      data: parseDate(row[dataIdx] || ''),
      ticker: row[tickerIdx].toUpperCase().trim(),
      direzione: dir,
      quantita: quantity,
      prezzo_entrata: entryPrice,
      prezzo_uscita: isClosed ? exitPrice : null,
      commissione: commission,
      note: row[noteIdx]?.trim() || undefined,
      pnl,
      pnl_percentuale: pnlPercentuale,
    });
  }

  return operazioni;
}

/**
 * Converte il tempo da formato 12h AM/PM a formato 24h
 */
function convertTo24HourFormat(timeString: string, ampm: string): string {
  try {
    const [hours, minutes] = timeString.split(':').map(Number);
    let hour24 = hours;

    // Converti AM/PM in formato 24 ore
    if (ampm && ampm.toUpperCase() === 'PM' && hours < 12) {
      hour24 = hours + 12;
    } else if (ampm && ampm.toUpperCase() === 'AM' && hours === 12) {
      hour24 = 0;
    }

    return `${hour24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  } catch (e) {
    console.error(`Errore nella conversione dell'ora: ${timeString} ${ampm}`, e);
    return '00:00';
  }
}

/**
 * Effettua il parsing di un CSV nel formato TradeZero con supporto completo
 * Richiede header: T/D, Side, Symbol, Qty, Price, Exec Time, Comm, Net Proceeds
 */
function parseTradeZeroFormat(rows: string[][]): OperazioneCSV[] {
  if (rows.length < 2) {
    console.warn('File TradeZero vuoto o malformato');
    return [];
  }

  // Estrai le intestazioni
  const headers = rows[0].map((h) => h.trim());
  console.log('TradeZero Headers:', headers);

  // Mappa le intestazioni ai loro indici
  const headerIndexMap: Record<string, number> = {};
  headers.forEach((header, index) => {
    headerIndexMap[header] = index;
  });

  // Verifica che le intestazioni necessarie siano presenti
  const requiredHeaders = ['T/D', 'Side', 'Symbol', 'Qty', 'Price', 'Exec Time', 'Comm', 'Net Proceeds'];
  const missingHeaders = requiredHeaders.filter((header) => !(header in headerIndexMap));

  if (missingHeaders.length > 0) {
    console.error(`Intestazioni mancanti nel file TradeZero: ${missingHeaders.join(', ')}`);
    throw new Error(`Formato TradeZero non valido. Intestazioni mancanti: ${missingHeaders.join(', ')}`);
  }

  // Raccogli tutti i trades individuali prima del consolidamento
  const allTrades: Array<{
    data: string;
    ticker: string;
    direzione: 'LONG' | 'SHORT';
    side: string; // lato originale TradeZero: B, S, SS, BC
    quantita: number;
    prezzo: number;
    ora: string;
    commissione: number;
    pnl: number;
    timestamp: number;
  }> = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    // Le righe sono già pre-parsate dalla funzione parseCSV principale
    // Non serve ri-unire e ri-parsare (causerebbe errori di conteggio colonne)
    const values = row;

    if (values.length !== headers.length) {
      // Tolleranza: se la riga ha meno valori, riempi con stringhe vuote
      if (values.length < headers.length) {
        while (values.length < headers.length) {
          values.push('');
        }
      } else {
        console.warn(
          `Riga ${i + 1} ha più valori (${values.length}) delle intestazioni (${headers.length}). Saltata.`,
        );
        continue;
      }
    }

    // Estrai i valori rilevanti
    const tradeDate = values[headerIndexMap['T/D']]?.trim() || '';
    const side = values[headerIndexMap['Side']]?.trim() || '';
    const symbol = values[headerIndexMap['Symbol']]?.trim() || '';
    const quantity = values[headerIndexMap['Qty']]?.trim() || '0';
    const price = values[headerIndexMap['Price']]?.trim() || '0';
    const execTime = values[headerIndexMap['Exec Time']]?.trim() || '';
    const commission = values[headerIndexMap['Comm']]?.trim() || '0';
    const netProceeds = values[headerIndexMap['Net Proceeds']]?.trim() || '0';

    // Normalizza la data (formato MM/DD/YYYY in TradeZero)
    let formattedDate = tradeDate;
    try {
      const dateParts = tradeDate.split('/');
      if (dateParts.length === 3) {
        const month = dateParts[0].padStart(2, '0');
        const day = dateParts[1].padStart(2, '0');
        const year = dateParts[2];
        formattedDate = `${year}-${month}-${day}`;
      }
    } catch (e) {
      console.error(`Errore nel parsing della data: ${tradeDate}`, e);
    }

    // Identifica direzione e se è apertura o chiusura
    const { direzione: direction } = tzSideInfo(side);

    // Normalizza la quantità
    const parsedQuantity = Math.abs(parseFloat(quantity.replace(/[^\d.-]/g, '')) || 0);

    // Normalizza il prezzo
    const parsedPrice = parseFloat(price.replace(/[^\d.-]/g, '')) || 0;

    // Normalizza la commissione
    const parsedCommission = Math.abs(parseFloat(commission.replace(/[^\d.-]/g, '')) || 0);

    // Estrai l'ora dall'Exec Time (formato HH:MM:SS AM/PM o MM/DD/YYYY HH:MM:SS AM/PM)
    let time = '00:00';
    let timestamp = 0;
    try {
      const timeParts = execTime.split(' ');
      let timeString = '';
      let ampm = '';

      if (timeParts[0].includes('/')) {
        // Formato con data: MM/DD/YYYY HH:MM:SS AM/PM
        timeString = timeParts[1] || '';
        ampm = timeParts[2] || '';
      } else {
        // Formato solo ora: HH:MM:SS AM/PM
        timeString = timeParts[0] || '';
        ampm = timeParts[1] || '';
      }

      // Converti in formato 24 ore se necessario
      if (timeString && timeString.includes(':')) {
        const [hours, minutes] = timeString.split(':').map((part) => Number.parseInt(part, 10));
        time = convertTo24HourFormat(`${hours}:${minutes}`, ampm);

        // Crea un timestamp per ordinare le operazioni cronologicamente
        const dateObj = new Date(`${formattedDate}T${time}:00`);
        timestamp = dateObj.getTime();
      }
    } catch (e) {
      console.error(`Errore nel parsing dell'ora: ${execTime}`, e);
    }

    // Calcolo P&L da Net Proceeds
    const pnl = parseFloat(netProceeds.replace(/[^\d.-]/g, '')) || 0;

    allTrades.push({
      data: formattedDate,
      ticker: symbol.toUpperCase(),
      direzione: direction,
      side: side, // B, S, SS, BC — necessario per distinguere apertura/chiusura
      quantita: parsedQuantity,
      prezzo: parsedPrice,
      ora: time,
      commissione: parsedCommission,
      pnl: pnl,
      timestamp: timestamp,
    });
  }

  // Raggruppa per ticker+data, poi ricostruisce SESSIONI separate
  // Una sessione = una sequenza apertura→chiusura completa
  // Se nello stesso giorno si fanno 2 operazioni su AAPL, sono 2 sessioni distinte
  const tradesByTickerAndDate: Record<string, typeof allTrades> = {};

  allTrades.forEach((trade) => {
    const key = `${trade.data}_${trade.ticker}`;
    if (!tradesByTickerAndDate[key]) tradesByTickerAndDate[key] = [];
    tradesByTickerAndDate[key].push(trade);
  });

  const operazioni: OperazioneCSV[] = [];

  Object.values(tradesByTickerAndDate).forEach((tickerTrades) => {
    // Ordina cronologicamente
    tickerTrades.sort((a, b) =>
      a.timestamp && b.timestamp
        ? a.timestamp - b.timestamp
        : a.ora.localeCompare(b.ora),
    );

    // --- Ricostruzione sessioni tramite position tracking ---
    // TradeZero emette ogni fill separatamente.
    // Tracciamo la posizione netta: positiva = LONG aperta, negativa = SHORT aperta, 0 = flat.
    // Ogni volta che la posizione ritorna a 0 → fine di una sessione.

    type Session = {
      fills: typeof allTrades;
      direzione: 'LONG' | 'SHORT';
    };

    const sessions: Session[] = [];
    let posizione = 0; // posizione netta corrente
    let sessioneFills: typeof allTrades = [];
    let sessioneDirezione: 'LONG' | 'SHORT' = 'LONG';

    for (const trade of tickerTrades) {
      const info = tzSideInfo(trade.side || '');

      if (sessioneFills.length === 0) {
        // Primo fill della sessione — determina la direzione
        sessioneDirezione = info.direzione;
      }

      // Aggiorna posizione netta
      if (info.isApertura) {
        posizione += trade.quantita;  // B o SS aumentano la posizione
      } else {
        posizione -= trade.quantita;  // S o BC riducono la posizione
      }

      sessioneFills.push(trade);

      // Posizione flat → sessione completata
      if (Math.abs(posizione) < 0.0001) {
        sessions.push({ fills: [...sessioneFills], direzione: sessioneDirezione });
        sessioneFills = [];
        posizione = 0;
      }
    }

    // Posizione ancora aperta (nessuna chiusura trovata)
    if (sessioneFills.length > 0) {
      sessions.push({ fills: sessioneFills, direzione: sessioneDirezione });
    }

    // Converti ogni sessione in OperazioneCSV
    for (const session of sessions) {
      const { fills, direzione } = session;

      const aperture = fills.filter((t) => tzSideInfo(t.side || '').isApertura);
      const chiusure = fills.filter((t) => !tzSideInfo(t.side || '').isApertura);

      // Quantità = qty delle leg di apertura (NON somma di apertura+chiusura)
      const qtyApertura = aperture.reduce((sum, t) => sum + t.quantita, 0) || fills[0].quantita;

      // Prezzo medio ponderato apertura
      const prezzoEntrata =
        aperture.length > 0
          ? aperture.reduce((sum, t) => sum + t.prezzo * t.quantita, 0) /
            aperture.reduce((sum, t) => sum + t.quantita, 0)
          : fills[0].prezzo;

      // Prezzo medio ponderato chiusura (null se aperta)
      const prezzoUscita =
        chiusure.length > 0
          ? chiusure.reduce((sum, t) => sum + t.prezzo * t.quantita, 0) /
            chiusure.reduce((sum, t) => sum + t.quantita, 0)
          : null;

      // P&L netto da Net Proceeds TradeZero (già commissioni incluse)
      const totalPnL = fills.reduce((sum, t) => sum + t.pnl, 0);
      const totalCommission = fills.reduce((sum, t) => sum + t.commissione, 0);

      const capitaleImpiegato = prezzoEntrata * qtyApertura;
      const pnlPercentuale = capitaleImpiegato > 0 ? (totalPnL / capitaleImpiegato) * 100 : 0;

      const oraEntrata = aperture.length > 0 ? aperture[0].ora : fills[0].ora;
      const oraUscita = chiusure.length > 0 ? chiusure[chiusure.length - 1].ora : null;

      operazioni.push({
        data: fills[0].data,
        ticker: fills[0].ticker,
        direzione,
        quantita: qtyApertura,
        prezzo_entrata: prezzoEntrata,
        prezzo_uscita: prezzoUscita,
        commissione: totalCommission,
        pnl: prezzoUscita !== null ? totalPnL : null,
        pnl_percentuale: prezzoUscita !== null ? pnlPercentuale : null,
        ora_entrata: oraEntrata,
        ora_uscita: oraUscita ?? undefined,
        durata: oraUscita ? calculateTradeDuration(oraEntrata, oraUscita) : '00:00',
        timestamp: fills[0].timestamp,
        esecuzioni: fills.map((t) => ({
          ora: t.ora,
          prezzo: t.prezzo,
          quantita: t.quantita,
          lato: tzSideInfo(t.side || '').isApertura ? 'apertura' : 'chiusura',
          pnl: t.pnl,
        })),
      });
    }
  });

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
      data: parseDate(row[tradeIdTimeIdx] || ''),
      ticker: row[symbolIdx].toUpperCase().trim(),
      direzione: quantity > 0 ? 'LONG' : 'SHORT',
      quantita: quantity,
      prezzo_entrata: price,
      prezzo_uscita: null,
      commissione: commission,
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
      data: parseDate(row[dataIdx] || ''),
      ticker: row[simboloIdx].toUpperCase().trim(),
      direzione: parseDirection(row[operazioneIdx] || 'LONG'),
      quantita: parseFloat(row[quantitaIdx]?.replace(',', '.') || '0'),
      prezzo_entrata: parseFloat(row[prezzoIdx]?.replace(',', '.') || '0'),
      prezzo_uscita: null,
      commissione: parseFloat(
        row[commissioneIdx]?.replace(',', '.') || '0',
      ),
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

  // Auto-detecta il separatore (virgola o punto e virgola)
  const firstLine = cleanContent.split('\n')[0] || '';
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const separator = semicolonCount > commaCount ? ';' : ',';

  // Parser CSV con supporto per quote e separatore dinamico
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
      } else if (char === separator && !inQuotes) {
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
      op.ticker &&
      op.quantita > 0 &&
      op.prezzo_entrata > 0 &&
      op.data
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
    'Quantita',
    'Prezzo Entrata',
    'Prezzo Uscita',
    'Commissione',
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
    'Data',
    'Ticker',
    'Direzione',
    'Quantita',
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
    op.data || '',
    op.ticker || '',
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
