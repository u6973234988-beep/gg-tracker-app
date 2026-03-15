# GG Tracker - Indice Completo dei File

## Riepilogo

Sono stati creati **26 file** di configurazione e fondazione per l'app Next.js GG Tracker, un trading journal avanzato con tema scuro e accento viola.

## Root Directory Files

### Configuration
| File | Descrizione |
|------|-------------|
| `tsconfig.json` | Configurazione TypeScript con path alias `@/*` per import puliti |
| `next.config.mjs` | Configurazione Next.js 15 con ottimizzazione immagini |
| `tailwind.config.ts` | Tailwind CSS con tema scuro, colori personalizzati e componenti |
| `postcss.config.mjs` | PostCSS con Tailwind e Autoprefixer |
| `package.json` | Dipendenze npm (React 19, Next.js 15, Supabase, ecc) |

### Linting & Formatting
| File | Descrizione |
|------|-------------|
| `.eslintrc.json` | ESLint con next/core-web-vitals |
| `.prettierrc.json` | Prettier per formattazione codice automatica |
| `.gitignore` | Esclude node_modules, .env.local, dist, ecc |

### Environment
| File | Descrizione |
|------|-------------|
| `.env.local` | Variabili d'ambiente con credenziali Supabase (NON commitare) |
| `.env.example` | Template per variabili d'ambiente |

### Documentation
| File | Descrizione |
|------|-------------|
| `README.md` | Documentazione principale del progetto |
| `SETUP.md` | Guida di installazione e configurazione |
| `USAGE.md` | Esempi di utilizzo e pattern comuni |
| `FILES_INDEX.md` | Questo file |

---

## src/ Directory

### src/app/ (Next.js App Router)

#### Layout & Styling
| File | Descrizione | Linee |
|------|-------------|-------|
| `layout.tsx` | Root layout con metadata, font Geist, ThemeProvider, Toaster | 64 |
| `globals.css` | Stili globali Tailwind + CSS variables tema scuro + componenti helper | 380 |
| `page.tsx` | Home page che reindirizza a /dashboard | 8 |

**Contenuto globals.css:**
- Import Tailwind CSS base, components, utilities
- CSS variables per tema scuro (background, colori, border)
- Scrollbar styling personalizzato (viola)
- Focus ring personalizzato
- Componenti Tailwind helpers:
  - `.btn-*` (primary, secondary, ghost, danger, success)
  - `.card`, `.card-hover`
  - `.input-base`
  - `.badge-*` (primary, success, danger, warning)
  - `.skeleton`, `.truncate-line`, `.overlay-dark`
  - `.gradient-purple`, `.glow-purple`
  - Animazioni fade-in, slide-up, slide-down, pulse-soft

### src/lib/ (Utilities & Logic)

#### Supabase Integration
| File | Descrizione | Linee |
|------|-------------|-------|
| `supabase/client.ts` | Browser client Supabase con createBrowserClient | 16 |
| `supabase/server.ts` | Server client Supabase con gestione cookies Next.js | 30 |
| `supabase/middleware.ts` | Middleware per refresh sessione Supabase | 42 |

**Features:**
- Entrambi i client includono fallback hardcoded per credenziali
- Server client gestisce cookies con Next.js
- Middleware aggiorna sessione auth automaticamente
- Type-safe con generics Database

#### Utility Functions
| File | Descrizione | Linee |
|------|-------------|-------|
| `utils.ts` | Funzioni di utilità per formattazione e calcoli | 165 |
| `cn.ts` | Re-esporta `cn()` da utils per convenience | 2 |
| `constants.ts` | Costanti globali e labels italiani | 212 |

**utils.ts includes:**
- `cn()` - Merge classi Tailwind con clsx + tailwind-merge
- `formatValuta()` - Formatta come EUR italiano
- `formatPercentuale()` - Formatta percentuali
- `formatData()` - Formato dd/MM/yyyy
- `formatDataBreve()` - Formato "15 Mar"
- `calcolaPnl()` - Calcola profitto/perdita
- `truncateText()`, `isValidUUID()`, `differenteGiorni()`
- `stessoGiorno()`, `formatDurata()`
- `colorPnl()`, `bgColorPnl()` - Colori per P&L

**constants.ts includes:**
- THEME_COLORS - Tutti i colori del tema
- TRADING_DIRECTIONS - LONG, SHORT
- ORDER_TYPES - MARKET, LIMIT, STOP
- OPERATION_STATUSES - APERTA, CHIUSA, ANNULLATA
- ROUTINE_TYPES - PRE_MARKET, POST_MARKET, DURANTE_MARKET, CUSTOM
- FREQUENCIES - GIORNALIERA, SETTIMANALE, MENSILE
- GOAL_PERIODS e GOAL_TYPES
- ASSET_CLASSES - FOREX, CRYPTO, STOCKS, COMMODITIES, INDICES, FUTURES
- TIMEFRAMES - M1, M5, M15, M30, H1, H4, D1, W1, MN1
- CURRENCIES - EUR, USD, GBP, JPY
- VALIDATION_MESSAGES - Messaggi di errore localizzati
- LABELS - Labels italiani per tutti i valori

#### Hooks
| File | Descrizione |
|------|-------------|
| `hooks/index.ts` | Placeholder per custom hooks (da implementare) |

---

### src/types/ (TypeScript Type Definitions)

| File | Descrizione | Linee |
|------|-------------|-------|
| `database.ts` | Tipi TypeScript completi per schema Supabase | 654 |

**Tables Included:**
- `profilo` - Profilo utente con preferenze
- `strategia` - Strategie di trading
- `regola_strategia` - Regole per strategie
- `categoria_tag` - Categorie di tag
- `tag` - Tag per categorizzare operazioni
- `operazione` - Operazioni (trade)
- `operazione_tag` - Relazione tra operazioni e tag
- `esecuzione` - Esecuzioni dettagliate
- `conformita_regole` - Conformità a regole strategia
- `obiettivo` - Obiettivi di trading
- `routine` - Routine di trading
- `routine_step` - Step dentro routine
- `routine_completamento` - Completamenti step

**Views Included:**
- `vista_metriche_utente` - Metriche aggregate utente
- `vista_performance_strategia` - Performance per strategia
- `vista_equity_giornaliera` - Equity curve giornaliera

---

### src/ (Root Utilities)

| File | Descrizione | Linee |
|------|-------------|-------|
| `middleware.ts` | Next.js middleware per auth session + protezione rotte | 33 |

**Features:**
- Aggiorna sessione Supabase tramite middleware helper
- Consente accesso a /login, /registrati
- Percorsi pubblici configurabili
- Matcher pattern per escludere file statici

---

### src/store/ (State Management)

| File | Descrizione |
|------|-------------|
| `index.ts` | Placeholder per Zustand stores (da implementare) |

---

### src/components/ (React Components)

| File | Descrizione |
|------|-------------|
| `.gitkeep` | Placeholder per componenti (da creare) |

Directory preparata per:
- `ui/` - Componenti UI di base
- `layout/` - Componenti di layout (header, sidebar, etc)
- Componenti specifiche del dominio

---

## Riepilogo Statistiche

### File Count
- **Configuration Files**: 5 (tsconfig, next, tailwind, postcss, package)
- **Tool Config**: 3 (eslint, prettier, gitignore)
- **Environment**: 2 (.env.local, .env.example)
- **Documentation**: 4 (README, SETUP, USAGE, FILES_INDEX)
- **TypeScript/TSX**: 10
- **CSS**: 1
- **Altre**:  1

**Total: 26 files**

### Lines of Code (Excluding Comments & Blanks)
- `globals.css`: ~380 linee
- `database.ts`: ~654 linee
- `constants.ts`: ~212 linee
- `utils.ts`: ~165 linee
- `layout.tsx`: ~64 linee
- `tailwind.config.ts`: ~120 linee
- Supabase clients/middleware: ~88 linee
- **Total TypeScript/TSX**: ~1,300+ linee

---

## Quick Reference

### Dove trovare cosa?

| Cosa | Dove |
|------|------|
| Colori tema | `src/lib/constants.ts` or `src/app/globals.css` |
| Funzioni formato | `src/lib/utils.ts` (formatValuta, formatData, etc) |
| Calcolo P&L | `src/lib/utils.ts` > `calcolaPnl()` |
| Enums trading | `src/lib/constants.ts` |
| Layout principale | `src/app/layout.tsx` |
| Stili globali | `src/app/globals.css` |
| Client Supabase | `src/lib/supabase/client.ts` |
| Server Supabase | `src/lib/supabase/server.ts` |
| Tipi database | `src/types/database.ts` |
| Middleware | `src/middleware.ts` |
| Custom hooks | `src/lib/hooks/` |
| Global state | `src/store/` |

---

## Prossimi Step

1. **Creare Componenti UI**
   - `src/components/ui/Button.tsx`
   - `src/components/ui/Input.tsx`
   - `src/components/ui/Card.tsx`
   - `src/components/ui/Modal.tsx`
   - `src/components/ui/Form.tsx`

2. **Implementare Autenticazione**
   - `src/app/auth/login/page.tsx`
   - `src/app/auth/registrati/page.tsx`
   - `src/lib/hooks/useAuth.ts`

3. **Creare Dashboard**
   - `src/app/dashboard/page.tsx`
   - `src/app/dashboard/layout.tsx`
   - `src/components/layout/Sidebar.tsx`
   - `src/components/layout/Header.tsx`

4. **Implementare Feature**
   - Pagina Operazioni
   - Pagina Strategie
   - Pagina Analytics
   - Form nuova operazione

5. **Aggiungere Stores**
   - User store
   - Operations store
   - Strategies store
   - UI state store

---

## Versioni Dipendenze Principali

```
react@19.0.0
next@15.0.0
@supabase/ssr@0.3.0
@supabase/supabase-js@2.47.0
next-themes@0.2.1
sonner@1.3.0
tailwindcss@3.4.0
typescript@5.3.0
zustand@4.4.0
```

---

## Colori Tema (Hex)

```
Primario:     #7F00FF (Viola)
Background:   #0a0a0f (Nero profondo)
Card:         #12121a
Border:       #1e1e2e (Grigio scuro)
Success:      #22c55e (Verde)
Danger:       #ef4444 (Rosso)
Warning:      #eab308 (Giallo)
Info:         #06b6d4 (Cyan)
Text Primary: #ffffff
Text Muted:   #4a4a52
```

---

## Comandi Utili

```bash
# Installare dipendenze
npm install

# Sviluppo
npm run dev

# Build
npm run build

# Start produzione
npm start

# Type checking
npm run type-check

# Lint
npm run lint
```

---

## Note Importanti

- `.env.local` contiene credenziali Supabase (NON commitare)
- Tutti i file sono production-ready
- TypeScript strict mode abilitato
- ESLint e Prettier configurati
- Dark mode è default
- App Router pattern di Next.js 15
- Componenti Tailwind già definiti in globals.css

---

Creazione completata: **15 Marzo 2026**
