# GG Tracker - Guida di Utilizzo

## Utilizzo dei Supabase Client

### Browser (Client Component)

```typescript
'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';

export function OperazioniList() {
  const [operazioni, setOperazioni] = useState([]);
  const supabase = createClient();

  useEffect(() => {
    const fetchOperazioni = async () => {
      const { data, error } = await supabase
        .from('operazione')
        .select('*')
        .limit(20);
      
      if (error) console.error('Error:', error);
      else setOperazioni(data);
    };

    fetchOperazioni();
  }, []);

  return <div>{operazioni.length} operazioni</div>;
}
```

### Server (Server Component / Action)

```typescript
import { createClient } from '@/lib/supabase/server';

export async function getUserOperazioni(userId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('operazione')
    .select('*')
    .eq('profilo_id', userId);
  
  return data;
}
```

## Utilizzo delle Funzioni di Utilità

### Formattazione

```typescript
import { 
  formatValuta, 
  formatPercentuale, 
  formatData,
  formatDataBreve,
  calcolaPnl 
} from '@/lib/utils';

// Formato valuta EUR
const price = formatValuta(1234.56); // "1.234,56 €"

// Formato percentuale
const perc = formatPercentuale(0.1234); // "12,34%"

// Formato data
const data = formatData(new Date()); // "15/03/2026"
const dataBreve = formatDataBreve(new Date()); // "15 Mar"

// Calcolo P&L
const pnl = calcolaPnl('LONG', 100, 110, 10, 5);
// { pnl: 995, pnlPercentuale: 9.95, pnlLordo: 1000, commissione: 5 }
```

### Utility

```typescript
import { cn, colorPnl, bgColorPnl } from '@/lib/utils';

// Merge classi Tailwind
const buttonClass = cn(
  'px-4 py-2 rounded',
  isActive && 'bg-primary-700'
);

// Colore per P&L
const pnlClass = colorPnl(150); // 'text-success' per positivo
const bgPnlClass = bgColorPnl(-50); // 'bg-danger/10' per negativo
```

## Utilizzo delle Costanti

```typescript
import { 
  THEME_COLORS, 
  TRADING_DIRECTIONS, 
  OPERATION_STATUSES,
  ASSET_CLASSES,
  LABELS,
  VALIDATION_MESSAGES
} from '@/lib/constants';

// Usare colori
const buttonStyle = {
  backgroundColor: THEME_COLORS.primary
};

// Type-safe enums
const direzione: typeof TRADING_DIRECTIONS[keyof typeof TRADING_DIRECTIONS] = 'LONG';

// Labels localizzati
const labelDirezione = LABELS.direction.LONG; // "Long"
const labelStatus = LABELS.operationStatus.CHIUSA; // "Chiusa"

// Validazione
const errorMsg = VALIDATION_MESSAGES.required; // "Questo campo è obbligatorio"
const minMsg = VALIDATION_MESSAGES.minValue(100); // "Il valore minimo è 100"
```

## Componenti Tailwind

### Button

```html
<!-- Primario -->
<button class="btn-primary px-6 py-2">Salva</button>

<!-- Secondario -->
<button class="btn-secondary px-6 py-2">Annulla</button>

<!-- Ghost -->
<button class="btn-ghost px-4 py-2">Dettagli</button>

<!-- Danger -->
<button class="btn-danger px-6 py-2">Elimina</button>

<!-- Success -->
<button class="btn-success px-6 py-2">Conferma</button>

<!-- Disabled -->
<button class="btn-primary disabled:opacity-50" disabled>
  Caricamento...
</button>
```

### Card

```html
<!-- Card semplice -->
<div class="card">
  <h3 class="text-card-title">Titolo</h3>
  <p>Contenuto</p>
</div>

<!-- Card interattiva -->
<div class="card-hover">
  <p>Clicca per dettagli</p>
</div>
```

### Badge

```html
<span class="badge-primary">In corso</span>
<span class="badge-success">Completato</span>
<span class="badge-danger">Errore</span>
<span class="badge-warning">Attenzione</span>
```

### Input

```html
<input 
  type="text" 
  class="input-base w-full" 
  placeholder="Inserisci nome"
>

<input 
  type="number" 
  class="input-base w-full" 
  placeholder="Inserisci importo"
>

<textarea 
  class="input-base w-full" 
  placeholder="Note"
  rows="4"
></textarea>
```

## Esempio: Creare una Pagina di Operazioni

```typescript
'use client';

import { createClient } from '@/lib/supabase/client';
import { formatValuta, formatData, colorPnl } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { Toaster, toast } from 'sonner';

export default function OperazioniPage() {
  const [operazioni, setOperazioni] = useState([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchOperazioni();
  }, []);

  const fetchOperazioni = async () => {
    try {
      const { data, error } = await supabase
        .from('operazione')
        .select('*')
        .order('data_apertura', { ascending: false });

      if (error) throw error;
      setOperazioni(data);
    } catch (error) {
      toast.error('Errore nel caricamento operazioni');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div class="text-center py-8">Caricamento...</div>;
  }

  return (
    <div class="main-section">
      <h1 class="text-page-title">Le Mie Operazioni</h1>
      
      <div class="grid-auto">
        {operazioni.map((op) => (
          <div key={op.id} class="card">
            <div class="flex justify-between items-start mb-4">
              <h3 class="text-card-title">{op.simbolo}</h3>
              <span class={`badge-${op.direzione === 'LONG' ? 'success' : 'danger'}`}>
                {op.direzione}
              </span>
            </div>
            
            <div class="space-y-2 text-sm">
              <p>
                <span class="text-text-secondary">Entry:</span>{' '}
                {formatValuta(op.prezzo_entrata)}
              </p>
              {op.prezzo_uscita && (
                <p>
                  <span class="text-text-secondary">Exit:</span>{' '}
                  {formatValuta(op.prezzo_uscita)}
                </p>
              )}
              
              {op.pnl && (
                <p class={colorPnl(op.pnl)}>
                  P&L: {formatValuta(op.pnl)}
                </p>
              )}
              
              <p class="text-text-tertiary">
                {formatData(op.data_apertura)}
              </p>
            </div>
          </div>
        ))}
      </div>

      <Toaster />
    </div>
  );
}
```

## Esempio: Custom Hook per Operazioni

```typescript
// src/lib/hooks/useOperazioni.ts

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import type { Database } from '@/types/database';

type Operazione = Database['public']['Tables']['operazione']['Row'];

export function useOperazioni(userId: string) {
  const [operazioni, setOperazioni] = useState<Operazione[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchOperazioni();
  }, [userId]);

  const fetchOperazioni = async () => {
    try {
      const { data, error: err } = await supabase
        .from('operazione')
        .select('*')
        .eq('profilo_id', userId)
        .order('data_apertura', { ascending: false });

      if (err) throw err;
      setOperazioni(data || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const addOperazione = async (operazione: Omit<Operazione, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error: err } = await supabase
      .from('operazione')
      .insert([operazione])
      .select()
      .single();

    if (err) throw err;
    setOperazioni([data, ...operazioni]);
    return data;
  };

  const updateOperazione = async (id: string, updates: Partial<Operazione>) => {
    const { error: err } = await supabase
      .from('operazione')
      .update(updates)
      .eq('id', id);

    if (err) throw err;
    await fetchOperazioni();
  };

  return {
    operazioni,
    loading,
    error,
    addOperazione,
    updateOperazione,
    refresh: fetchOperazioni
  };
}
```

## Utilizzo nei Componenti

```typescript
'use client';

import { useOperazioni } from '@/lib/hooks/useOperazioni';
import { useEffect, useState } from 'react';

export function Dashboard() {
  const userId = 'user-id'; // Da auth
  const { operazioni, loading, addOperazione } = useOperazioni(userId);

  const handleAddTrade = async () => {
    await addOperazione({
      profilo_id: userId,
      simbolo: 'EURUSD',
      direzione: 'LONG',
      tipo_ordine: 'MARKET',
      prezzo_entrata: 1.0950,
      quantita: 100000,
      commissione: 5,
      data_apertura: new Date().toISOString(),
      stato: 'APERTA'
    });
  };

  return (
    <div>
      <button onClick={handleAddTrade}>Aggiungi Trade</button>
      {/* Render operazioni */}
    </div>
  );
}
```

## Tipi di Database

```typescript
import type { Database } from '@/types/database';

// Tipo per una riga della tabella operazione
type Operazione = Database['public']['Tables']['operazione']['Row'];

// Tipo per insert
type NewOperazione = Database['public']['Tables']['operazione']['Insert'];

// Tipo per update
type UpdateOperazione = Database['public']['Tables']['operazione']['Update'];

// Uso
const op: Operazione = {
  id: '123',
  profilo_id: 'user-123',
  simbolo: 'EURUSD',
  // ... altri campi
  created_at: '2026-03-15T...',
  updated_at: '2026-03-15T...'
};
```

## Animazioni e Transizioni

```html
<!-- Fade in -->
<div class="animate-in">Appare con fade</div>

<!-- Slide up -->
<div class="animate-slide-up">Scivola su</div>

<!-- Transizioni fluide -->
<div class="transition-smooth hover:bg-primary-700">
  Hover smooth
</div>

<!-- Pulse soft -->
<div class="animate-pulse-soft">Pulsa leggermente</div>
```

## Focus Ring

```html
<!-- Focus ring standard -->
<button class="focus-ring">
  Clicca per focus ring
</button>

<!-- Focus ring inset -->
<input class="focus-ring-inset" />
```

## Responsive Grid

```html
<!-- Grid automatico: 1 col mobile, 2 tablet, 3 desktop -->
<div class="grid-auto">
  <div class="card">Card 1</div>
  <div class="card">Card 2</div>
  <div class="card">Card 3</div>
</div>
```

## Dark Mode

Il tema dark è già attivo di default. Per supportare light mode:

```typescript
import { useTheme } from 'next-themes';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
}
```

## Notifications (Toast)

```typescript
import { toast } from 'sonner';

// Success
toast.success('Operazione salvata');

// Error
toast.error('Errore nel salvataggio');

// Info
toast.info('Ricaricamento in corso');

// Warning
toast.warning('Sei sicuro?');

// Custom
toast('Messaggio personalizzato', {
  description: 'Descrizione opzionale',
  action: {
    label: 'Annulla',
    onClick: () => {}
  }
});
```

## Prossime Azioni

1. Creare componenti UI base (Button, Input, Modal, etc.)
2. Implementare pagina Login/Registrazione
3. Creare dashboard principale
4. Implementare form operazioni
5. Creare sezioni metriche e analytics

Buon coding!
