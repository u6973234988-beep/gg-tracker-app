import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combina le classi Tailwind usando clsx e twMerge
 * Utile per merge di classi Tailwind evitando conflitti
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formatta un numero come valuta EUR con locale italiano
 * @param numero - Il numero da formattare
 * @returns Stringa formattata (es. "1.234,56 €")
 */
export function formatValuta(numero: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numero);
}

/**
 * Formatta un numero come percentuale con 2 decimali
 * @param numero - Il numero da formattare (es. 0.1234 per 12.34%)
 * @returns Stringa formattata (es. "12,34%")
 */
export function formatPercentuale(numero: number): string {
  const percentuale = numero * 100;
  return new Intl.NumberFormat('it-IT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(percentuale) + '%';
}

/**
 * Formatta una data nel formato italiano dd/MM/yyyy
 * @param data - La data da formattare
 * @returns Stringa formattata (es. "15/03/2026")
 */
export function formatData(data: Date | string): string {
  const d = typeof data === 'string' ? new Date(data) : data;
  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

/**
 * Formatta una data nel formato breve italiano "15 Mar"
 * @param data - La data da formattare
 * @returns Stringa formattata (es. "15 Mar")
 */
export function formatDataBreve(data: Date | string): string {
  const d = typeof data === 'string' ? new Date(data) : data;
  return new Intl.DateTimeFormat('it-IT', {
    day: 'numeric',
    month: 'short',
  }).format(d);
}

/**
 * Calcola il P&L completo di un'operazione (lordo, netto, %, R/R, rischio).
 *
 * LONG:  P&L lordo = (uscita - entrata) × qty
 * SHORT: P&L lordo = (entrata - uscita) × qty
 * In entrambi i casi il capitale impiegato è (entrata × qty).
 *
 * @returns { pnl, pnlLordo, pnlPercentuale, commissione, rischio, rischioPct, rr }
 */
export function calcolaPnl(
  direzione: 'LONG' | 'SHORT',
  prezzoEntrata: number,
  prezzoUscita: number,
  quantita: number,
  commissione: number = 0,
  stopLoss?: number | null,
) {
  const capitaleImpiegato = prezzoEntrata * quantita;

  const pnlLordo =
    direzione === 'LONG'
      ? (prezzoUscita - prezzoEntrata) * quantita
      : (prezzoEntrata - prezzoUscita) * quantita;

  const pnlNetto = pnlLordo - commissione;
  const pnlPercentuale = capitaleImpiegato !== 0 ? (pnlNetto / capitaleImpiegato) * 100 : 0;

  // Rischio monetario dal stop loss (sempre positivo = quanto si perde se colpisce lo SL)
  let rischio: number | null = null;
  let rischioPct: number | null = null;
  if (stopLoss != null && stopLoss > 0) {
    rischio =
      direzione === 'LONG'
        ? (prezzoEntrata - stopLoss) * quantita
        : (stopLoss - prezzoEntrata) * quantita;
    rischioPct = capitaleImpiegato !== 0 ? (Math.abs(rischio) / capitaleImpiegato) * 100 : 0;
  }

  // Risk/Reward: quante "unità di rischio" vale il guadagno
  let rr: number | null = null;
  if (rischio != null && Math.abs(rischio) > 0) {
    rr = pnlLordo / Math.abs(rischio);
  }

  return {
    pnl: pnlNetto,
    pnlLordo,
    pnlPercentuale,
    commissione,
    rischio,
    rischioPct,
    rr,
  };
}

/**
 * Alias mantenuto per compatibilità: calcola P&L senza SL/RR.
 */
export function calcolaPnlSemplice(
  direzione: 'LONG' | 'SHORT',
  prezzoEntrata: number,
  prezzoUscita: number,
  quantita: number,
  commissione: number = 0,
) {
  return calcolaPnl(direzione, prezzoEntrata, prezzoUscita, quantita, commissione);
}

/**
 * Determina lo stato dell'operazione in base alla presenza del prezzo di uscita.
 */
export function calcolaStatoOperazione(
  prezzoUscita: number | null | undefined,
): 'aperta' | 'chiusa' {
  return prezzoUscita != null && prezzoUscita > 0 ? 'chiusa' : 'aperta';
}

/**
 * Calcola la durata in minuti tra ora_entrata e ora_uscita (formato HH:MM o HH:MM:SS).
 */
export function calcolaDurataMinuti(
  oraEntrata: string | null | undefined,
  oraUscita: string | null | undefined,
): number | null {
  if (!oraEntrata || !oraUscita) return null;
  try {
    const toMin = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    const diff = toMin(oraUscita) - toMin(oraEntrata);
    return diff >= 0 ? diff : diff + 24 * 60; // overnight
  } catch {
    return null;
  }
}

/**
 * Formatta il P&L con segno e valuta EUR.
 */
export function formatPnl(pnl: number): string {
  const sign = pnl >= 0 ? '+' : '';
  return `${sign}${new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(pnl)}`;
}

/**
 * Tronca un testo a una lunghezza massima con ellissi
 * @param testo - Il testo da troncare
 * @param lunghezza - Lunghezza massima
 * @returns Testo troncato
 */
export function truncateText(testo: string, lunghezza: number): string {
  if (testo.length <= lunghezza) return testo;
  return testo.slice(0, lunghezza) + '...';
}

/**
 * Verifica se una stringa è un UUID valido
 * @param uuid - La stringa da verificare
 * @returns true se è un UUID valido
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Calcola la differenza in giorni tra due date
 * @param data1 - Prima data
 * @param data2 - Seconda data
 * @returns Numero di giorni (positivo se data2 > data1)
 */
export function differenteGiorni(data1: Date, data2: Date): number {
  const diffMsec = data2.getTime() - data1.getTime();
  return Math.floor(diffMsec / (1000 * 60 * 60 * 24));
}

/**
 * Controlla se due date sono lo stesso giorno
 * @param data1 - Prima data
 * @param data2 - Seconda data
 * @returns true se le date sono lo stesso giorno
 */
export function stessoGiorno(data1: Date, data2: Date): boolean {
  return (
    data1.getFullYear() === data2.getFullYear() &&
    data1.getMonth() === data2.getMonth() &&
    data1.getDate() === data2.getDate()
  );
}

/**
 * Formatta un numero di ore, minuti e secondi
 * @param secondi - Numero di secondi
 * @returns Stringa formattata (es. "1h 23m 45s")
 */
export function formatDurata(secondi: number): string {
  const ore = Math.floor(secondi / 3600);
  const minuti = Math.floor((secondi % 3600) / 60);
  const sec = Math.floor(secondi % 60);

  const parti = [];
  if (ore > 0) parti.push(`${ore}h`);
  if (minuti > 0) parti.push(`${minuti}m`);
  if (sec > 0 || parti.length === 0) parti.push(`${sec}s`);

  return parti.join(' ');
}

/**
 * Genera un colore basato su un valore numerico (rosso = negativo, verde = positivo)
 * @param valore - Il valore numerico
 * @returns Classe Tailwind del colore
 */
export function colorPnl(valore: number): string {
  if (valore > 0) return 'text-success';
  if (valore < 0) return 'text-danger';
  return 'text-text-secondary';
}

/**
 * Genera una classe Tailwind per il background basato su un valore
 * @param valore - Il valore numerico
 * @returns Classe Tailwind del background
 */
export function bgColorPnl(valore: number): string {
  if (valore > 0) return 'bg-success/10';
  if (valore < 0) return 'bg-danger/10';
  return 'bg-background-hover';
}
