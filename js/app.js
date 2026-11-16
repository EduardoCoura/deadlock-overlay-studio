import {
  BG_SCENES,
  PALETTE_SWATCHES,
  POSITION_OPTIONS,
  STAT_CATALOG,
  STYLE_PRESETS,
  createDefaultConfig,
  decodeConfigFromSearch,
  encodeConfigToParams,
  getStylePreset,
  loadConfigFromStorage,
  saveConfigToStorage,
} from './config.js';
import {
  computePlayerMetrics,
  fetchPlayerSnapshot,
  getActiveMatchesSample,
  getLeaderboardPlayers,
  getStaticAssets,
  getSteamProfilesBatch,
  parseSteamInput,
  searchSteamPlayers,
} from './deadlock-api.js';
import { getContrastTextColor, renderOverlay, tickLiveClockElements } from './overlay-renderer.js';
import { generateStandaloneObsHtml } from './exporter.js';

const IS_OBS_MODE = new URLSearchParams(window.location.search).get('obs') === '1';

let config = decodeConfigFromSearch(window.location.search) || (!IS_OBS_MODE && loadConfigFromStorage()) || createDefaultConfig('trn-boxed');
let currentSnapshot = null;
let refreshTimer = null;
let toastTimer = null;

function byId(id) {
  return document.getElementById(id);
}

function makeEl(tag, className = '', text = '') {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function showToast(message) {
  const banner = byId('toast-banner');
  if (!banner) return;
  banner.textContent = message;
  banner.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    banner.hidden = true;
  }, 2600);
}

function setStatus(state, text, meta = '') {
  const dot = byId('status-dot');
  const statusText = byId('status-text');
  const statusMeta = byId('status-meta');
  if (!dot || !statusText) return;
  dot.className = `status-dot ${state === 'loading' ? 'is-loading' : state === 'error' ? 'is-error' : ''}`;
  statusText.textContent = text;
  if (statusMeta && meta) statusMeta.textContent = meta;
}

function getAppBaseUrl() {
  const { origin, pathname } = window.location;
  if (pathname.endsWith('/')) return `${origin}${pathname}`;
  if (pathname.endsWith('.html')) {
    return `${origin}${pathname.slice(0, pathname.lastIndexOf('/') + 1)}`;
  }
  return `${origin}${pathname}/`;
}

function buildObsUrl() {
  const base = getAppBaseUrl();
  const params = encodeConfigToParams(config, { obs: true });
  return `${base}?${params.toString()}`;
}

function applySceneBackground() {
  const viewport = byId('stream-viewport');
  if (!viewport) return;
  const scene = BG_SCENES.find((s) => s.id === config.scene) || BG_SCENES[0];
  viewport.dataset.scene = scene.id;
  if (scene.url) {
    viewport.dataset.hasArt = 'true';
    viewport.style.backgroundImage = `url("${scene.url}")`;
  } else {
    viewport.dataset.hasArt = 'false';
    viewport.style.backgroundImage = '';
  }
}

function syncStudioOutputs() {
  const obsUrl = buildObsUrl();
  const previewBox = byId('obs-url-preview');
  const modalBox = byId('obs-modal-url');
  const previewTabLink = byId('btn-modal-preview-tab');
  if (previewBox) previewBox.textContent = obsUrl;
  if (modalBox) modalBox.textContent = obsUrl;
  if (previewTabLink) previewTabLink.href = obsUrl;
}

function renderCurrentOverlay() {
  const anchor = byId('overlay-anchor');
  if (!anchor || !currentSnapshot) return;
  const metrics = computePlayerMetrics(currentSnapshot, config);
  renderOverlay(anchor, config, metrics);

  if (!IS_OBS_MODE) {
    const avatar = byId('sidebar-player-avatar');
    const name = byId('sidebar-player-name');
    const sub = byId('sidebar-player-sub');
    const rank = byId('sidebar-player-rank');
    if (avatar) {
      avatar.src = metrics.avatarUrl || metrics.featuredHero.small || '';
      avatar.alt = metrics.displayName;
    }
    if (name) name.textContent = metrics.displayName;
    if (sub) {
      const modeText = metrics.live?.isActive
        ? `Ao vivo (${metrics.live.heroName})`
        : `ID ${metrics.accountId} • Clique para trocar`;
      sub.textContent = modeText;
    }
    if (rank) {
      rank.src = metrics.rank.imageUrl;
      rank.alt = metrics.rank.fullName;
    }
  }
}

function commitConfig({ save = true } = {}) {
  if (save && !IS_OBS_MODE) {
    saveConfigToStorage(config);
  }
  if (!IS_OBS_MODE) {
    syncStudioOutputs();
    applySceneBackground();
    const accent = config.accent;
    document.documentElement.style.setProperty('--st-accent', accent);
    document.documentElement.style.setProperty('--st-accent-on', getContrastTextColor(accent));
  }
  renderCurrentOverlay();
}

async function loadPlayerData({ forceRefresh = false } = {}) {
  if (!IS_OBS_MODE) {
    setStatus('loading', `Buscando dados da conta ${config.accountId}...`);
  }
  try {
    currentSnapshot = await fetchPlayerSnapshot(config.accountId, { forceRefresh });
    renderCurrentOverlay();

    if (!IS_OBS_MODE) {
      const metrics = computePlayerMetrics(currentSnapshot, config);
      const timeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const liveText = metrics.live && !metrics.live.simulated ? ' • Partida ao vivo detectada!' : '';
      setStatus(
        'ready',
        `Conectado: ${metrics.displayName} (${metrics.rank.fullName})${liveText}`,
        `Sincronizado às ${timeStr} • Auto-refresh ${config.refreshSeconds}s`,
      );
    }
  } catch (err) {
    console.error('[Deadlock Overlay Studio]', err);
    if (!IS_OBS_MODE) {
      setStatus(
        'error',
        err?.message || 'Erro ao carregar dados da Deadlock API.',
        'Tente clicar em Atualizar Dados ou escolher outro jogador',
      );
      if (!currentSnapshot) {
        const name = byId('sidebar-player-name');
        const sub = byId('sidebar-player-sub');
        if (name) name.textContent = 'Erro ao consultar API';
        if (sub) sub.textContent = 'Clique aqui para escolher outro jogador';
      }
    }
  }
}

function scheduleAutoRefresh() {
  clearInterval(refreshTimer);
  const intervalMs = Math.max(15, Number(config.refreshSeconds) || 60) * 1000;
  refreshTimer = setInterval(() => {
    loadPlayerData({ forceRefresh: true });
  }, intervalMs);
}

/* ==========================================================================
   Studio UI Builders & Event Wiring
   ========================================================================== */

function buildStyleCards() {
  const grid = byId('style-grid');
  if (!grid) return;
  const frag = document.createDocumentFragment();

  for (const preset of STYLE_PRESETS) {
    const btn = makeEl('button', 'style-option');
    btn.type = 'button';
    btn.dataset.styleId = preset.id;
    btn.setAttribute('aria-pressed', String(config.style === preset.id));

    const head = makeEl('div', 'style-option-head');
    head.appendChild(makeEl('span', 'style-option-name', preset.name));
    head.appendChild(makeEl('span', 'style-option-badge', preset.badge));
    btn.appendChild(head);
    btn.appendChild(makeEl('p', 'style-option-desc', preset.description));

    btn.addEventListener('click', () => {
      const chosen = getStylePreset(preset.id);
      config = {
        ...config,
        style: chosen.id,
        accent: chosen.defaults.accent,
        bg: chosen.defaults.bg,
        bgAlpha: chosen.defaults.bgAlpha,
        text: chosen.defaults.text,
        label: chosen.defaults.label,
        gradient: chosen.defaults.gradient,
        blur: chosen.defaults.blur,
        position: chosen.defaults.position,
        stats: [...chosen.defaults.stats],
      };
      syncFormControlsFromConfig();
      commitConfig();
    });

    frag.appendChild(btn);
  }
  grid.replaceChildren(frag);
}

function buildPaletteSwatches() {
  const wrap = byId('palette-swatches');
  if (!wrap) return;
  const frag = document.createDocumentFragment();

  for (const sw of PALETTE_SWATCHES) {
    const btn = makeEl('button', 'swatch-btn');
    btn.type = 'button';
    const dot = makeEl('span', 'swatch-dot');
    dot.style.backgroundColor = sw.accent;
    btn.appendChild(dot);
    btn.appendChild(makeEl('span', '', sw.name));

    btn.addEventListener('click', () => {
      config.accent = sw.accent;
      config.label = sw.label;
      config.bg = sw.bg;
      syncFormControlsFromConfig();
      commitConfig();
    });

    frag.appendChild(btn);
  }
  wrap.replaceChildren(frag);
}

function buildStatBuilder() {
  const activeList = byId('active-stats-list');
  const addGrid = byId('catalog-add-grid');
  if (!activeList || !addGrid) return;

  const catalogMap = new Map(STAT_CATALOG.map((s) => [s.id, s]));

  const activeFrag = document.createDocumentFragment();
  config.stats.forEach((statId, idx) => {
    const meta = catalogMap.get(statId);
    if (!meta) return;

    const li = makeEl('li', 'active-stat-item');
    li.appendChild(makeEl('span', '', meta.label));

    const actions = makeEl('div', 'stat-item-actions');
    const upBtn = makeEl('button', 'icon-mini-btn', '↑');
    upBtn.type = 'button';
    upBtn.setAttribute('aria-label', `Mover ${meta.label} para cima`);
    upBtn.disabled = idx === 0;
    upBtn.addEventListener('click', () => {
      if (idx === 0) return;
      const copy = [...config.stats];
      [copy[idx - 1], copy[idx]] = [copy[idx], copy[idx - 1]];
      config.stats = copy;
      buildStatBuilder();
      commitConfig();
    });

    const downBtn = makeEl('button', 'icon-mini-btn', '↓');
    downBtn.type = 'button';
    downBtn.setAttribute('aria-label', `Mover ${meta.label} para baixo`);
    downBtn.disabled = idx === config.stats.length - 1;
    downBtn.addEventListener('click', () => {
      if (idx >= config.stats.length - 1) return;
      const copy = [...config.stats];
      [copy[idx], copy[idx + 1]] = [copy[idx + 1], copy[idx]];
      config.stats = copy;
      buildStatBuilder();
      commitConfig();
    });

    const rmBtn = makeEl('button', 'icon-mini-btn', '✕');
    rmBtn.type = 'button';
    rmBtn.setAttribute('aria-label', `Remover ${meta.label}`);
    rmBtn.disabled = config.stats.length <= 1;
    rmBtn.addEventListener('click', () => {
      if (config.stats.length <= 1) return;
      config.stats = config.stats.filter((id) => id !== statId);
      buildStatBuilder();
      commitConfig();
    });

    actions.appendChild(upBtn);
    actions.appendChild(downBtn);
    actions.appendChild(rmBtn);
    li.appendChild(actions);
    activeFrag.appendChild(li);
  });
  activeList.replaceChildren(activeFrag);

  const addFrag = document.createDocumentFragment();
  const activeSet = new Set(config.stats);
  for (const item of STAT_CATALOG) {
    if (activeSet.has(item.id)) continue;
    const chip = makeEl('button', 'add-stat-chip', `+ ${item.label}`);
    chip.type = 'button';
    chip.disabled = config.stats.length >= 8;
    chip.addEventListener('click', () => {
      if (config.stats.length >= 8) return;
      config.stats = [...config.stats, item.id];
      buildStatBuilder();
      commitConfig();
    });
    addFrag.appendChild(chip);
  }
  addGrid.replaceChildren(addFrag);
}

function buildPositionGrid() {
  const grid = byId('position-grid');
  if (!grid) return;
  const frag = document.createDocumentFragment();

  for (const pos of POSITION_OPTIONS) {
    const btn = makeEl('button', 'pos-btn', pos.label);
    btn.type = 'button';
    btn.dataset.posId = pos.id;
    btn.setAttribute('aria-pressed', String(config.position === pos.id));
    btn.addEventListener('click', () => {
      config.position = pos.id;
      syncFormControlsFromConfig();
      commitConfig();
    });
    frag.appendChild(btn);
  }
  grid.replaceChildren(frag);
}

function buildSceneSelector() {
  const sel = byId('select-scene');
  if (!sel) return;
  const frag = document.createDocumentFragment();
  for (const s of BG_SCENES) {
    const opt = makeEl('option', '', s.label);
    opt.value = s.id;
    frag.appendChild(opt);
  }
  sel.replaceChildren(frag);
  sel.value = config.scene;
  sel.addEventListener('change', () => {
    config.scene = sel.value;
    commitConfig();
  });
}

function syncColorPair(colorId, hexId, key) {
  const colorInput = byId(colorId);
  const hexInput = byId(hexId);
  if (!colorInput || !hexInput) return;

  colorInput.addEventListener('input', () => {
    config[key] = colorInput.value.toLowerCase();
    hexInput.value = config[key];
    commitConfig();
  });

  hexInput.addEventListener('input', () => {
    const val = hexInput.value.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(val)) {
      config[key] = val.toLowerCase();
      colorInput.value = config[key];
      commitConfig();
    }
  });
}

function syncFormControlsFromConfig() {
  // Style & position buttons aria-pressed
  for (const btn of document.querySelectorAll('.style-option')) {
    btn.setAttribute('aria-pressed', String(btn.dataset.styleId === config.style));
  }
  for (const btn of document.querySelectorAll('.pos-btn')) {
    btn.setAttribute('aria-pressed', String(btn.dataset.posId === config.position));
  }

  const pairs = [
    ['color-accent', 'hex-accent', 'accent'],
    ['color-bg', 'hex-bg', 'bg'],
    ['color-text', 'hex-text', 'text'],
    ['color-label', 'hex-label', 'label'],
  ];
  for (const [cId, hId, key] of pairs) {
    if (byId(cId)) byId(cId).value = config[key];
    if (byId(hId)) byId(hId).value = config[key];
  }

  if (byId('range-alpha')) {
    byId('range-alpha').value = String(Math.round(config.bgAlpha * 100));
    byId('val-alpha').textContent = `${Math.round(config.bgAlpha * 100)}%`;
  }
  if (byId('range-blur')) {
    byId('range-blur').value = String(config.blur);
    byId('val-blur').textContent = `${config.blur}px`;
  }
  if (byId('range-scale')) {
    byId('range-scale').value = String(Math.round(config.scale * 100));
    byId('val-scale').textContent = `${Math.round(config.scale * 100)}%`;
  }

  byId('toggle-gradient').checked = config.gradient;
  byId('toggle-rank-icon').checked = config.showRankIcon;
  byId('toggle-avatar').checked = config.showAvatar;
  byId('toggle-hero-portrait').checked = config.showHeroPortrait;
  byId('toggle-recent-form').checked = config.showRecentForm;
  byId('toggle-live-bar').checked = config.showLiveBar;
  byId('toggle-footer').checked = config.showFooter;
  byId('toggle-sim-live').checked = config.simulateLive;
  byId('input-footer-text').value = config.footerText;

  byId('select-game-mode').value = config.gameMode;
  byId('select-stat-window').value = config.statWindow;
  byId('select-refresh').value = String(config.refreshSeconds);
  byId('select-scene').value = config.scene;

  buildStatBuilder();
}

function wireStudioTabs() {
  const tabs = [...document.querySelectorAll('.sidebar-tabs [role="tab"]')];
  const panels = [...document.querySelectorAll('.sidebar-scroll [role="tabpanel"]')];

  for (const tab of tabs) {
    tab.addEventListener('click', () => {
      const targetKey = tab.dataset.tab;
      for (const t of tabs) {
        t.setAttribute('aria-selected', String(t === tab));
      }
      for (const p of panels) {
        p.hidden = p.id !== `panel-${targetKey}`;
      }
    });
  }
}

function wireDialogFallbacks() {
  const dialogs = [...document.querySelectorAll('dialog.studio-dialog')];
  const supportsClosedBy = 'closedBy' in HTMLDialogElement.prototype;

  for (const dialog of dialogs) {
    dialog.addEventListener('close', () => {
      dialog.returnValue = '';
    });

    if (!supportsClosedBy) {
      let pressedOutside = false;
      const isOutside = (e) => {
        const r = dialog.getBoundingClientRect();
        return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
      };
      dialog.addEventListener('pointerdown', (e) => {
        pressedOutside = isOutside(e);
      });
      dialog.addEventListener('pointerup', (e) => {
        if (pressedOutside && isOutside(e)) dialog.close();
      });
    }
  }
}

async function copyObsUrlToClipboard() {
  const url = buildObsUrl();
  try {
    await navigator.clipboard.writeText(url);
    showToast('URL do OBS copiada para a área de transferência!');
  } catch {
    const temp = document.createElement('textarea');
    temp.value = url;
    document.body.appendChild(temp);
    temp.select();
    document.execCommand('copy');
    temp.remove();
    showToast('URL do OBS copiada!');
  }
}

async function downloadObsHtmlFile() {
  try {
    showToast('Gerando arquivo HTML standalone...');
    const html = await generateStandaloneObsHtml(config);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deadlock-overlay-${config.style}-${config.accountId}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('Arquivo HTML para OBS baixado!');
  } catch (err) {
    console.error(err);
    showToast('Erro ao gerar HTML standalone.');
  }
}

/* ==========================================================================
   Player Search Modal Logic
   ========================================================================== */

function selectAccountAndClose(accountId) {
  config.accountId = accountId;
  commitConfig();
  byId('player-dialog').close();
  loadPlayerData({ forceRefresh: true });
}

function renderPlayerResults(items) {
  const list = byId('player-search-results');
  if (!list) return;
  const frag = document.createDocumentFragment();

  for (const item of items) {
    const li = makeEl('li');
    const btn = makeEl('button', 'player-result-btn');
    btn.type = 'button';

    if (item.avatar) {
      const img = makeEl('img', 'player-card-avatar');
      img.src = item.avatar;
      img.alt = '';
      btn.appendChild(img);
    }

    const meta = makeEl('div', 'player-card-meta');
    meta.appendChild(makeEl('div', 'player-card-name', item.name));
    meta.appendChild(makeEl('div', 'player-card-sub', item.sub));
    btn.appendChild(meta);

    if (item.badge) {
      btn.appendChild(makeEl('span', 'style-option-badge', item.badge));
    }

    btn.addEventListener('click', () => selectAccountAndClose(item.accountId));
    li.appendChild(btn);
    frag.appendChild(li);
  }
  list.replaceChildren(frag);
}

async function handleSteamSearchSubmit(raw) {
  const statusEl = byId('player-search-status');
  const parsed = parseSteamInput(raw);
  if (!parsed) return;

  if (parsed.type === 'accountId') {
    selectAccountAndClose(parsed.accountId);
    return;
  }

  statusEl.textContent = `Buscando "${parsed.query}" na Steam...`;
  try {
    const profiles = await searchSteamPlayers(parsed.query);
    if (profiles.length === 0) {
      statusEl.textContent = 'Nenhum perfil encontrado. Tente usar o SteamID3 ou SteamID64 direto.';
      renderPlayerResults([]);
      return;
    }
    statusEl.textContent = `${profiles.length} perfil(is) encontrados:`;
    renderPlayerResults(
      profiles.map((p) => ({
        accountId: p.account_id,
        name: p.personaname || `Jogador #${p.account_id}`,
        avatar: p.avatarmedium || p.avatar || '',
        sub: `SteamID3: ${p.account_id} • ${p.matches_played_last_30d || 0} partidas (30d)`,
        badge: 'Selecionar',
      })),
    );
  } catch (err) {
    statusEl.textContent = err?.message || 'Erro ao buscar jogador.';
  }
}

async function loadLeaderboardRegion(region, label) {
  const statusEl = byId('player-search-status');
  statusEl.textContent = `Carregando Top ${label}...`;
  try {
    const [entries, assets] = await Promise.all([getLeaderboardPlayers(region), getStaticAssets()]);
    const filtered = entries.filter((e) => Array.isArray(e.possible_account_ids) && e.possible_account_ids.length > 0);
    statusEl.textContent = `Top jogadores — ${label}:`;
    renderPlayerResults(
      filtered.map((e) => {
        const heroes = (e.top_hero_ids || [])
          .map((hid) => assets.heroesById.get(hid)?.name)
          .filter(Boolean)
          .join(', ');
        return {
          accountId: e.possible_account_ids[0],
          name: `#${e.rank} ${e.account_name}`,
          avatar: e.top_hero_ids?.[0] ? assets.heroesById.get(e.top_hero_ids[0])?.images?.icon_image_small_webp || '' : '',
          sub: `ID ${e.possible_account_ids[0]}${heroes ? ` • ${heroes}` : ''}`,
          badge: `Rank #${e.rank}`,
        };
      }),
    );
  } catch (err) {
    statusEl.textContent = err?.message || 'Falha ao carregar leaderboard.';
  }
}

async function loadLiveActivePlayers() {
  const statusEl = byId('player-search-status');
  statusEl.textContent = 'Buscando partidas ao vivo no servidor agora...';
  try {
    const [matches, assets] = await Promise.all([getActiveMatchesSample(), getStaticAssets()]);
    const candidates = [];
    for (const m of matches) {
      const p = (m.players || []).find((pl) => pl.account_id > 0);
      if (p) candidates.push({ match: m, player: p });
    }

    const steamMap = await getSteamProfilesBatch(candidates.map((c) => c.player.account_id));

    const items = candidates.map(({ match: m, player: p }) => {
      const hero = assets.heroesById.get(p.hero_id);
      const profile = steamMap.get(p.account_id);
      const mins = m.start_time ? Math.max(0, Math.floor((Date.now() / 1000 - m.start_time) / 60)) : 0;
      const isBrawl = m.game_mode === 4;
      const t0 = Array.isArray(m.team_stats) ? m.team_stats.find((t) => t.team === 0) : null;
      const t1 = Array.isArray(m.team_stats) ? m.team_stats.find((t) => t.team === 1) : null;
      const modeTag = isBrawl && typeof t0?.brawl_score === 'number' && typeof t1?.brawl_score === 'number'
        ? `Street Brawl ${t0.brawl_score}×${t1.brawl_score}`
        : m.match_mode === 4
          ? 'Ranked'
          : 'Normal';

      return {
        accountId: p.account_id,
        name: profile?.personaname || `Jogador #${p.account_id}`,
        avatar: profile?.avatarmedium || hero?.images?.icon_image_small_webp || '',
        sub: `${hero?.name || 'Herói'} • ${modeTag} • ${mins} min • Partida #${m.match_id}`,
        badge: 'AO VIVO',
      };
    });

    statusEl.textContent = `${items.length} jogadores em partida agora (Top 200 da aba Assistir):`;
    renderPlayerResults(items);
  } catch (err) {
    statusEl.textContent = err?.message || 'Erro ao buscar partidas ao vivo.';
  }
}

function wireStudioEvents() {
  wireStudioTabs();
  wireDialogFallbacks();

  syncColorPair('color-accent', 'hex-accent', 'accent');
  syncColorPair('color-bg', 'hex-bg', 'bg');
  syncColorPair('color-text', 'hex-text', 'text');
  syncColorPair('color-label', 'hex-label', 'label');

  byId('range-alpha').addEventListener('input', (e) => {
    const pct = Number(e.target.value);
    config.bgAlpha = pct / 100;
    byId('val-alpha').textContent = `${pct}%`;
    commitConfig();
  });
  byId('range-blur').addEventListener('input', (e) => {
    config.blur = Number(e.target.value);
    byId('val-blur').textContent = `${config.blur}px`;
    commitConfig();
  });
  byId('range-scale').addEventListener('input', (e) => {
    const pct = Number(e.target.value);
    config.scale = pct / 100;
    byId('val-scale').textContent = `${pct}%`;
    commitConfig();
  });

  const toggleBindings = [
    ['toggle-gradient', 'gradient'],
    ['toggle-rank-icon', 'showRankIcon'],
    ['toggle-avatar', 'showAvatar'],
    ['toggle-hero-portrait', 'showHeroPortrait'],
    ['toggle-recent-form', 'showRecentForm'],
    ['toggle-live-bar', 'showLiveBar'],
    ['toggle-footer', 'showFooter'],
    ['toggle-sim-live', 'simulateLive'],
  ];
  for (const [id, key] of toggleBindings) {
    byId(id).addEventListener('change', (e) => {
      config[key] = e.target.checked;
      commitConfig();
    });
  }

  byId('input-footer-text').addEventListener('input', (e) => {
    config.footerText = e.target.value;
    commitConfig();
  });

  byId('select-game-mode').addEventListener('change', (e) => {
    config.gameMode = e.target.value;
    commitConfig();
  });
  byId('select-stat-window').addEventListener('change', (e) => {
    config.statWindow = e.target.value;
    commitConfig();
  });
  byId('select-refresh').addEventListener('change', (e) => {
    config.refreshSeconds = Number(e.target.value);
    commitConfig();
    scheduleAutoRefresh();
  });

  byId('toggle-safezone').addEventListener('change', (e) => {
    byId('stream-viewport').dataset.safezone = String(e.target.checked);
  });

  byId('btn-reset-style').addEventListener('click', () => {
    const preset = getStylePreset(config.style);
    config = {
      ...config,
      accent: preset.defaults.accent,
      bg: preset.defaults.bg,
      bgAlpha: preset.defaults.bgAlpha,
      text: preset.defaults.text,
      label: preset.defaults.label,
      gradient: preset.defaults.gradient,
      blur: preset.defaults.blur,
      scale: 1,
      position: preset.defaults.position,
      stats: [...preset.defaults.stats],
    };
    syncFormControlsFromConfig();
    commitConfig();
    showToast(`Estilo "${preset.name}" restaurado!`);
  });

  byId('btn-refresh-data').addEventListener('click', () => loadPlayerData({ forceRefresh: true }));
  byId('btn-copy-obs-url').addEventListener('click', copyObsUrlToClipboard);
  byId('btn-copy-obs-inline').addEventListener('click', copyObsUrlToClipboard);
  byId('btn-modal-copy-url').addEventListener('click', copyObsUrlToClipboard);
  byId('btn-download-obs-html').addEventListener('click', downloadObsHtmlFile);
  byId('btn-modal-download-html').addEventListener('click', downloadObsHtmlFile);

  const playerDialog = byId('player-dialog');
  byId('btn-open-player-modal').addEventListener('click', () => {
    playerDialog.showModal();
    if (byId('player-search-results').childElementCount === 0) {
      loadLeaderboardRegion('SAmerica', 'América do Sul');
    }
  });
  byId('btn-close-player-dialog').addEventListener('click', () => playerDialog.close());

  byId('player-search-form').addEventListener('submit', (e) => {
    e.preventDefault();
    handleSteamSearchSubmit(byId('player-search-input').value);
  });
  byId('btn-load-sa').addEventListener('click', () => loadLeaderboardRegion('SAmerica', 'América do Sul'));
  byId('btn-load-na').addEventListener('click', () => loadLeaderboardRegion('NAmerica', 'América do Norte'));
  byId('btn-load-eu').addEventListener('click', () => loadLeaderboardRegion('Europe', 'Europa'));
  byId('btn-load-live').addEventListener('click', loadLiveActivePlayers);

  const obsDialog = byId('obs-dialog');
  byId('btn-open-obs-modal').addEventListener('click', () => obsDialog.showModal());
  byId('btn-sidebar-export').addEventListener('click', () => obsDialog.showModal());
  byId('btn-close-obs-dialog').addEventListener('click', () => obsDialog.close());
}

/* ==========================================================================
   Bootstrap
   ========================================================================== */

let liveClockTimer = null;

function startLiveClock() {
  clearInterval(liveClockTimer);
  liveClockTimer = setInterval(() => {
    tickLiveClockElements(document);
  }, 1000);
}

async function init() {
  startLiveClock();

  if (IS_OBS_MODE) {
    document.documentElement.dataset.obs = 'true';
    const viewport = byId('stream-viewport');
    if (viewport) {
      viewport.removeAttribute('data-scene');
      viewport.removeAttribute('data-has-art');
      viewport.style.backgroundImage = '';
    }
    await loadPlayerData({ forceRefresh: false });
    scheduleAutoRefresh();
    return;
  }

  buildStyleCards();
  buildPaletteSwatches();
  buildPositionGrid();
  buildSceneSelector();
  syncFormControlsFromConfig();
  wireStudioEvents();
  commitConfig({ save: false });

  await loadPlayerData({ forceRefresh: false });
  scheduleAutoRefresh();
}

init();
