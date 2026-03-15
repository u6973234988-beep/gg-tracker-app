# GG Tracker - Setup e Configurazione

## Struttura dei File Creati

### Root Configuration Files

```
.env.local                  # Variabili d'ambiente (NON commitare)
.env.example                # Template per variabili d'ambiente
.eslintrc.json              # Configurazione ESLint
.gitignore                  # Git ignore patterns
.prettierrc.json            # Configurazione Prettier
next.config.mjs             # Configurazione Next.js
package.json                # Dipendenze del progetto
postcss.config.mjs          # Configurazione PostCSS
README.md                   # Documentazione principale
tailwind.config.ts          # Configurazione Tailwind CSS
tsconfig.json               # Configurazione TypeScript
SETUP.md                    # Questo file
```

### Struttura src/

```
src/
├── app/                     # App Router di Next.js 15
│   ├── layout.tsx           # Layout root con Metadata, ThemeProvider, Toaster
│   ├── globals.css          # Stili globali e CSS variables
│   ├── page.tsx             # Home page (reindirizza a /dashboard)
│   ├── auth/                # Pagine di autenticazione (da creare)
│   └── dashboard/           # Pagine del dashboard (da creare)
│
├── components/              # Componenti React riutilizzabili
│   ├── ui/                  # Componenti UI di base (da creare)
│   ├── layout/              # Componenti di layout (da creare)
│   └── ...
│
├── lib/                     # Funzioni utility e configurazioni
│   ├── supabase/
│   │   ├── client.ts        # Client browser Supabase
│   │   ├── server.ts        # Client server Supabase
│   │   └── middleware.ts    # Middleware per auth
│   ├── hooks/               # Custom React hooks (placeholder)
│   ├── cn.ts                # Helper Tailwind (esporta cn)
│   ├── constants.ts         # Costanti globali (colori, tipo, labels)
│   └── utils.ts             # Funzioni utility (format, calcoli)
│
├── store/                   # Zustand stores per stato globale
│   └── index.ts             # Store principale (placeholder)
│
├── types/                   # Tipi TypeScript
│   └── database.ts          # Tipi schema Supabase
│
└── middleware.ts            # Next.js middleware (refresh auth)
```

## Installazione e Setup

### 1. Installare Dipendenze

```bash
cd gg-tracker-app
npm install
```

### 2. Configurare Variabili d'Ambiente

Le variabili sono già in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://rtjhmcuihwfqxbnefqur.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

Queste contengono già le credenziali Supabase fornite.

### 3. Avviare il Progetto

```bash
npm run dev
```

L'app sarà disponibile su `http://localhost:3000`

## Cosa è Stato Creato

### 1. Configuration Files
- **tsconfig.json**: TypeScript con path alias `@/*`
- **next.config.mjs**: Configurazione Next.js 15 con image optimization
- **postcss.config.mjs**: PostCSS con Tailwind e Autoprefixer
- **tailwind.config.ts**: Tema scuro con colori personalizzati (viola #7F00FF)

### 2. Styling
- **globals.css**: 
  - Import Tailwind CSS
  - CSS variables per tema scuro e colori
  - Scrollbar styling personalizzato
  - Componenti Tailwind helpers (btn-*, card-*, input-*, badge-*)
  - Animazioni fluide

### 3. Supabase Integration
- **src/lib/supabase/client.ts**: Browser client con fallback hardcoded
- **src/lib/supabase/server.ts**: Server client con gestione cookies Next.js
- **src/lib/supabase/middleware.ts**: Middleware per refresh sessione
- **src/middleware.ts**: Next.js middleware per protezione rotte

### 4. Database Types
- **src/types/database.ts**: Types completi per tutte le tabelle Supabase:
  - profilo, strategia, regola_strategia
  - categoria_tag, tag, operazione, operazione_tag
  - esecuzione, conformita_regole
  - obiettivo, routine, routine_step, routine_completamento
  - Viste: vista_metriche_utente, vista_performance_strategia, vista_equity_giornaliera

### 5. Utility Functions
- **src/lib/utils.ts**: Funzioni di utilità:
  - `cn()` - Merge di classi Tailwind
  - `formatValuta()` - Formatta EUR italiano
  - `formatPercentuale()` - Formatta percentuali
  - `formatData()` - Data dd/MM/yyyy italiano
  - `calcolaPnl()` - Calcola P&L di operazioni
  - Helper per colori P&L, truncate, UUID validation, etc.

### 6. Constants
- **src/lib/constants.ts**: Costanti globali:
  - Colori tema
  - Enum per direzioni (LONG/SHORT), ordini (MARKET/LIMIT/STOP)
  - Stati operazioni, routine, frequenze
  - Asset classes, timeframes, valute
  - Labels italiani per tutti i valori
  - Messaggi validazione

### 7. Root Layout
- **src/app/layout.tsx**: 
  - Font Geist Sans/Mono
  - ThemeProvider da next-themes (dark default)
  - Toaster da sonner
  - Metadata italiana

### 8. Environment Files
- **.env.local**: Variabili ambiente con credenziali Supabase
- **.env.example**: Template per variabili
- **.gitignore**: Esclude file sensibili

### 9. Config Tools
- **.eslintrc.json**: ESLint config con next core-web-vitals
- **.prettierrc.json**: Prettier per formattazione codice
- **package.json**: Tutte le dipendenze necessarie

## Dipendenze Principali

### Production
- **react@19**: UI library
- **next@15**: Framework React con SSR
- **@supabase/ssr@0.3.0**: Client SSR-safe Supabase
- **@supabase/supabase-js@2.47**: Client JavaScript Supabase
- **next-themes@0.2.1**: Dark mode management
- **sonner@1.3.0**: Toast notifications
- **tailwindcss@3.4**: CSS utility framework
- **clsx@2.1 + tailwind-merge@2.2**: Merge classi Tailwind
- **lucide-react@0.383**: Icon library
- **zustand@4.4**: State management
- **axios@1.6**: HTTP client

### Development
- **typescript@5.3**: Type safety
- **@types/react@19, @types/react-dom@19**: Type definitions
- **geist@1.3**: Font Geist
- **eslint@8.55**: Code linting
- **tailwindcss@3.4**: CSS framework

## Colori Disponibili

Il tema è basato su un viola primario (#7F00FF) con palette scura:

```
Primario: #7F00FF (Viola)
Background: #0a0a0f (Nero profondo)
Card: #12121a (Nero grigio)
Border: #1e1e2e (Grigio scuro)
Success: #22c55e (Verde)
Danger: #ef4444 (Rosso)
Warning: #eab308 (Giallo)
Info: #06b6d4 (Cyan)

Testo:
  Primary: #ffffff (Bianco)
  Secondary: #a8a8b8 (Grigio)
  Tertiary: #72727a (Grigio scuro)
  Muted: #4a4a52 (Grigio scurissimo)
```

## Componenti Tailwind Disponibili

### Button
```html
<button class="btn-primary">Primario</button>
<button class="btn-secondary">Secondario</button>
<button class="btn-ghost">Ghost</button>
<button class="btn-danger">Pericolo</button>
<button class="btn-success">Successo</button>
```

### Card
```html
<div class="card">Card di base</div>
<div class="card-hover">Card interattiva</div>
```

### Input
```html
<input type="text" class="input-base" placeholder="Input">
```

### Badge
```html
<span class="badge-primary">Viola</span>
<span class="badge-success">Verde</span>
<span class="badge-danger">Rosso</span>
<span class="badge-warning">Giallo</span>
```

## Prossimi Step

1. **Creare Pagine Autenticazione**
   - src/app/auth/login
   - src/app/auth/registrati
   - src/app/auth/forgot-password

2. **Creare Dashboard Principale**
   - src/app/dashboard/page.tsx
   - src/app/dashboard/operazioni
   - src/app/dashboard/strategie
   - src/app/dashboard/analytics

3. **Implementare Componenti**
   - Form di operazioni
   - Tabella operazioni
   - Chart metriche
   - Sidebar/Navbar

4. **Implementare Stores Zustand**
   - User store
   - Operations store
   - Strategies store
   - Notifications store

5. **Aggiungere Custom Hooks**
   - useSupabase() - Hook per operazioni DB
   - useAuth() - Hook per autenticazione
   - useOperations() - Hook per operazioni
   - useMetrics() - Hook per metriche

## Note Importanti

- `.env.local` NON deve essere committato (è in .gitignore)
- Tutti i file di configurazione sono production-ready
- L'app usa next-themes per dark mode (CSS class-based)
- Supabase SSR integration è già configurato
- Middleware Next.js è pronto per refresh auth
- TypeScript è strict mode
- ESLint e Prettier sono configurati

## Comandi Utili

```bash
# Sviluppo
npm run dev

# Build produzione
npm run build

# Start produzione
npm start

# Type checking
npm run type-check

# Lint
npm run lint
```

## Troubleshooting

Se hai problemi:

1. Assicurati che `.env.local` abbia le credenziali Supabase corrette
2. Cancella `.next` e `node_modules` e reinstalla: `rm -rf .next node_modules && npm install`
3. Verifica che la porta 3000 sia libera
4. Controlla che Node.js sia versione 18+: `node --version`

## Support

Per domande sulla configurazione, vedi README.md e SETUP.md.
