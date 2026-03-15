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
 * Calcola il profitto/perdita (P&L) di un'operazione
 * @param direzione - 'LONG' o 'SHORT'
 * @param prezzoEntrata - Prezzo di entrata della posizione
 * @param prezzoUscita - Prezzo di uscita della posizione
 * @param quantita - Quantità di unità scambiate
 * @param commissione - Commissione totale in EUR (opzionale)
 * @returns Oggetto con pnl, pnlPercentuale, pnlLordo, commissione
 */
export function calcolaPnl(
  direzione: 'LONG' | 'SHORT',
  prezzoEntrata: number,
  prezzoUscita: number,
  quantita: number,
  commissione: number = 0,
) {
  let pnlLordo: number;

  if (direzione === 'LONG') {
    pnlLordo = (prezzoUscita - prezzoEntrata) * quantita;
  } else {
    // SHORT: profitto quando il prezzo scende
    pnlLordo = (prezzoEntrata - prezzoUscita) * quantita;
  }

  const pnlNetto = pnlLordo - commissione;
  const pnlPercentuale = (pnlNetto / (prezzoEntrata * quantita)) * 100;

  return {
    pnl: pnlNetto,
    pnlPercentuale,
    pnlLordo,
    commissione,
  };
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
