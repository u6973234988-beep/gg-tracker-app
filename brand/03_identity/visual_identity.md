# GG TRACKER — Visual Identity Guidelines

---

## Filosofia Visiva

> *Il design di GG Tracker non decora. Comunica. Ogni pixel ha un'intenzione.*

L'identita visiva di GG Tracker si basa su tre principi:
- **Dark dominance** — il buio e il canvas, la luce e l'accento
- **Violet as power** — il viola non e decorativo, e il colore del brand
- **Tech precision** — linee nette, spaziature calcolate, zero rumore

---

## Palette Colori

### Colori Primari

| Nome | Hex | Uso |
|------|-----|-----|
| **Deep Void** | `#161622` | Background principale dark theme |
| **Dark Surface** | `#1e1e30` | Carte, dialog, superfici elevate |
| **Violet Core** | `#7c3aed` | Accento principale, CTA, elementi interattivi |
| **Violet Bright** | `#8b5cf6` | Hover states, accenti secondari |
| **Violet Glow** | `rgba(139, 92, 246, 0.25)` | Glow effects, shadows |

### Colori Neutri

| Nome | Hex | Uso |
|------|-----|-----|
| **Pure White** | `#ffffff` | Background light theme, testi su dark |
| **Gray 900** | `#111827` | Testo principale light theme |
| **Gray 500** | `#6b7280` | Testo secondario light theme |
| **Gray 400** | `#9ca3af` | Testo secondario dark theme |
| **Gray 200** | `#e5e7eb` | Bordi light theme |
| **Gray 100** | `#f3f4f6` | Background secondario light theme |

### Colori Semantici

| Nome | Hex | Uso |
|------|-----|-----|
| **Profit Green** | `#22c55e` | Trade in profitto, metriche positive |
| **Loss Red** | `#ef4444` | Trade in perdita, metriche negative |
| **Warning Amber** | `#f59e0b` | Attenzione, stati intermedi |
| **Info Blue** | `#3b82f6` | Informazioni, link |

---

## Tipografia

### Font Principale
**Inter** — Sans-serif geometrico, moderno, altamente leggibile.

### Gerarchia Tipografica

| Livello | Peso | Tracking | Uso |
|---------|------|----------|-----|
| H1 | `font-bold` (700) | `tracking-tight` | Titoli pagina |
| H2 | `font-bold` (700) | `tracking-tight` | Titoli sezione |
| H3 | `font-semibold` (600) | `tracking-tight` | Sottotitoli |
| Body | `font-normal` (400) | Default | Testo corrente |
| Caption | `font-medium` (500) | Default | Label, metadata |
| Mono | `font-mono` | Default | Dati, numeri, codice |

### Regole Tipografiche
- I titoli usano SEMPRE `font-bold tracking-tight` — effetto premium tech
- I numeri (P&L, percentuali, stats) usano font mono per allineamento
- Mai usare font-light — il minimo e font-normal
- Size minima leggibile: 12px per caption, 14px per body

---

## Componenti Visivi

### Carte (Cards)
```
Light theme:
  - Background: white
  - Border: gray-200 (1px solid)
  - Shadow: sm o nessuna
  - Radius: lg (0.5rem)

Dark theme:
  - Background: #1e1e30
  - Border: violet-500/20 (1px solid)
  - Shadow: violet glow opzionale
  - Radius: lg (0.5rem)
```

### Bottoni Primari
```
Default: bg-violet-600 text-white font-bold
Hover: bg-violet-700
Shadow: shadow-lg shadow-violet-500/25
Radius: lg
Padding: px-6 py-3
```

### Input Fields
```
Light:
  - Border: gray-200
  - Background: white
  - Text: gray-900
  - Focus: ring-violet-500

Dark:
  - Border: violet-500/30
  - Background: #161622
  - Text: white
  - Focus: ring-violet-400
```

### Badge/Tag
```
Light: bg-violet-50 text-violet-700 border-violet-200
Dark: bg-violet-500/10 text-violet-300 border-violet-500/20
```

---

## Pattern Grafici

### Grid Background
Il pattern a griglia tecnica appare sui background principali:
```css
background-image: linear-gradient(rgba(139,92,246,0.03) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(139,92,246,0.03) 1px, transparent 1px);
background-size: 60px 60px;
```
Effetto: sottile griglia tecnica che ricorda schermi di trading e blueprints.

### Glow Effects
I glow viola vengono usati con parsimonia per enfatizzare:
- Bottoni CTA principali: `shadow-lg shadow-violet-500/25`
- Card hover states: `shadow-violet-500/10`
- Bordi attivi: `border-violet-500/40`

Non abusare dei glow — devono sentirsi speciali, non ovunque.

---

## Iconografia

### Stile
- **Tipo:** Outline/Linear (stile Lucide Icons)
- **Peso:** 1.5px stroke
- **Size:** 16px (small), 20px (default), 24px (large)
- **Colore:** Eredita dal testo, o violet per accenti

### Principi
- Mai usare icone filled/solid come stile principale
- Le icone accompagnano, non sostituiscono il testo
- In caso di dubbio, meno icone e meglio

---

## Layout Principles

### Spaziatura
- Usare multipli di 4px (4, 8, 12, 16, 24, 32, 48, 64)
- Padding interno carte: 24px (desktop), 16px (mobile)
- Gap tra elementi: 16px (stretto), 24px (medio), 32px (largo)
- Margin tra sezioni: 32px-48px

### Grid
- Desktop: max-width 1400px, padding laterale 24-32px
- Grid principali: 12 colonne con gap 24px
- Card grid: 1 col (mobile), 2 col (tablet), 3 col (desktop)

### Responsive
- Mobile first
- Breakpoints: sm(640), md(768), lg(1024), xl(1280)
- Su mobile: ridurre padding, stackare colonne, size testo leggermente piu piccoli

---

## Animazioni

### Principi
- Le animazioni devono essere **veloci e precise** — mai lente o morbide
- Duration: 150-300ms per micro-interactions, max 500ms per transizioni pagina
- Easing: `ease-out` per entrate, `ease-in` per uscite
- Mai animare per il gusto di animare — ogni animazione ha uno scopo

### Animazioni Consentite
- Fade-in delle carte al caricamento (staggered, 50ms delay tra carte)
- Scale leggermente su hover delle carte (1.00 -> 1.02)
- Slide-in per dialog e panel
- Pulse sottile per notifiche o badge nuovi

### Animazioni Vietate
- Bounce
- Shake
- Animazioni lunghe (> 500ms)
- Animazioni su scroll eccessive
- Parallax

---

## Regole per Social Media

### Instagram
- **Formato post:** 1080x1080 (quadrato) o 1080x1350 (portrait)
- **Formato stories:** 1080x1920
- **Background:** Sempre dark (#161622 o gradient dark)
- **Font overlay:** Bold, grande, bianco o viola
- **Mai usare:** stock photos, emoji come elemento grafico, colori caldi

### Discord
- **Avatar:** Logo GG su sfondo #161622
- **Banner:** Visual coerente con palette viola/dark
- **Embed:** Usare violet come colore sidebar

---

## Il Logo

### Concept
Il logo di GG Tracker deve comunicare:
- Tech precision (geometria, linee nette)
- Mistero (il significato nascosto di "GG")
- Premium quality (pulizia, spazio)
- Dark energy (funziona meglio su sfondi scuri)

### Versioni necessarie
1. **Logo completo:** "GG" mark + "TRACKER" wordmark
2. **Logo abbreviato:** Solo "GG" mark
3. **Favicon:** "GG" mark semplificato per dimensioni piccole
4. **Monochrome:** Versione bianca per sfondi scuri
5. **Reversed:** Versione scura per sfondi chiari (raro)

### Spazio di protezione
Minimo: altezza del mark "GG" come margine su tutti i lati.

---

*Queste linee guida si applicano a TUTTI i touchpoint visivi del brand.*
