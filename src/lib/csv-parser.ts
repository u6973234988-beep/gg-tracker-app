/**
 * CSV Parser per GG Tracker
 * Supporta importazione da diversi broker e formati CSV
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

    // Calcola PnL se abbiamo prezzo di uscita
    let pnl: number | null = null;
    let pnlPercentuale: number | null = null;
    const dir = parseDirection(row[direzioneIdx] || 'LONG');
    if (exitPrice !== null && !isNaN(exitPrice) && exitPrice > 0) {
      const pnlLordo = dir === 'LONG'
        ? (exitPrice - entryPrice) * quantity
        : (entryPrice - exitPrice) * quantity;
      pnl = pnlLordo - commission;
      pnlPercentuale = entryPrice > 0 ? (pnl / (entryPrice * quantity)) * 100 : 0;
    }

    operazioni.push({
      data: parseDate(row[dataIdx] || ''),
      ticker: row[tickerIdx].toUpperCase().trim(),
      direzione: dir,
      quantita: quantity,
      prezzo_entrata: entryPrice,
      prezzo_uscita: exitPrice,
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
 * Effettua il parsing di un CSV nel formato TradeZero con supporto completo.
 *
 * Algoritmo: Position Tracking
 * - Processa le esecuzioni cronologicamente per ticker/data
 * - Traccia la posizione aperta (SS/B aprono, BC/S chiudono)
 * - Quando la posizione torna a 0, emette un trade completato
 * - Gestisce: multi-leg, scale-in, partial close, re-entry, round trip multipli
 * - Supporta sia SHORT (SS/BC) che LONG (B/S)
 *
 * Side codes TradeZero:
 *   SS = Short Sell (apri short)    → posizione scende (negativa)
 *   BC = Buy to Cover (chiudi short) → posizione sale verso 0
 *   B  = Buy (apri long)            → posizione sale (positiva)
 *   S  = Sell (chiudi long)         → posizione scende verso 0
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

  // Indici opzionali per fee aggiuntive (per calcolo commissione totale reale)
  const secIdx = headerIndexMap['SEC'] ?? -1;
  const tafIdx = headerIndexMap['TAF'] ?? -1;
  const nsccIdx = headerIndexMap['NSCC'] ?? -1;
  const nasdaqIdx = headerIndexMap['Nasdaq'] ?? -1;
  const ecnRemoveIdx = headerIndexMap['ECN Remove'] ?? -1;
  const ecnAddIdx = headerIndexMap['ECN Add'] ?? -1;

  if (missingHeaders.length > 0) {
    console.error(`Intestazioni mancanti nel file TradeZero: ${missingHeaders.join(', ')}`);
    throw new Error(`Formato TradeZero non valido. Intestazioni mancanti: ${missingHeaders.join(', ')}`);
  }

  // Tipo per singola esecuzione grezza
  interface RawExecution {
    data: string;
    ticker: string;
    side: string; // SS, BC, B, S
    quantita: number;
    prezzo: number;
    ora: string;
    commissione: number;
    netProceeds: number;
    timestamp: number;
  }

  // Step 1: Parsa tutte le righe in esecuzioni grezze
  const allExecutions: RawExecution[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const values = row;

    if (values.length !== headers.length) {
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

    const tradeDate = values[headerIndexMap['T/D']]?.trim() || '';
    const side = values[headerIndexMap['Side']]?.trim().toUpperCase() || '';
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

    const parsedQuantity = Math.abs(parseFloat(quantity.replace(/[^\d.-]/g, '')) || 0);
    const parsedPrice = parseFloat(price.replace(/[^\d.-]/g, '')) || 0;
    // Calcola commissione totale reale: Comm + SEC + TAF + NSCC + Nasdaq + |ECN Remove| + |ECN Add|
    const parsedComm = Math.abs(parseFloat(commission.replace(/[^\d.-]/g, '')) || 0);
    const parsedSEC = secIdx >= 0 ? Math.abs(parseFloat(values[secIdx]?.replace(/[^\d.-]/g, '') || '0') || 0) : 0;
    const parsedTAF = tafIdx >= 0 ? Math.abs(parseFloat(values[tafIdx]?.replace(/[^\d.-]/g, '') || '0') || 0) : 0;
    const parsedNSCC = nsccIdx >= 0 ? Math.abs(parseFloat(values[nsccIdx]?.replace(/[^\d.-]/g, '') || '0') || 0) : 0;
    const parsedNasdaq = nasdaqIdx >= 0 ? Math.abs(parseFloat(values[nasdaqIdx]?.replace(/[^\d.-]/g, '') || '0') || 0) : 0;
    const parsedECNRemove = ecnRemoveIdx >= 0 ? Math.abs(parseFloat(values[ecnRemoveIdx]?.replace(/[^\d.-]/g, '') || '0') || 0) : 0;
    const parsedECNAdd = ecnAddIdx >= 0 ? Math.abs(parseFloat(values[ecnAddIdx]?.replace(/[^\d.-]/g, '') || '0') || 0) : 0;
    const parsedCommission = parsedComm + parsedSEC + parsedTAF + parsedNSCC + parsedNasdaq + parsedECNRemove + parsedECNAdd;
    const parsedNetProceeds = parseFloat(netProceeds.replace(/[^\d.-]/g, '')) || 0;

    // Estrai l'ora dall'Exec Time
    let time = '00:00';
    let timestamp = 0;
    try {
      const timeParts = execTime.split(' ');
      let timeString = '';
      let ampm = '';

      if (timeParts[0].includes('/')) {
        timeString = timeParts[1] || '';
        ampm = timeParts[2] || '';
      } else {
        timeString = timeParts[0] || '';
        ampm = timeParts[1] || '';
      }

      if (timeString && timeString.includes(':')) {
        const [hours, minutes] = timeString.split(':').map((part) => Number.parseInt(part, 10));
        time = convertTo24HourFormat(`${hours}:${minutes}`, ampm);
        const dateObj = new Date(`${formattedDate}T${time}:00`);
        timestamp = dateObj.getTime();
      }
    } catch (e) {
      console.error(`Errore nel parsing dell'ora: ${execTime}`, e);
    }

    allExecutions.push({
      data: formattedDate,
      ticker: symbol.toUpperCase(),
      side: side,
      quantita: parsedQuantity,
      prezzo: parsedPrice,
      ora: time,
      commissione: parsedCommission,
      netProceeds: parsedNetProceeds,
      timestamp: timestamp,
    });
  }

  // Step 2: Raggruppa per ticker + data
  const execsByTickerDate: Record<string, RawExecution[]> = {};
  allExecutions.forEach((exec) => {
    const key = `${exec.data}_${exec.ticker}`;
    if (!execsByTickerDate[key]) {
      execsByTickerDate[key] = [];
    }
    execsByTickerDate[key].push(exec);
  });

  // Step 3: Position tracking per ogni gruppo ticker/data
  const operazioni: OperazioneCSV[] = [];

  Object.values(execsByTickerDate).forEach((executions) => {
    // Ordina cronologicamente
    executions.sort((a, b) => {
      if (a.timestamp && b.timestamp) return a.timestamp - b.timestamp;
      return a.ora.localeCompare(b.ora);
    });

    // Traccia posizione: positiva = long, negativa = short, 0 = flat
    let position = 0;
    let tradeDirection: 'LONG' | 'SHORT' = 'SHORT';
    let openingLegs: RawExecution[] = [];
    let closingLegs: RawExecution[] = [];
    let allLegs: RawExecution[] = [];
    let totalCommission = 0;
    let totalNetProceeds = 0;

    const emitTrade = () => {
      if (openingLegs.length === 0) return;

      // Calcola quantità posizione (solo dalle aperture)
      const positionSize = openingLegs.reduce((sum, leg) => sum + leg.quantita, 0);

      // Calcola prezzo medio entrata (media ponderata delle aperture)
      const totalOpenCost = openingLegs.reduce((sum, leg) => sum + (leg.prezzo * leg.quantita), 0);
      const avgEntryPrice = positionSize > 0 ? totalOpenCost / positionSize : 0;

      // Calcola prezzo medio uscita (media ponderata delle chiusure)
      const totalClosedQty = closingLegs.reduce((sum, leg) => sum + leg.quantita, 0);
      const totalCloseCost = closingLegs.reduce((sum, leg) => sum + (leg.prezzo * leg.quantita), 0);
      const avgExitPrice = totalClosedQty > 0 ? totalCloseCost / totalClosedQty : null;

      // PnL dal Net Proceeds (già calcolato dal broker, più affidabile)
      const pnlFromBroker = totalNetProceeds;

      // PnL percentuale basata sul capitale impiegato
      const capitalUsed = avgEntryPrice * positionSize;
      const pnlPercentuale = capitalUsed > 0 ? (pnlFromBroker / capitalUsed) * 100 : 0;

      const firstLeg = allLegs[0];
      const lastLeg = allLegs[allLegs.length - 1];

      const op: OperazioneCSV = {
        data: firstLeg.data,
        ticker: firstLeg.ticker,
        direzione: tradeDirection,
        quantita: positionSize,
        prezzo_entrata: Math.round(avgEntryPrice * 1000000) / 1000000,
        prezzo_uscita: avgExitPrice !== null ? Math.round(avgExitPrice * 1000000) / 1000000 : null,
        commissione: Math.round(totalCommission * 100) / 100,
        pnl: Math.round(pnlFromBroker * 100) / 100,
        pnl_percentuale: Math.round(pnlPercentuale * 100) / 100,
        ora_entrata: firstLeg.ora,
        ora_uscita: lastLeg.ora,
        durata: calculateTradeDuration(firstLeg.ora, lastLeg.ora),
        timestamp: firstLeg.timestamp,
        esecuzioni: allLegs.map((leg) => ({
          ora: leg.ora,
          prezzo: leg.prezzo,
          quantita: leg.quantita,
          lato: leg.side,
          pnl: leg.netProceeds,
        })),
      };

      operazioni.push(op);
    };

    const resetState = () => {
      position = 0;
      openingLegs = [];
      closingLegs = [];
      allLegs = [];
      totalCommission = 0;
      totalNetProceeds = 0;
    };

    for (const exec of executions) {
      const side = exec.side;

      // Determina se questa esecuzione apre o chiude posizione
      // SS = apri short (posizione scende), BC = chiudi short (posizione sale)
      // B = apri long (posizione sale), S = chiudi long (posizione scende)
      let isOpening: boolean;
      let qtyDelta: number;

      if (side === 'SS') {
        // Short Sell: apre o incrementa short
        qtyDelta = -exec.quantita;
        isOpening = position <= 0; // Apre se flat o già short
      } else if (side === 'BC') {
        // Buy to Cover: chiude short
        qtyDelta = +exec.quantita;
        isOpening = false;
      } else if (side === 'B') {
        // Buy: apre o incrementa long
        qtyDelta = +exec.quantita;
        isOpening = position >= 0; // Apre se flat o già long
      } else if (side === 'S') {
        // Sell: chiude long
        qtyDelta = -exec.quantita;
        isOpening = false;
      } else {
        console.warn(`Side sconosciuto: ${side}, riga saltata`);
        continue;
      }

      // Se è la prima esecuzione del gruppo, determina la direzione
      if (position === 0 && allLegs.length === 0) {
        if (side === 'SS' || side === 'BC') {
          tradeDirection = 'SHORT';
        } else {
          tradeDirection = 'LONG';
        }
      }

      // Se la posizione era flat e ora stiamo aprendo una nuova direzione diversa
      // (es: dopo aver chiuso uno short, apriamo un long sullo stesso ticker/giorno)
      if (position === 0 && allLegs.length > 0) {
        // Abbiamo già un trade completato, emettiamolo
        emitTrade();
        resetState();

        // Ri-determina la direzione per il nuovo trade
        if (side === 'SS') {
          tradeDirection = 'SHORT';
        } else if (side === 'B') {
          tradeDirection = 'LONG';
        } else if (side === 'BC') {
          // BC senza posizione aperta — improbabile ma gestiamolo
          tradeDirection = 'SHORT';
        } else {
          tradeDirection = 'LONG';
        }
      }

      // Aggiungi alla lista appropriata
      allLegs.push(exec);
      totalCommission += exec.commissione;
      totalNetProceeds += exec.netProceeds;

      if (isOpening) {
        openingLegs.push(exec);
      } else {
        closingLegs.push(exec);
      }

      // Aggiorna posizione
      position += qtyDelta;

      // Se la posizione è tornata a 0, il trade è completato
      if (position === 0 && allLegs.length > 0) {
        emitTrade();
        resetState();
      }
    }

    // Se rimane una posizione aperta alla fine del giorno
    if (allLegs.length > 0 && position !== 0) {
      // Emetti come trade aperto (senza prezzo uscita se non c'è chiusura)
      if (closingLegs.length === 0) {
        // Posizione completamente aperta
        const positionSize = openingLegs.reduce((sum, leg) => sum + leg.quantita, 0);
        const totalOpenCost = openingLegs.reduce((sum, leg) => sum + (leg.prezzo * leg.quantita), 0);
        const avgEntryPrice = positionSize > 0 ? totalOpenCost / positionSize : 0;

        const firstLeg = allLegs[0];

        const op: OperazioneCSV = {
          data: firstLeg.data,
          ticker: firstLeg.ticker,
          direzione: tradeDirection,
          quantita: positionSize,
          prezzo_entrata: Math.round(avgEntryPrice * 1000000) / 1000000,
          prezzo_uscita: null,
          commissione: Math.round(totalCommission * 100) / 100,
          pnl: Math.round(totalNetProceeds * 100) / 100,
          pnl_percentuale: 0,
          ora_entrata: firstLeg.ora,
          ora_uscita: firstLeg.ora,
          durata: '00:00',
          timestamp: firstLeg.timestamp,
          esecuzioni: allLegs.map((leg) => ({
            ora: leg.ora,
            prezzo: leg.prezzo,
            quantita: leg.quantita,
            lato: leg.side,
            pnl: leg.netProceeds,
          })),
        };

        operazioni.push(op);
      } else {
        // Posizione parzialmente chiusa — emetti comunque come trade
        emitTrade();
      }
      resetState();
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
