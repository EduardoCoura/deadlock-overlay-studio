export const DEFAULT_ACCOUNT_ID = 385814004; // MikaelS (Leaderboard / Eternus)

export const STYLE_PRESETS = [
  {
    id: 'trn-boxed',
    name: 'Tracker Boxed',
    badge: 'Estilo Tracker.gg',
    description: 'Banner horizontal estilo Fortnite/Esports com blocos translúcidos e selo central.',
    category: 'tracker',
    defaults: {
      accent: '#f1ed62',
      bg: '#0b0e14',
      bgAlpha: 0.72,
      text: '#ffffff',
      label: '#f1ed62',
      gradient: true,
      blur: 10,
      position: 'top-center',
      stats: ['winrate', 'kd', 'matches', 'wins', 'souls_min', 'session_wl'],
    },
  },
  {
    id: 'trn-angled',
    name: 'Tracker Skewed',
    badge: 'Estilo Tracker.gg',
    description: 'Faixa angulada estilo Apex Legends com ticks de tier e divisórias inclinadas.',
    category: 'tracker',
    defaults: {
      accent: '#f65226',
      bg: '#0f1219',
      bgAlpha: 0.85,
      text: '#ffffff',
      label: '#cbb879',
      gradient: true,
      blur: 8,
      position: 'bottom-left',
      stats: ['kd', 'winrate', 'souls_min', 'session_wl'],
    },
  },
  {
    id: 'trn-glass',
    name: 'Tactical Glass',
    badge: 'Estilo Tracker.gg',
    description: 'Barra glassmorphism tática estilo Valorant Competitivo + delta de progresso.',
    category: 'tracker',
    defaults: {
      accent: '#ff4655',
      bg: '#111622',
      bgAlpha: 0.68,
      text: '#f8fafc',
      label: '#cbd5e1',
      gradient: true,
      blur: 16,
      position: 'top-left',
      stats: ['winrate', 'kd', 'kda', 'souls_min'],
    },
  },
  {
    id: 'trn-card',
    name: 'Lifetime Card',
    badge: 'Estilo Tracker.gg',
    description: 'Cartão vertical compacto estilo Lifetime Stats com ícones por linha.',
    category: 'tracker',
    defaults: {
      accent: '#f1ed62',
      bg: '#0b0e14',
      bgAlpha: 0.88,
      text: '#ffffff',
      label: '#a8b3cf',
      gradient: false,
      blur: 10,
      position: 'top-right',
      stats: ['winrate', 'wins', 'kd', 'souls_min', 'dmg_min', 'matches'],
    },
  },
  {
    id: 'dlk-occult',
    name: 'Cursed Apple Noir',
    badge: 'Exclusivo Deadlock',
    description: 'Art Deco Oculto anos 40: moldura dourada dupla, tipografia clássica e selo arcano.',
    category: 'deadlock',
    defaults: {
      accent: '#d8ad5c',
      bg: '#101218',
      bgAlpha: 0.9,
      text: '#f7f1e3',
      label: '#d8ad5c',
      gradient: true,
      blur: 12,
      position: 'bottom-left',
      stats: ['winrate', 'kd', 'souls_min', 'top_hero'],
    },
  },
  {
    id: 'dlk-amber-sapphire',
    name: 'Amber vs Sapphire',
    badge: 'Exclusivo Deadlock',
    description: 'HUD das duas facções do Deadlock com radar automático de partida ao vivo.',
    category: 'deadlock',
    defaults: {
      accent: '#e59437',
      bg: '#0d131d',
      bgAlpha: 0.84,
      text: '#ffffff',
      label: '#7cc4ff',
      gradient: true,
      blur: 12,
      position: 'top-center',
      stats: ['winrate', 'kda', 'souls_min', 'dmg_min'],
    },
  },
  {
    id: 'dlk-hero-spotlight',
    name: 'Hero Spotlight',
    badge: 'Exclusivo Deadlock',
    description: 'Destaque para o retrato do Herói atual/principal + sessão do dia e sequência W/L.',
    category: 'deadlock',
    defaults: {
      accent: '#5ce9a9',
      bg: '#0d1418',
      bgAlpha: 0.82,
      text: '#ffffff',
      label: '#99f6d2',
      gradient: true,
      blur: 12,
      position: 'bottom-right',
      stats: ['winrate', 'kd', 'souls_min', 'session_wl'],
    },
  },
  {
    id: 'dlk-minimal-pill',
    name: 'Minimal Pill',
    badge: 'Ultra Compacto',
    description: 'Pílula discreta de canto de tela com elo, delta recente e 3 métricas essenciais.',
    category: 'extra',
    defaults: {
      accent: '#b47feb',
      bg: '#090c12',
      bgAlpha: 0.78,
      text: '#ffffff',
      label: '#c4b5fd',
      gradient: false,
      blur: 14,
      position: 'bottom-center',
      stats: ['winrate', 'kd', 'souls_min'],
    },
  },
];

export const STAT_CATALOG = [
  { id: 'winrate', label: 'Win %', shortLabel: 'WIN %', icon: 'crown' },
  { id: 'kd', label: 'K/D Ratio', shortLabel: 'K/D', icon: 'skull' },
  { id: 'kda', label: 'KDA Ratio', shortLabel: 'KDA', icon: 'crosshair' },
  { id: 'wl', label: 'Vitórias / Derrotas', shortLabel: 'W / L', icon: 'trophy' },
  { id: 'wins', label: 'Total de Vitórias', shortLabel: 'WINS', icon: 'trophy' },
  { id: 'matches', label: 'Partidas', shortLabel: 'PARTIDAS', icon: 'shield' },
  { id: 'souls_min', label: 'Souls / min', shortLabel: 'SOULS/M', icon: 'soul' },
  { id: 'dmg_min', label: 'Dano / min', shortLabel: 'DANO/M', icon: 'flame' },
  { id: 'accuracy', label: 'Precisão %', shortLabel: 'PRECISÃO', icon: 'target' },
  { id: 'session_wl', label: 'Sessão Hoje (12h)', shortLabel: 'SESSÃO', icon: 'pulse' },
  { id: 'top_hero', label: 'Herói Principal', shortLabel: 'MAIN HERO', icon: 'star' },
  { id: 'last_match', label: 'Última Partida', shortLabel: 'ÚLTIMA', icon: 'clock' },
];

export const PALETTE_SWATCHES = [
  { name: 'TRN Gold', accent: '#f1ed62', label: '#f1ed62', bg: '#0b0e14' },
  { name: 'Valorant Red', accent: '#ff4655', label: '#cbd5e1', bg: '#111622' },
  { name: 'Apex Flame', accent: '#f65226', label: '#cbb879', bg: '#0f1219' },
  { name: 'Cursed Brass', accent: '#d8ad5c', label: '#d8ad5c', bg: '#101218' },
  { name: 'Eternus Emerald', accent: '#5ce9a9', label: '#99f6d2', bg: '#0d1418' },
  { name: 'Amber Hand', accent: '#e59437', label: '#fcd34d', bg: '#13100c' },
  { name: 'Sapphire Flame', accent: '#4b9bff', label: '#93c5fd', bg: '#0b121e' },
  { name: 'Spirit Violet', accent: '#b47feb', label: '#ddd6fe', bg: '#120e1c' },
];

export const BG_SCENES = [
  {
    id: 'infernus',
    label: 'Cursed Apple (Infernus)',
    url: 'https://assets-bucket.deadlock-api.com/assets-api-res/images/heroes/backgrounds/infernus_bg.webp',
  },
  {
    id: 'seven',
    label: 'Noir Tempest (Seven)',
    url: 'https://assets-bucket.deadlock-api.com/assets-api-res/images/heroes/backgrounds/seven_bg.webp',
  },
  {
    id: 'vindicta',
    label: 'Rooftop Hunt (Vindicta)',
    url: 'https://assets-bucket.deadlock-api.com/assets-api-res/images/heroes/backgrounds/vindicta_bg.webp',
  },
  {
    id: 'obs-grid',
    label: 'Grade Transparente (OBS)',
    url: null,
  },
  {
    id: 'dark-noir',
    label: 'Fundo Escuro Neutro',
    url: null,
  },
  {
    id: 'chroma-green',
    label: 'Chroma Key Verde',
    url: null,
  },
];

export const POSITION_OPTIONS = [
  { id: 'top-left', label: 'Topo Esq.' },
  { id: 'top-center', label: 'Topo Centro' },
  { id: 'top-right', label: 'Topo Dir.' },
  { id: 'bottom-left', label: 'Base Esq.' },
  { id: 'bottom-center', label: 'Base Centro' },
  { id: 'bottom-right', label: 'Base Dir.' },
];

export const STORAGE_KEY = 'deadlock_overlay_studio_config_v1';

export function getStylePreset(styleId) {
  return STYLE_PRESETS.find((s) => s.id === styleId) || STYLE_PRESETS[0];
}

export function createDefaultConfig(styleId = 'trn-boxed') {
  const preset = getStylePreset(styleId);
  return {
    accountId: DEFAULT_ACCOUNT_ID,
    style: preset.id,
    gameMode: 'all', // 'all' | 'normal' | 'street_brawl'
    statWindow: 'career', // 'career' | 'recent20' | 'session12h'
    accent: preset.defaults.accent,
    bg: preset.defaults.bg,
    bgAlpha: preset.defaults.bgAlpha,
    text: preset.defaults.text,
    label: preset.defaults.label,
    gradient: preset.defaults.gradient,
    blur: preset.defaults.blur,
    scale: 1,
    position: preset.defaults.position,
    showRankIcon: true,
    showAvatar: true,
    showHeroPortrait: true,
    showRecentForm: true,
    showLiveBar: true,
    showFooter: true,
    footerText: 'DEADLOCK TRACKER',
    simulateLive: false,
    scene: 'infernus',
    refreshSeconds: 60,
    stats: [...preset.defaults.stats],
  };
}

function sanitizeHex(val, fallback) {
  if (typeof val !== 'string') return fallback;
  const clean = val.trim();
  return /^#[0-9a-fA-F]{6}$/.test(clean) ? clean.toLowerCase() : fallback;
}

function clampNum(val, min, max, fallback) {
  const n = Number(val);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function sanitizeConfig(raw) {
  const base = createDefaultConfig(raw?.style);
  const validStatIds = new Set(STAT_CATALOG.map((s) => s.id));
  const validModes = new Set(['all', 'normal', 'street_brawl']);
  const validWindows = new Set(['career', 'recent20', 'session12h']);
  const validPositions = new Set(POSITION_OPTIONS.map((p) => p.id));
  const validScenes = new Set(BG_SCENES.map((s) => s.id));

  let parsedStats = base.stats;
  if (Array.isArray(raw?.stats)) {
    const filtered = raw.stats.filter((id) => validStatIds.has(id));
    if (filtered.length > 0) {
      parsedStats = [...new Set(filtered)].slice(0, 8);
    }
  } else if (typeof raw?.stats === 'string') {
    const filtered = raw.stats
      .split(',')
      .map((s) => s.trim())
      .filter((id) => validStatIds.has(id));
    if (filtered.length > 0) {
      parsedStats = [...new Set(filtered)].slice(0, 8);
    }
  }

  const acc = Number.parseInt(raw?.accountId ?? raw?.account, 10);

  return {
    accountId: Number.isFinite(acc) && acc > 0 ? acc : base.accountId,
    style: base.style,
    gameMode: validModes.has(raw?.gameMode ?? raw?.mode) ? (raw.gameMode ?? raw.mode) : base.gameMode,
    statWindow: validWindows.has(raw?.statWindow ?? raw?.win)
      ? (raw.statWindow ?? raw.win)
      : base.statWindow,
    accent: sanitizeHex(raw?.accent, base.accent),
    bg: sanitizeHex(raw?.bg, base.bg),
    bgAlpha: clampNum(raw?.bgAlpha ?? raw?.alpha, 0, 1, base.bgAlpha),
    text: sanitizeHex(raw?.text, base.text),
    label: sanitizeHex(raw?.label, base.label),
    gradient: raw?.gradient !== undefined ? raw.gradient !== false && raw.gradient !== '0' : base.gradient,
    blur: clampNum(raw?.blur, 0, 24, base.blur),
    scale: clampNum(raw?.scale, 0.7, 1.4, base.scale),
    position: validPositions.has(raw?.position ?? raw?.pos) ? (raw.position ?? raw.pos) : base.position,
    showRankIcon: raw?.showRankIcon !== undefined ? raw.showRankIcon !== false && raw.showRankIcon !== '0' : base.showRankIcon,
    showAvatar: raw?.showAvatar !== undefined ? raw.showAvatar !== false && raw.showAvatar !== '0' : base.showAvatar,
    showHeroPortrait: raw?.showHeroPortrait !== undefined ? raw.showHeroPortrait !== false && raw.showHeroPortrait !== '0' : base.showHeroPortrait,
    showRecentForm: raw?.showRecentForm !== undefined ? raw.showRecentForm !== false && raw.showRecentForm !== '0' : base.showRecentForm,
    showLiveBar: raw?.showLiveBar !== undefined ? raw.showLiveBar !== false && raw.showLiveBar !== '0' : base.showLiveBar,
    showFooter: raw?.showFooter !== undefined ? raw.showFooter !== false && raw.showFooter !== '0' : base.showFooter,
    footerText: typeof raw?.footerText === 'string'
      ? raw.footerText.slice(0, 38)
      : typeof raw?.brand === 'string'
        ? raw.brand.slice(0, 38)
        : base.footerText,
    simulateLive: raw?.simulateLive === true || raw?.simulateLive === '1',
    scene: validScenes.has(raw?.scene) ? raw.scene : base.scene,
    refreshSeconds: clampNum(raw?.refreshSeconds ?? raw?.refresh, 15, 300, base.refreshSeconds),
    stats: parsedStats,
  };
}

export function encodeConfigToParams(config, { obs = false } = {}) {
  const c = sanitizeConfig(config);
  const params = new URLSearchParams();
  if (obs) params.set('obs', '1');
  params.set('account', String(c.accountId));
  params.set('style', c.style);
  params.set('mode', c.gameMode);
  params.set('win', c.statWindow);
  params.set('accent', c.accent);
  params.set('bg', c.bg);
  params.set('alpha', String(c.bgAlpha));
  params.set('text', c.text);
  params.set('label', c.label);
  params.set('gradient', c.gradient ? '1' : '0');
  params.set('blur', String(c.blur));
  params.set('scale', String(c.scale));
  params.set('pos', c.position);
  params.set('rankIcon', c.showRankIcon ? '1' : '0');
  params.set('avatar', c.showAvatar ? '1' : '0');
  params.set('heroImg', c.showHeroPortrait ? '1' : '0');
  params.set('form', c.showRecentForm ? '1' : '0');
  params.set('live', c.showLiveBar ? '1' : '0');
  params.set('footer', c.showFooter ? '1' : '0');
  if (c.footerText !== 'DEADLOCK TRACKER') {
    params.set('brand', c.footerText);
  }
  params.set('refresh', String(c.refreshSeconds));
  params.set('stats', c.stats.join(','));
  return params;
}

export function decodeConfigFromSearch(searchString) {
  const params = new URLSearchParams(searchString);
  const hasOverlayParams = params.has('account') || params.has('style') || params.has('obs');
  if (!hasOverlayParams) return null;

  return sanitizeConfig({
    accountId: params.get('account'),
    style: params.get('style'),
    gameMode: params.get('mode'),
    statWindow: params.get('win'),
    accent: params.get('accent'),
    bg: params.get('bg'),
    bgAlpha: params.get('alpha'),
    text: params.get('text'),
    label: params.get('label'),
    gradient: params.get('gradient'),
    blur: params.get('blur'),
    scale: params.get('scale'),
    position: params.get('pos'),
    showRankIcon: params.get('rankIcon'),
    showAvatar: params.get('avatar'),
    showHeroPortrait: params.get('heroImg'),
    showRecentForm: params.get('form'),
    showLiveBar: params.get('live'),
    showFooter: params.get('footer'),
    footerText: params.get('brand') ?? 'DEADLOCK TRACKER',
    refreshSeconds: params.get('refresh'),
    stats: params.get('stats'),
  });
}

export function saveConfigToStorage(config) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitizeConfig(config)));
  } catch {
    // Ignore storage quota or restricted context
  }
}

export function loadConfigFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return sanitizeConfig(JSON.parse(raw));
  } catch {
    return null;
  }
}
