/**
 * Costanti globali dell'applicazione GG Tracker
 */

// Colori del tema
export const THEME_COLORS = {
  primary: '#7F00FF',
  primaryDark: '#6c00db',
  primaryLight: '#9e00ff',
  background: '#0a0a0f',
  card: '#12121a',
  border: '#1e1e2e',
  success: '#22c55e',
  danger: '#ef4444',
  warning: '#eab308',
  info: '#06b6d4',
  text: {
    primary: '#ffffff',
    secondary: '#a8a8b8',
    tertiary: '#72727a',
    muted: '#4a4a52',
  },
} as const;

// Direzioni di trading
export const TRADING_DIRECTIONS = {
  LONG: 'LONG',
  SHORT: 'SHORT',
} as const;

export type TradingDirection = typeof TRADING_DIRECTIONS[keyof typeof TRADING_DIRECTIONS];

// Tipi di ordine
export const ORDER_TYPES = {
  MARKET: 'MARKET',
  LIMIT: 'LIMIT',
  STOP: 'STOP',
} as const;

export type OrderType = typeof ORDER_TYPES[keyof typeof ORDER_TYPES];

// Stati delle operazioni
export const OPERATION_STATUSES = {
  APERTA: 'APERTA',
  CHIUSA: 'CHIUSA',
  ANNULLATA: 'ANNULLATA',
} as const;

export type OperationStatus = typeof OPERATION_STATUSES[keyof typeof OPERATION_STATUSES];

// Tipi di routine
export const ROUTINE_TYPES = {
  PRE_MARKET: 'PRE_MARKET',
  POST_MARKET: 'POST_MARKET',
  DURANTE_MARKET: 'DURANTE_MARKET',
  CUSTOM: 'CUSTOM',
} as const;

export type RoutineType = typeof ROUTINE_TYPES[keyof typeof ROUTINE_TYPES];

// Frequenze
export const FREQUENCIES = {
  GIORNALIERA: 'GIORNALIERA',
  SETTIMANALE: 'SETTIMANALE',
  MENSILE: 'MENSILE',
} as const;

export type Frequency = typeof FREQUENCIES[keyof typeof FREQUENCIES];

// Periodi degli obiettivi
export const GOAL_PERIODS = {
  GIORNALIERO: 'GIORNALIERO',
  SETTIMANALE: 'SETTIMANALE',
  MENSILE: 'MENSILE',
  TRIMESTRALE: 'TRIMESTRALE',
} as const;

export type GoalPeriod = typeof GOAL_PERIODS[keyof typeof GOAL_PERIODS];

// Tipi di obiettivi
export const GOAL_TYPES = {
  PROFITTO: 'PROFITTO',
  WIN_RATE: 'WIN_RATE',
  TRADE_COUNT: 'TRADE_COUNT',
  CUSTOM: 'CUSTOM',
} as const;

export type GoalType = typeof GOAL_TYPES[keyof typeof GOAL_TYPES];

// Asset class comuni
export const ASSET_CLASSES = {
  FOREX: 'FOREX',
  CRYPTO: 'CRYPTO',
  STOCKS: 'STOCKS',
  COMMODITIES: 'COMMODITIES',
  INDICES: 'INDICES',
  FUTURES: 'FUTURES',
} as const;

export type AssetClass = typeof ASSET_CLASSES[keyof typeof ASSET_CLASSES];

// Timeframe comuni
export const TIMEFRAMES = {
  M1: '1m',
  M5: '5m',
  M15: '15m',
  M30: '30m',
  H1: '1h',
  H4: '4h',
  D1: '1d',
  W1: '1w',
  MN1: '1mo',
} as const;

export type Timeframe = typeof TIMEFRAMES[keyof typeof TIMEFRAMES];

// Valute supportate
export const CURRENCIES = {
  EUR: 'EUR',
  USD: 'USD',
  GBP: 'GBP',
  JPY: 'JPY',
} as const;

export type Currency = typeof CURRENCIES[keyof typeof CURRENCIES];

// Messaggi di validazione comuni
export const VALIDATION_MESSAGES = {
  required: 'Questo campo è obbligatorio',
  invalidEmail: 'Email non valida',
  passwordTooShort: 'La password deve avere almeno 8 caratteri',
  passwordMismatch: 'Le password non corrispondono',
  invalidNumber: 'Inserisci un numero valido',
  invalidDate: 'Inserisci una data valida',
  minValue: (min: number) => `Il valore minimo è ${min}`,
  maxValue: (max: number) => `Il valore massimo è ${max}`,
} as const;

// Paginazione
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
} as const;

// Durate delle animazioni (ms)
export const ANIMATION_DURATIONS = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
} as const;

// Timeout comuni (ms)
export const TIMEOUTS = {
  TOAST: 5000,
  MODAL: 300,
  DEBOUNCE: 300,
  THROTTLE: 500,
} as const;

// Limiti di caricamento
export const LIMITS = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_DESCRIPTION_LENGTH: 500,
  MAX_NOTE_LENGTH: 2000,
  MAX_TAG_NAME_LENGTH: 50,
  MAX_STRATEGY_NAME_LENGTH: 100,
} as const;

// Labels per i valori comuni
export const LABELS = {
  direction: {
    LONG: 'Long',
    SHORT: 'Short',
  },
  orderType: {
    MARKET: 'Market',
    LIMIT: 'Limit',
    STOP: 'Stop',
  },
  operationStatus: {
    APERTA: 'Aperta',
    CHIUSA: 'Chiusa',
    ANNULLATA: 'Annullata',
  },
  routineType: {
    PRE_MARKET: 'Pre-Market',
    POST_MARKET: 'Post-Market',
    DURANTE_MARKET: 'Durante Market',
    CUSTOM: 'Personalizzata',
  },
  frequency: {
    GIORNALIERA: 'Giornaliera',
    SETTIMANALE: 'Settimanale',
    MENSILE: 'Mensile',
  },
  goalPeriod: {
    GIORNALIERO: 'Giornaliero',
    SETTIMANALE: 'Settimanale',
    MENSILE: 'Mensile',
    TRIMESTRALE: 'Trimestrale',
  },
  goalType: {
    PROFITTO: 'Profitto',
    WIN_RATE: 'Win Rate',
    TRADE_COUNT: 'Numero di Trade',
    CUSTOM: 'Personalizzato',
  },
  assetClass: {
    FOREX: 'Forex',
    CRYPTO: 'Criptovalute',
    STOCKS: 'Azioni',
    COMMODITIES: 'Materie Prime',
    INDICES: 'Indici',
    FUTURES: 'Futures',
  },
} as const;
