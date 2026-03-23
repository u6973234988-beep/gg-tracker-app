export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profili: {
        Row: {
          id: string;
          email: string;
          nome_visualizzato: string | null;
          avatar_url: string | null;
          capitale_iniziale: number;
          commissione_default: number;
          valuta: string;
          auto_tagging: boolean;
          suggerimenti_tag: boolean;
          tema: string;
          creato_il: string;
          aggiornato_il: string;
        };
        Insert: {
          id: string;
          email: string;
          nome_visualizzato?: string | null;
          avatar_url?: string | null;
          capitale_iniziale?: number;
          commissione_default?: number;
          valuta?: string;
          auto_tagging?: boolean;
          suggerimenti_tag?: boolean;
          tema?: string;
          creato_il?: string;
          aggiornato_il?: string;
        };
        Update: {
          id?: string;
          email?: string;
          nome_visualizzato?: string | null;
          avatar_url?: string | null;
          capitale_iniziale?: number;
          commissione_default?: number;
          valuta?: string;
          auto_tagging?: boolean;
          suggerimenti_tag?: boolean;
          tema?: string;
          creato_il?: string;
          aggiornato_il?: string;
        };
      };
      strategie: {
        Row: {
          id: string;
          utente_id: string;
          nome: string;
          descrizione: string | null;
          descrizione_dettagliata: string | null;
          colore: string;
          rischio_max_importo: number | null;
          rischio_max_percentuale: number | null;
          attiva: boolean;
          screenshots: Json | null;
          creato_il: string;
          aggiornato_il: string;
        };
        Insert: {
          id?: string;
          utente_id: string;
          nome: string;
          descrizione?: string | null;
          descrizione_dettagliata?: string | null;
          colore?: string;
          rischio_max_importo?: number | null;
          rischio_max_percentuale?: number | null;
          attiva?: boolean;
          screenshots?: Json | null;
          creato_il?: string;
          aggiornato_il?: string;
        };
        Update: {
          id?: string;
          utente_id?: string;
          nome?: string;
          descrizione?: string | null;
          descrizione_dettagliata?: string | null;
          colore?: string;
          rischio_max_importo?: number | null;
          rischio_max_percentuale?: number | null;
          attiva?: boolean;
          screenshots?: Json | null;
          creato_il?: string;
          aggiornato_il?: string;
        };
      };
      regole_strategia: {
        Row: {
          id: string;
          strategia_id: string;
          gruppo: string;
          descrizione: string;
          note: string | null;
          ordine: number;
          creato_il: string;
        };
        Insert: {
          id?: string;
          strategia_id: string;
          gruppo: string;
          descrizione: string;
          note?: string | null;
          ordine?: number;
          creato_il?: string;
        };
        Update: {
          id?: string;
          strategia_id?: string;
          gruppo?: string;
          descrizione?: string;
          note?: string | null;
          ordine?: number;
          creato_il?: string;
        };
      };
      categorie_tag: {
        Row: {
          id: string;
          utente_id: string;
          nome: string;
          descrizione: string | null;
          is_sistema: boolean;
          creato_il: string;
        };
        Insert: {
          id?: string;
          utente_id: string;
          nome: string;
          descrizione?: string | null;
          is_sistema?: boolean;
          creato_il?: string;
        };
        Update: {
          id?: string;
          utente_id?: string;
          nome?: string;
          descrizione?: string | null;
          is_sistema?: boolean;
          creato_il?: string;
        };
      };
      tag: {
        Row: {
          id: string;
          utente_id: string;
          categoria_id: string | null;
          nome: string;
          colore: string;
          descrizione: string | null;
          is_sistema: boolean;
          creato_il: string;
        };
        Insert: {
          id?: string;
          utente_id: string;
          categoria_id?: string | null;
          nome: string;
          colore?: string;
          descrizione?: string | null;
          is_sistema?: boolean;
          creato_il?: string;
        };
        Update: {
          id?: string;
          utente_id?: string;
          categoria_id?: string | null;
          nome?: string;
          colore?: string;
          descrizione?: string | null;
          is_sistema?: boolean;
          creato_il?: string;
        };
      };
      operazioni: {
        Row: {
          id: string;
          utente_id: string;
          data: string;
          ora: string | null;
          ora_entrata: string | null;
          ora_uscita: string | null;
          ticker: string;
          direzione: string;
          quantita: number;
          prezzo_entrata: number;
          prezzo_uscita: number | null;
          commissione: number;
          pnl: number | null;
          pnl_percentuale: number | null;
          strategia_id: string | null;
          stop_loss: number | null;
          take_profit: number | null;
          note: string | null;
          durata_minuti: number | null;
          tempo_esecuzione: string | null;
          stato: string;
          broker: string | null;
          creato_il: string;
          aggiornato_il: string;
        };
        Insert: {
          id?: string;
          utente_id: string;
          data: string;
          ora?: string | null;
          ora_entrata?: string | null;
          ora_uscita?: string | null;
          ticker: string;
          direzione: string;
          quantita: number;
          prezzo_entrata: number;
          prezzo_uscita?: number | null;
          commissione?: number;
          pnl?: number | null;
          pnl_percentuale?: number | null;
          strategia_id?: string | null;
          stop_loss?: number | null;
          take_profit?: number | null;
          note?: string | null;
          durata_minuti?: number | null;
          tempo_esecuzione?: string | null;
          stato?: string;
          broker?: string | null;
          creato_il?: string;
          aggiornato_il?: string;
        };
        Update: {
          id?: string;
          utente_id?: string;
          data?: string;
          ora?: string | null;
          ora_entrata?: string | null;
          ora_uscita?: string | null;
          ticker?: string;
          direzione?: string;
          quantita?: number;
          prezzo_entrata?: number;
          prezzo_uscita?: number | null;
          commissione?: number;
          pnl?: number | null;
          pnl_percentuale?: number | null;
          strategia_id?: string | null;
          stop_loss?: number | null;
          take_profit?: number | null;
          note?: string | null;
          durata_minuti?: number | null;
          tempo_esecuzione?: string | null;
          stato?: string;
          broker?: string | null;
          creato_il?: string;
          aggiornato_il?: string;
        };
      };
      operazioni_tag: {
        Row: {
          operazione_id: string;
          tag_id: string;
        };
        Insert: {
          operazione_id: string;
          tag_id: string;
        };
        Update: {
          operazione_id?: string;
          tag_id?: string;
        };
      };
      esecuzioni: {
        Row: {
          id: string;
          operazione_id: string;
          ora: string | null;
          prezzo: number;
          quantita: number;
          tipo: string | null;
          creato_il: string;
        };
        Insert: {
          id?: string;
          operazione_id: string;
          ora?: string | null;
          prezzo: number;
          quantita: number;
          tipo?: string | null;
          creato_il?: string;
        };
        Update: {
          id?: string;
          operazione_id?: string;
          ora?: string | null;
          prezzo?: number;
          quantita?: number;
          tipo?: string | null;
          creato_il?: string;
        };
      };
      conformita_regole: {
        Row: {
          id: string;
          operazione_id: string;
          regola_id: string;
          rispettata: boolean;
          note: string | null;
        };
        Insert: {
          id?: string;
          operazione_id: string;
          regola_id: string;
          rispettata: boolean;
          note?: string | null;
        };
        Update: {
          id?: string;
          operazione_id?: string;
          regola_id?: string;
          rispettata?: boolean;
          note?: string | null;
        };
      };
      obiettivi: {
        Row: {
          id: string;
          utente_id: string;
          titolo: string;
          descrizione: string | null;
          tipo: string;
          valore_target: number | null;
          valore_corrente: number;
          unita: string | null;
          scadenza: string | null;
          completato: boolean;
          priorita: string;
          creato_il: string;
          aggiornato_il: string;
        };
        Insert: {
          id?: string;
          utente_id: string;
          titolo: string;
          descrizione?: string | null;
          tipo: string;
          valore_target?: number | null;
          valore_corrente?: number;
          unita?: string | null;
          scadenza?: string | null;
          completato?: boolean;
          priorita?: string;
          creato_il?: string;
          aggiornato_il?: string;
        };
        Update: {
          id?: string;
          utente_id?: string;
          titolo?: string;
          descrizione?: string | null;
          tipo?: string;
          valore_target?: number | null;
          valore_corrente?: number;
          unita?: string | null;
          scadenza?: string | null;
          completato?: boolean;
          priorita?: string;
          creato_il?: string;
          aggiornato_il?: string;
        };
      };
      routine: {
        Row: {
          id: string;
          utente_id: string;
          nome: string;
          descrizione: string | null;
          tipo: string;
          attiva: boolean;
          creato_il: string;
          aggiornato_il: string;
        };
        Insert: {
          id?: string;
          utente_id: string;
          nome: string;
          descrizione?: string | null;
          tipo?: string;
          attiva?: boolean;
          creato_il?: string;
          aggiornato_il?: string;
        };
        Update: {
          id?: string;
          utente_id?: string;
          nome?: string;
          descrizione?: string | null;
          tipo?: string;
          attiva?: boolean;
          creato_il?: string;
          aggiornato_il?: string;
        };
      };
      routine_step: {
        Row: {
          id: string;
          routine_id: string;
          titolo: string;
          descrizione: string | null;
          ora_suggerita: string | null;
          durata_minuti: number | null;
          ordine: number;
        };
        Insert: {
          id?: string;
          routine_id: string;
          titolo: string;
          descrizione?: string | null;
          ora_suggerita?: string | null;
          durata_minuti?: number | null;
          ordine?: number;
        };
        Update: {
          id?: string;
          routine_id?: string;
          titolo?: string;
          descrizione?: string | null;
          ora_suggerita?: string | null;
          durata_minuti?: number | null;
          ordine?: number;
        };
      };
      routine_completamento: {
        Row: {
          id: string;
          routine_id: string;
          step_id: string;
          data: string;
          completato: boolean;
          note: string | null;
        };
        Insert: {
          id?: string;
          routine_id: string;
          step_id: string;
          data?: string;
          completato?: boolean;
          note?: string | null;
        };
        Update: {
          id?: string;
          routine_id?: string;
          step_id?: string;
          data?: string;
          completato?: boolean;
          note?: string | null;
        };
      };
    };
    Views: {
      vista_metriche_utente: {
        Row: {
          utente_id: string;
          totale_operazioni: number | null;
          operazioni_vinte: number | null;
          operazioni_perse: number | null;
          operazioni_pareggio: number | null;
          win_rate: number | null;
          pnl_totale: number | null;
          pnl_medio: number | null;
          vincita_media: number | null;
          perdita_media: number | null;
          miglior_trade: number | null;
          peggior_trade: number | null;
          profit_factor: number | null;
          giorni_trading: number | null;
          prima_operazione: string | null;
          ultima_operazione: string | null;
        };
      };
      vista_performance_strategia: {
        Row: {
          utente_id: string;
          strategia_id: string;
          nome_strategia: string;
          colore: string;
          totale_operazioni: number | null;
          win_rate: number | null;
          pnl_totale: number | null;
          pnl_medio: number | null;
          profit_factor: number | null;
        };
      };
      vista_equity_giornaliera: {
        Row: {
          utente_id: string;
          data: string;
          pnl_giorno: number | null;
          equity_cumulativa: number | null;
          operazioni_giorno: number | null;
        };
      };
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
