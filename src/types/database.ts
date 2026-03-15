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
      profilo: {
        Row: {
          id: string;
          email: string;
          nome_completo: string;
          nome_trading: string | null;
          avatar_url: string | null;
          bio: string | null;
          broker: string | null;
          account_size: number | null;
          valuta_base: string;
          timezone: string;
          theme: 'light' | 'dark';
          notifiche_email: boolean;
          notifiche_push: boolean;
          lingua: string;
          data_iscrizione: string;
          ultimo_accesso: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          nome_completo: string;
          nome_trading?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          broker?: string | null;
          account_size?: number | null;
          valuta_base?: string;
          timezone?: string;
          theme?: 'light' | 'dark';
          notifiche_email?: boolean;
          notifiche_push?: boolean;
          lingua?: string;
          data_iscrizione?: string;
          ultimo_accesso?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          nome_completo?: string;
          nome_trading?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          broker?: string | null;
          account_size?: number | null;
          valuta_base?: string;
          timezone?: string;
          theme?: 'light' | 'dark';
          notifiche_email?: boolean;
          notifiche_push?: boolean;
          lingua?: string;
          data_iscrizione?: string;
          ultimo_accesso?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      strategia: {
        Row: {
          id: string;
          profilo_id: string;
          nome: string;
          descrizione: string | null;
          tipo: string;
          asset_class: string;
          timeframe: string | null;
          regole_entry: string | null;
          regole_exit: string | null;
          risk_per_trade: number | null;
          reward_risk_ratio: number | null;
          win_rate_target: number | null;
          is_active: boolean;
          colore: string | null;
          icon: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profilo_id: string;
          nome: string;
          descrizione?: string | null;
          tipo: string;
          asset_class: string;
          timeframe?: string | null;
          regole_entry?: string | null;
          regole_exit?: string | null;
          risk_per_trade?: number | null;
          reward_risk_ratio?: number | null;
          win_rate_target?: number | null;
          is_active?: boolean;
          colore?: string | null;
          icon?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          profilo_id?: string;
          nome?: string;
          descrizione?: string | null;
          tipo?: string;
          asset_class?: string;
          timeframe?: string | null;
          regole_entry?: string | null;
          regole_exit?: string | null;
          risk_per_trade?: number | null;
          reward_risk_ratio?: number | null;
          win_rate_target?: number | null;
          is_active?: boolean;
          colore?: string | null;
          icon?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      regola_strategia: {
        Row: {
          id: string;
          strategia_id: string;
          nome: string;
          descrizione: string | null;
          tipo: 'ENTRY' | 'EXIT' | 'STOP';
          valore: Json;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          strategia_id: string;
          nome: string;
          descrizione?: string | null;
          tipo: 'ENTRY' | 'EXIT' | 'STOP';
          valore?: Json;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          strategia_id?: string;
          nome?: string;
          descrizione?: string | null;
          tipo?: 'ENTRY' | 'EXIT' | 'STOP';
          valore?: Json;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      categoria_tag: {
        Row: {
          id: string;
          profilo_id: string;
          nome: string;
          colore: string;
          ordine: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profilo_id: string;
          nome: string;
          colore: string;
          ordine?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          profilo_id?: string;
          nome?: string;
          colore?: string;
          ordine?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      tag: {
        Row: {
          id: string;
          categoria_tag_id: string;
          nome: string;
          icona: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          categoria_tag_id: string;
          nome: string;
          icona?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          categoria_tag_id?: string;
          nome?: string;
          icona?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      operazione: {
        Row: {
          id: string;
          profilo_id: string;
          strategia_id: string | null;
          simbolo: string;
          direzione: 'LONG' | 'SHORT';
          tipo_ordine: 'MARKET' | 'LIMIT' | 'STOP';
          prezzo_entrata: number;
          quantita: number;
          prezzo_uscita: number | null;
          quantita_uscita: number | null;
          pnl: number | null;
          pnl_percentuale: number | null;
          commissione: number;
          note: string | null;
          stato: 'APERTA' | 'CHIUSA' | 'ANNULLATA';
          data_apertura: string;
          data_chiusura: string | null;
          duration_minuti: number | null;
          setup_conforme: boolean | null;
          conformita_regole_id: string | null;
          quality_score: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profilo_id: string;
          strategia_id?: string | null;
          simbolo: string;
          direzione: 'LONG' | 'SHORT';
          tipo_ordine: 'MARKET' | 'LIMIT' | 'STOP';
          prezzo_entrata: number;
          quantita: number;
          prezzo_uscita?: number | null;
          quantita_uscita?: number | null;
          pnl?: number | null;
          pnl_percentuale?: number | null;
          commissione?: number;
          note?: string | null;
          stato?: 'APERTA' | 'CHIUSA' | 'ANNULLATA';
          data_apertura: string;
          data_chiusura?: string | null;
          duration_minuti?: number | null;
          setup_conforme?: boolean | null;
          conformita_regole_id?: string | null;
          quality_score?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          profilo_id?: string;
          strategia_id?: string | null;
          simbolo?: string;
          direzione?: 'LONG' | 'SHORT';
          tipo_ordine?: 'MARKET' | 'LIMIT' | 'STOP';
          prezzo_entrata?: number;
          quantita?: number;
          prezzo_uscita?: number | null;
          quantita_uscita?: number | null;
          pnl?: number | null;
          pnl_percentuale?: number | null;
          commissione?: number;
          note?: string | null;
          stato?: 'APERTA' | 'CHIUSA' | 'ANNULLATA';
          data_apertura?: string;
          data_chiusura?: string | null;
          duration_minuti?: number | null;
          setup_conforme?: boolean | null;
          conformita_regole_id?: string | null;
          quality_score?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      operazione_tag: {
        Row: {
          operazione_id: string;
          tag_id: string;
          created_at: string;
        };
        Insert: {
          operazione_id: string;
          tag_id: string;
          created_at?: string;
        };
        Update: {
          operazione_id?: string;
          tag_id?: string;
          created_at?: string;
        };
      };
      esecuzione: {
        Row: {
          id: string;
          operazione_id: string;
          tipo: 'ENTRY' | 'EXIT' | 'PARTIAL_EXIT' | 'STOP';
          prezzo: number;
          quantita: number;
          timestamp: string;
          commento: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          operazione_id: string;
          tipo: 'ENTRY' | 'EXIT' | 'PARTIAL_EXIT' | 'STOP';
          prezzo: number;
          quantita: number;
          timestamp: string;
          commento?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          operazione_id?: string;
          tipo?: 'ENTRY' | 'EXIT' | 'PARTIAL_EXIT' | 'STOP';
          prezzo?: number;
          quantita?: number;
          timestamp?: string;
          commento?: string | null;
          created_at?: string;
        };
      };
      conformita_regole: {
        Row: {
          id: string;
          operazione_id: string;
          strategia_id: string;
          regole_rispettate: string[];
          regole_violate: string[];
          score_conformita: number;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          operazione_id: string;
          strategia_id: string;
          regole_rispettate?: string[];
          regole_violate?: string[];
          score_conformita?: number;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          operazione_id?: string;
          strategia_id?: string;
          regole_rispettate?: string[];
          regole_violate?: string[];
          score_conformita?: number;
          note?: string | null;
          created_at?: string;
        };
      };
      obiettivo: {
        Row: {
          id: string;
          profilo_id: string;
          nome: string;
          tipo: 'PROFITTO' | 'WIN_RATE' | 'TRADE_COUNT' | 'CUSTOM';
          valore_target: number;
          valore_attuale: number;
          periodo: 'GIORNALIERO' | 'SETTIMANALE' | 'MENSILE' | 'TRIMESTRALE';
          data_inizio: string;
          data_fine: string | null;
          is_completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profilo_id: string;
          nome: string;
          tipo: 'PROFITTO' | 'WIN_RATE' | 'TRADE_COUNT' | 'CUSTOM';
          valore_target: number;
          valore_attuale?: number;
          periodo: 'GIORNALIERO' | 'SETTIMANALE' | 'MENSILE' | 'TRIMESTRALE';
          data_inizio: string;
          data_fine?: string | null;
          is_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          profilo_id?: string;
          nome?: string;
          tipo?: 'PROFITTO' | 'WIN_RATE' | 'TRADE_COUNT' | 'CUSTOM';
          valore_target?: number;
          valore_attuale?: number;
          periodo?: 'GIORNALIERO' | 'SETTIMANALE' | 'MENSILE' | 'TRIMESTRALE';
          data_inizio?: string;
          data_fine?: string | null;
          is_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      routine: {
        Row: {
          id: string;
          profilo_id: string;
          nome: string;
          descrizione: string | null;
          tipo: 'PRE_MARKET' | 'POST_MARKET' | 'DURANTE_MARKET' | 'CUSTOM';
          frequenza: 'GIORNALIERA' | 'SETTIMANALE' | 'MENSILE';
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profilo_id: string;
          nome: string;
          descrizione?: string | null;
          tipo: 'PRE_MARKET' | 'POST_MARKET' | 'DURANTE_MARKET' | 'CUSTOM';
          frequenza: 'GIORNALIERA' | 'SETTIMANALE' | 'MENSILE';
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          profilo_id?: string;
          nome?: string;
          descrizione?: string | null;
          tipo?: 'PRE_MARKET' | 'POST_MARKET' | 'DURANTE_MARKET' | 'CUSTOM';
          frequenza?: 'GIORNALIERA' | 'SETTIMANALE' | 'MENSILE';
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      routine_step: {
        Row: {
          id: string;
          routine_id: string;
          ordine: number;
          nome: string;
          descrizione: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          routine_id: string;
          ordine: number;
          nome: string;
          descrizione?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          routine_id?: string;
          ordine?: number;
          nome?: string;
          descrizione?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      routine_completamento: {
        Row: {
          id: string;
          routine_id: string;
          routine_step_id: string;
          data_completamento: string;
          is_completed: boolean;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          routine_id: string;
          routine_step_id: string;
          data_completamento: string;
          is_completed?: boolean;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          routine_id?: string;
          routine_step_id?: string;
          data_completamento?: string;
          is_completed?: boolean;
          note?: string | null;
          created_at?: string;
        };
      };
    };
    Views: {
      vista_metriche_utente: {
        Row: {
          profilo_id: string;
          total_trades: number | null;
          winning_trades: number | null;
          losing_trades: number | null;
          win_rate: number | null;
          gross_pnl: number | null;
          net_pnl: number | null;
          avg_win: number | null;
          avg_loss: number | null;
          profit_factor: number | null;
          largest_win: number | null;
          largest_loss: number | null;
          consecutive_wins: number | null;
          consecutive_losses: number | null;
          avg_trade_duration_minuti: number | null;
        };
      };
      vista_performance_strategia: {
        Row: {
          strategia_id: string;
          strategia_nome: string;
          total_trades: number | null;
          winning_trades: number | null;
          win_rate: number | null;
          gross_pnl: number | null;
          net_pnl: number | null;
          avg_win: number | null;
          avg_loss: number | null;
          profit_factor: number | null;
          largest_win: number | null;
          largest_loss: number | null;
        };
      };
      vista_equity_giornaliera: {
        Row: {
          profilo_id: string;
          data: string;
          pnl_giornaliero: number | null;
          equity_cumulative: number | null;
          trades_count: number | null;
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
