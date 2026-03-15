# GG Tracker - Trading Journal Application

GG Tracker è un'applicazione web avanzata per il trading journal, costruita con Next.js 15, Supabase e TypeScript. Permette ai trader di registrare, analizzare e migliorare le loro strategie di trading.

## Caratteristiche

- **Diario di Trading**: Registra tutte le tue operazioni con dettagli completi
- **Gestione Strategie**: Crea e monitora multiple strategie di trading
- **Analisi Avanzate**: Visualizza metriche di performance dettagliate
- **Gestione del Rischio**: Calcola automaticamente P&L e metriche di rischio
- **Sistema di Tag**: Categorizza le tue operazioni per analisi più accurate
- **Routine di Trading**: Implementa routine pre/post market per discipline
- **Obiettivi**: Stabilisci e monitora i tuoi obiettivi di trading
- **Tema Scuro**: Interfaccia moderna con tema scuro e accento viola

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui patterns
- **Backend**: Supabase (PostgreSQL + Auth)
- **UI Components**: Lucide React icons, Sonner toasts
- **State Management**: Zustand
- **Font**: Geist Sans & Mono

## Installazione

```bash
# Clona il repository
git clone <repo-url>
cd gg-tracker-app

# Installa le dipendenze
npm install

# Configura le variabili d'ambiente
cp .env.example .env.local
# Modifica .env.local con le tue credenziali Supabase
```

## Avvio dello Sviluppo

```bash
npm run dev
```

L'app sarà disponibile su `http://localhost:3000`

## Build per Produzione

```bash
npm run build
npm start
```

## Struttura del Progetto

```
gg-tracker-app/
├── src/
│   ├── app/           # App Router di Next.js
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/    # Componenti React riutilizzabili
│   ├── lib/
│   │   ├── supabase/  # Client Supabase
│   │   ├── utils.ts   # Funzioni di utilità
│   │   └── cn.ts      # Helper Tailwind
│   └── types/
│       └── database.ts # Tipi TypeScript da Supabase
├── public/            # File statici
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.mjs
```

## Variabili d'Ambiente

```
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

## Colori e Tema

- **Primario**: #7F00FF (Viola)
- **Background**: #0a0a0f (Nero profondo)
- **Card**: #12121a
- **Bordi**: #1e1e2e
- **Success**: #22c55e
- **Danger**: #ef4444
- **Warning**: #eab308

## Componenti Tailwind Disponibili

### Pulsanti
- `.btn-primary` - Pulsante principale (viola)
- `.btn-secondary` - Pulsante secondario
- `.btn-ghost` - Pulsante fantasma
- `.btn-danger` - Pulsante di pericolo (rosso)
- `.btn-success` - Pulsante di successo (verde)

### Card
- `.card` - Card di base
- `.card-hover` - Card interattiva con hover

### Input
- `.input-base` - Campo input standard

### Badge
- `.badge-primary` - Badge viola
- `.badge-success` - Badge verde
- `.badge-danger` - Badge rosso
- `.badge-warning` - Badge giallo

## Funzioni di Utilità

- `cn()` - Merge di classi Tailwind
- `formatValuta(n)` - Formatta come EUR
- `formatPercentuale(n)` - Formatta come percentuale
- `formatData(date)` - Formatta data (dd/MM/yyyy)
- `formatDataBreve(date)` - Formatta data breve (es. "15 Mar")
- `calcolaPnl()` - Calcola profitto/perdita
- `colorPnl(value)` - Colore basato su valore P&L

## API Supabase

L'applicazione utilizza le seguenti tabelle:

- `profilo` - Profilo utente
- `strategia` - Strategie di trading
- `operazione` - Operazioni (trade)
- `esecuzione` - Esecuzioni dettagliate di operazioni
- `tag` - Tag per categorizzare operazioni
- `categoria_tag` - Categorie di tag
- `routine` - Routine di trading
- `obiettivo` - Obiettivi di trading

## Supporto

Per domande o problemi, apri un issue nel repository.

## Licenza

Proprietario - GG Tracker 2026
