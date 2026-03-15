import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

export function createClient() {
  // Utilizza le variabili d'ambiente o fallback ai valori hardcoded per sviluppo
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    'https://rtjhmcuihwfqxbnefqur.supabase.co';

  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0amhtY3VpaHdmcXhibmVmcXVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1OTk5ODIsImV4cCI6MjA4OTE3NTk4Mn0.jvAX-enuCoXArFaySz4QYLlyuG7_BTfe8w2u1pWmKos';

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}
