import { STAT_CATALOG, getStylePreset } from './config.js';

const STAT_META_MAP = new Map(STAT_CATALOG.map((s) => [s.id, s]));

const ICON_PATHS = {
  crown: 'M3 18h18v2H3v-2zm0-2l2-9 4.5 4L12 5l2.5 6L19 7l2 9H3z',
  skull: 'M12 2a8 8 0 0 0-8 8c0 2.7 1.3 5.1 3.4 6.5V19a1 1 0 0 0 1 1h7.2a1 1 0 0 0 1-1v-2.5A7.9 7.9 0 0 0 20 10a8 8 0 0 0-8-8zm-3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm6 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z',
  crosshair: 'M11 2h2v3.1A7 7 0 0 1 18.9 11H22v2h-3.1A7 7 0 0 1 13 18.9V22h-2v-3.1A7 7 0 0 1 5.1 13H2v-2h3.1A7 7 0 0 1 11 5.1V2zm1 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 3a2 2 0 1 1 0 4 2 2 0 0 1 0-4z',
  trophy: 'M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z',
  shield: 'M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3z',
  soul: 'M12 2c2.5 3.6 6 6.7 6 11a6 6 0 1 1-12 0c0-4.3 3.5-7.4 6-11zm0 15a2.5 2.5 0 0 0 2.5-2.5c0-1.4-1.2-2.7-2.5-4.3-1.3 1.6-2.5 2.9-2.5 4.3A2.5 2.5 0 0 0 12 17z',
  flame: 'M13.5 2.2s.7 2.6.7 4.8c0 2-1.3 3.7-3.3 3.7-2 0-3.4-1.6-3.4-3.7l.1-.4C5.4 9 4 12.2 4 15.2 4 19.5 7.6 22 12 22s8-2.5 8-6.8c0-4.7-3.6-9.2-6.5-13z',
  target: 'M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 16a6 6 0 1 1 6-6 6 6 0 0 1-6 6zm0-9a3 3 0 1 0 3 3 3 3 0 0 0-3-3z',
  pulse: 'M3 12h4l2.5-7 5 14 2.5-7H21v2h-2.6l-3.9 9.5L9.5 9.5 8.4 14H3v-2z',
  star: 'M12 2l2.9 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 7.1-1.01L12 2z',
  clock: 'M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 10.4l3.5 2.1-1 1.7L11 13.5V7h2v5.4z',
};

function el(tag, className = '', children = []) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (typeof children === 'string') {
    node.textContent = children;
  } else if (Array.isArray(children)) {
    for (const child of children) {
      if (child) node.appendChild(child);
    }
  } else if (children instanceof Node) {
    node.appendChild(children);
  }
  return node;
}

function makeIcon(iconKey, className = 'ov-svg-icon') {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', className);
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('fill', 'currentColor');
  path.setAttribute('d', ICON_PATHS[iconKey] || ICON_PATHS.star);
  svg.appendChild(path);
  return svg;
}

function makeImg(src, alt, className, fallbackSrc = '') {
  const img = document.createElement('img');
  img.className = className;
  img.alt = alt;
  img.decoding = 'async';
  img.loading = 'eager';
  img.src = src;
  if (fallbackSrc) {
    img.addEventListener('error', () => {
      if (img.dataset.fallbackUsed) return;
      img.dataset.fallbackUsed = '1';
      img.src = fallbackSrc;
    });
  }
  return img;
}

function hexToRgbTuple(hex) {
  const clean = (hex || '#0b0e14').replace('#', '');
  const num = Number.parseInt(clean, 16);
  if (!Number.isFinite(num)) return [11, 14, 20];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

export function getContrastTextColor(hex) {
  const [r, g, b] = hexToRgbTuple(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.36 ? '#0b0e14' : '#ffffff';
}

function makeRankImg(metrics, className = 'ov-rank-img') {
  return makeImg(metrics.rank.imageUrl, `Rank ${metrics.rank.fullName}`, className);
}

function makeDeltaBadge(rank) {
  if (rank.calibrationRemaining > 0) {
    return el('span', 'ov-delta ov-delta--neutral', `CALIBRAÇÃO (${rank.calibrationRemaining})`);
  }
  if (typeof rank.delta !== 'number' || rank.delta === 0) return null;
  const sign = rank.delta > 0 ? '+' : '';
  const cls = rank.delta > 0 ? 'ov-delta ov-delta--pos' : 'ov-delta ov-delta--neg';
  return el('span', cls, `${sign}${rank.delta} pts`);
}

function makeFormPills(recentForm, compact = false) {
  if (!recentForm || recentForm.length === 0) return null;
  const wrap = el('div', compact ? 'ov-form ov-form--compact' : 'ov-form');
  wrap.setAttribute('aria-label', 'Últimas partidas');
  for (const item of recentForm) {
    const pill = el('span', `ov-form-dot ${item.won ? 'is-win' : 'is-loss'}`, compact ? '' : item.won ? 'V' : 'D');
    pill.title = `${item.heroName} (${item.kills}/${item.deaths}/${item.assists})`;
    wrap.appendChild(pill);
  }
  return wrap;
}

function makeLiveBanner(live, compact = false) {
  if (!live || !live.isActive) return null;
  const bar = el('div', `ov-live-bar ${live.teamIdx === 1 ? 'is-sapphire' : 'is-amber'} ${compact ? 'is-compact' : ''}`);
  const dot = el('span', 'ov-live-dot');
  dot.setAttribute('aria-hidden', 'true');
  bar.appendChild(dot);
  bar.appendChild(el('span', 'ov-live-tag', live.simulated ? 'PREVIEW AO VIVO' : 'AO VIVO'));
  bar.appendChild(el('span', 'ov-live-sep', '•'));
  bar.appendChild(el('span', 'ov-live-hero', live.heroName));
  bar.appendChild(el('span', 'ov-live-sep', '•'));
  bar.appendChild(el('span', 'ov-live-team', live.teamName));
  bar.appendChild(el('span', 'ov-live-time', live.elapsedLabel));
  return bar;
}

function getSelectedStatItems(config, metrics, limit = 8) {
  return config.stats.slice(0, limit).map((statId) => {
    const meta = STAT_META_MAP.get(statId) || { id: statId, label: statId, shortLabel: statId, icon: 'star' };
    const data = metrics.statValues[statId] || { value: '—', sub: '' };
    return { id: statId, meta, data };
  });
}

function buildStatTile(item, { showSub = false, showIcon = false, tileClass = 'ov-stat-tile' } = {}) {
  const tile = el('div', tileClass);
  const head = el('div', 'ov-stat-label');
  if (showIcon) head.appendChild(makeIcon(item.meta.icon, 'ov-stat-icon'));
  head.appendChild(el('span', '', item.meta.shortLabel));
  tile.appendChild(head);
  tile.appendChild(el('div', 'ov-stat-value', item.data.value));
  if (showSub && item.data.sub) {
    tile.appendChild(el('div', 'ov-stat-sub', item.data.sub));
  }
  return tile;
}

/* ============================================================================
   8 OVERLAY RENDERERS (4 TRACKER.GG STYLES + 4 DEADLOCK / EXTRA STYLES)
   ============================================================================ */

function renderTrnBoxed(config, metrics) {
  const root = el('div', 'ov-widget ov-trn-boxed');
  const items = getSelectedStatItems(config, metrics, 6);
  const splitAt = Math.ceil(items.length / 2);
  const leftItems = items.slice(0, splitAt);
  const rightItems = items.slice(splitAt);

  const row = el('div', 'ov-boxed-row');

  if (leftItems.length > 0) {
    const leftGroup = el('div', 'ov-boxed-group');
    for (const item of leftItems) leftGroup.appendChild(buildStatTile(item, { tileClass: 'ov-boxed-tile' }));
    row.appendChild(leftGroup);
  }

  const center = el('div', 'ov-boxed-center');
  if (config.showRankIcon) {
    center.appendChild(makeRankImg(metrics, 'ov-boxed-rank-img'));
  } else if (config.showAvatar && metrics.avatarUrl) {
    center.appendChild(makeImg(metrics.avatarUrl, metrics.displayName, 'ov-boxed-avatar'));
  }

  const centerMeta = el('div', 'ov-boxed-center-meta');
  const brandPill = el('div', 'ov-boxed-brand');
  brandPill.appendChild(el('span', 'ov-boxed-trn', 'DLK'));
  brandPill.appendChild(el('span', 'ov-boxed-title', config.showFooter ? (config.footerText || 'DEADLOCK TRACKER') : metrics.displayName));
  centerMeta.appendChild(brandPill);

  const rankLine = el('div', 'ov-boxed-rank-line');
  rankLine.appendChild(el('span', 'ov-boxed-rank-name', metrics.rank.fullName));
  const delta = makeDeltaBadge(metrics.rank);
  if (delta) rankLine.appendChild(delta);
  centerMeta.appendChild(rankLine);

  if (config.showRecentForm && metrics.recentForm.length > 0) {
    centerMeta.appendChild(makeFormPills(metrics.recentForm, true));
  }
  center.appendChild(centerMeta);
  row.appendChild(center);

  if (rightItems.length > 0) {
    const rightGroup = el('div', 'ov-boxed-group');
    for (const item of rightItems) rightGroup.appendChild(buildStatTile(item, { tileClass: 'ov-boxed-tile' }));
    row.appendChild(rightGroup);
  }

  root.appendChild(row);

  if (config.showLiveBar && metrics.live?.isActive) {
    root.appendChild(makeLiveBanner(metrics.live, true));
  }
  return root;
}

function renderTrnAngled(config, metrics) {
  const root = el('div', 'ov-widget ov-trn-angled');

  // Top chevron + 11 Deadlock tier progression ticks (Apex Rank Score style)
  const ticksRow = el('div', 'ov-angled-ticks');
  ticksRow.appendChild(el('span', 'ov-angled-chevron', '>'));
  for (let i = 1; i <= 11; i += 1) {
    const tick = el('span', `ov-angled-tick ${i <= metrics.rank.tier ? 'is-filled' : ''}`);
    ticksRow.appendChild(tick);
  }
  if (config.showRecentForm && metrics.recentForm.length > 0) {
    ticksRow.appendChild(makeFormPills(metrics.recentForm, true));
  }
  root.appendChild(ticksRow);

  const shell = el('div', 'ov-angled-shell');
  const badgeTab = el('div', 'ov-angled-tab');
  const badgeTabInner = el('div', 'ov-angled-unskew ov-angled-tab-inner');
  if (config.showRankIcon) {
    badgeTabInner.appendChild(makeRankImg(metrics, 'ov-angled-rank-img'));
  }
  const idStack = el('div', 'ov-angled-id');
  idStack.appendChild(el('span', 'ov-angled-player', metrics.displayName));
  idStack.appendChild(el('span', 'ov-angled-tier', metrics.rank.fullName));
  badgeTabInner.appendChild(idStack);
  badgeTab.appendChild(badgeTabInner);
  shell.appendChild(badgeTab);

  const statsContainer = el('div', 'ov-angled-stats');
  const items = getSelectedStatItems(config, metrics, 5);
  for (const item of items) {
    const tile = buildStatTile(item, { tileClass: 'ov-angled-tile' });
    const unskew = el('div', 'ov-angled-unskew');
    while (tile.firstChild) unskew.appendChild(tile.firstChild);
    tile.appendChild(unskew);
    statsContainer.appendChild(tile);
  }
  shell.appendChild(statsContainer);
  root.appendChild(shell);

  const bottomStrip = el('div', 'ov-angled-bottom');
  if (config.showFooter) {
    bottomStrip.appendChild(el('div', 'ov-angled-footer-pill', el('span', 'ov-angled-unskew', config.footerText || 'DEADLOCK TRACKER')));
  }
  if (config.showLiveBar && metrics.live?.isActive) {
    bottomStrip.appendChild(makeLiveBanner(metrics.live, true));
  }
  if (bottomStrip.childNodes.length > 0) root.appendChild(bottomStrip);

  return root;
}

function renderTrnGlass(config, metrics) {
  const root = el('div', 'ov-widget ov-trn-glass');
  const mainRow = el('div', 'ov-glass-row');

  const rankCluster = el('div', 'ov-glass-identity');
  if (config.showRankIcon) {
    rankCluster.appendChild(makeRankImg(metrics, 'ov-glass-rank-img'));
  } else if (config.showAvatar && metrics.avatarUrl) {
    rankCluster.appendChild(makeImg(metrics.avatarUrl, metrics.displayName, 'ov-glass-avatar'));
  }

  const meta = el('div', 'ov-glass-meta');
  const topLine = el('div', 'ov-glass-topline');
  if (config.showAvatar && config.showRankIcon && metrics.avatarUrl) {
    topLine.appendChild(makeImg(metrics.avatarUrl, '', 'ov-glass-mini-avatar'));
  }
  topLine.appendChild(el('span', 'ov-glass-player', metrics.displayName));
  meta.appendChild(topLine);

  const rankRow = el('div', 'ov-glass-rankrow');
  rankRow.appendChild(el('span', 'ov-glass-rank', metrics.rank.fullName));
  const delta = makeDeltaBadge(metrics.rank);
  if (delta) rankRow.appendChild(delta);
  meta.appendChild(rankRow);
  rankCluster.appendChild(meta);
  mainRow.appendChild(rankCluster);

  mainRow.appendChild(el('div', 'ov-glass-divider'));

  const statsGrid = el('div', 'ov-glass-stats');
  for (const item of getSelectedStatItems(config, metrics, 5)) {
    statsGrid.appendChild(buildStatTile(item, { showSub: true, tileClass: 'ov-glass-stat' }));
  }
  mainRow.appendChild(statsGrid);
  root.appendChild(mainRow);

  if ((config.showRecentForm && metrics.recentForm.length > 0) || (config.showLiveBar && metrics.live?.isActive) || config.showFooter) {
    const footer = el('div', 'ov-glass-footer');
    if (config.showRecentForm && metrics.recentForm.length > 0) {
      const formWrap = el('div', 'ov-glass-form-wrap');
      formWrap.appendChild(el('span', 'ov-glass-form-label', 'RECENTES'));
      formWrap.appendChild(makeFormPills(metrics.recentForm, false));
      footer.appendChild(formWrap);
    }
    if (config.showLiveBar && metrics.live?.isActive) {
      footer.appendChild(makeLiveBanner(metrics.live, true));
    }
    if (config.showFooter) {
      footer.appendChild(el('span', 'ov-glass-brand', config.footerText || 'DEADLOCK TRACKER'));
    }
    root.appendChild(footer);
  }

  return root;
}

function renderTrnCard(config, metrics) {
  const root = el('div', 'ov-widget ov-trn-card');

  const header = el('div', 'ov-card-header');
  header.appendChild(el('span', 'ov-card-header-title', config.statWindow === 'session12h' ? 'SESSÃO ATUAL' : 'LIFETIME STATS'));
  header.appendChild(el('span', 'ov-card-header-tag', 'DEADLOCK'));
  root.appendChild(header);

  const profileRow = el('div', 'ov-card-profile');
  if (config.showAvatar && metrics.avatarUrl) {
    profileRow.appendChild(makeImg(metrics.avatarUrl, metrics.displayName, 'ov-card-avatar'));
  }
  const nameCol = el('div', 'ov-card-profile-text');
  nameCol.appendChild(el('div', 'ov-card-player', metrics.displayName));
  const rankSub = el('div', 'ov-card-rank-sub');
  rankSub.appendChild(el('span', '', metrics.rank.fullName));
  const delta = makeDeltaBadge(metrics.rank);
  if (delta) rankSub.appendChild(delta);
  nameCol.appendChild(rankSub);
  profileRow.appendChild(nameCol);
  if (config.showRankIcon) {
    profileRow.appendChild(makeRankImg(metrics, 'ov-card-rank-img'));
  }
  root.appendChild(profileRow);

  const list = el('div', 'ov-card-rows');
  for (const item of getSelectedStatItems(config, metrics, 7)) {
    const row = el('div', 'ov-card-row');
    const left = el('div', 'ov-card-row-left');
    left.appendChild(makeIcon(item.meta.icon, 'ov-card-icon'));
    left.appendChild(el('span', 'ov-card-row-label', item.meta.shortLabel));
    row.appendChild(left);
    row.appendChild(el('span', 'ov-card-row-value', item.data.value));
    list.appendChild(row);
  }
  root.appendChild(list);

  if (config.showRecentForm && metrics.recentForm.length > 0) {
    const formRow = el('div', 'ov-card-form-row');
    formRow.appendChild(el('span', 'ov-card-row-label', 'FORMA'));
    formRow.appendChild(makeFormPills(metrics.recentForm, false));
    root.appendChild(formRow);
  }

  if (config.showLiveBar && metrics.live?.isActive) {
    root.appendChild(makeLiveBanner(metrics.live, true));
  }

  if (config.showFooter) {
    root.appendChild(el('div', 'ov-card-footer', config.footerText || 'DEADLOCKTRACKER'));
  }

  return root;
}

function renderDlkOccult(config, metrics) {
  const root = el('div', 'ov-widget ov-dlk-occult');
  const inner = el('div', 'ov-occult-inner');

  const top = el('div', 'ov-occult-head');
  if (config.showHeroPortrait && metrics.featuredHero.small) {
    top.appendChild(makeImg(metrics.featuredHero.small, metrics.featuredHero.name, 'ov-occult-hero-seal'));
  } else if (config.showAvatar && metrics.avatarUrl) {
    top.appendChild(makeImg(metrics.avatarUrl, metrics.displayName, 'ov-occult-hero-seal'));
  }

  const titleWrap = el('div', 'ov-occult-titles');
  titleWrap.appendChild(el('div', 'ov-occult-kicker', 'THE CURSED APPLE • DOSSIÊ'));
  titleWrap.appendChild(el('div', 'ov-occult-player', metrics.displayName));
  top.appendChild(titleWrap);

  const rankSeal = el('div', 'ov-occult-rank-seal');
  if (config.showRankIcon) rankSeal.appendChild(makeRankImg(metrics, 'ov-occult-rank-img'));
  const rankMeta = el('div', 'ov-occult-rank-meta');
  rankMeta.appendChild(el('span', 'ov-occult-rank-name', metrics.rank.fullName));
  const delta = makeDeltaBadge(metrics.rank);
  if (delta) rankMeta.appendChild(delta);
  rankSeal.appendChild(rankMeta);
  top.appendChild(rankSeal);
  inner.appendChild(top);

  const divider = el('div', 'ov-occult-divider');
  divider.appendChild(el('span', 'ov-occult-diamond', '◆'));
  inner.appendChild(divider);

  const statsRow = el('div', 'ov-occult-stats');
  for (const item of getSelectedStatItems(config, metrics, 5)) {
    statsRow.appendChild(buildStatTile(item, { showSub: true, tileClass: 'ov-occult-stat' }));
  }
  inner.appendChild(statsRow);

  if ((config.showRecentForm && metrics.recentForm.length > 0) || (config.showLiveBar && metrics.live?.isActive) || config.showFooter) {
    const bottom = el('div', 'ov-occult-bottom');
    if (config.showRecentForm && metrics.recentForm.length > 0) {
      bottom.appendChild(makeFormPills(metrics.recentForm, false));
    }
    if (config.showLiveBar && metrics.live?.isActive) {
      bottom.appendChild(makeLiveBanner(metrics.live, true));
    }
    if (config.showFooter) {
      bottom.appendChild(el('span', 'ov-occult-brand', config.footerText || 'DEADLOCK TRACKER'));
    }
    inner.appendChild(bottom);
  }

  root.appendChild(inner);
  return root;
}

function renderDlkAmberSapphire(config, metrics) {
  const root = el('div', 'ov-widget ov-dlk-factions');

  const factionHeader = el('div', 'ov-factions-bar');
  const amberSide = el('div', 'ov-faction-pill is-amber');
  if (config.showAvatar && metrics.avatarUrl) {
    amberSide.appendChild(makeImg(metrics.avatarUrl, metrics.displayName, 'ov-faction-avatar'));
  }
  amberSide.appendChild(el('span', 'ov-faction-player', metrics.displayName));
  factionHeader.appendChild(amberSide);

  const midBadge = el('div', 'ov-faction-vs');
  if (config.showRankIcon) midBadge.appendChild(makeRankImg(metrics, 'ov-faction-rank-img'));
  midBadge.appendChild(el('span', 'ov-faction-rank-name', metrics.rank.fullName));
  const delta = makeDeltaBadge(metrics.rank);
  if (delta) midBadge.appendChild(delta);
  factionHeader.appendChild(midBadge);

  const sapphireSide = el('div', 'ov-faction-pill is-sapphire');
  if (config.showHeroPortrait && metrics.featuredHero.small) {
    sapphireSide.appendChild(makeImg(metrics.featuredHero.small, metrics.featuredHero.name, 'ov-faction-hero-img'));
  }
  sapphireSide.appendChild(el('span', 'ov-faction-hero-name', metrics.live?.isActive ? `EM JOGO: ${metrics.live.heroName}` : `MAIN: ${metrics.featuredHero.name}`));
  factionHeader.appendChild(sapphireSide);
  root.appendChild(factionHeader);

  if (config.showLiveBar && metrics.live?.isActive) {
    const total = Math.max(1, metrics.live.amberSouls + metrics.live.sapphireSouls);
    const amberPct = Math.round((metrics.live.amberSouls / total) * 100);
    const liveRow = el('div', 'ov-faction-live');
    liveRow.appendChild(el('span', 'ov-faction-souls is-amber', `AMBER ${(metrics.live.amberSouls / 1000).toFixed(1)}k`));
    const meter = el('div', 'ov-faction-meter');
    const fill = el('div', 'ov-faction-meter-amber');
    fill.style.width = `${amberPct}%`;
    meter.appendChild(fill);
    liveRow.appendChild(meter);
    liveRow.appendChild(el('span', 'ov-faction-souls is-sapphire', `${(metrics.live.sapphireSouls / 1000).toFixed(1)}k SAPPHIRE`));
    liveRow.appendChild(el('span', 'ov-faction-clock', metrics.live.elapsedLabel));
    root.appendChild(liveRow);
  }

  const statsRow = el('div', 'ov-factions-stats');
  for (const item of getSelectedStatItems(config, metrics, 5)) {
    statsRow.appendChild(buildStatTile(item, { showSub: true, tileClass: 'ov-faction-stat' }));
  }
  root.appendChild(statsRow);

  if ((config.showRecentForm && metrics.recentForm.length > 0) || config.showFooter) {
    const foot = el('div', 'ov-factions-footer');
    if (config.showRecentForm && metrics.recentForm.length > 0) {
      foot.appendChild(makeFormPills(metrics.recentForm, false));
    }
    if (config.showFooter) {
      foot.appendChild(el('span', 'ov-factions-brand', config.footerText || 'DEADLOCK TRACKER'));
    }
    root.appendChild(foot);
  }

  return root;
}

function renderDlkHeroSpotlight(config, metrics) {
  const root = el('div', 'ov-widget ov-dlk-spotlight');

  if (config.showHeroPortrait && (metrics.featuredHero.portrait || metrics.featuredHero.vertical)) {
    const artWrap = el('div', 'ov-spotlight-art');
    artWrap.appendChild(makeImg(metrics.featuredHero.portrait || metrics.featuredHero.vertical, metrics.featuredHero.name, 'ov-spotlight-portrait'));
    root.appendChild(artWrap);
  }

  const content = el('div', 'ov-spotlight-content');
  const head = el('div', 'ov-spotlight-head');

  const left = el('div', 'ov-spotlight-id');
  if (config.showAvatar && metrics.avatarUrl) {
    left.appendChild(makeImg(metrics.avatarUrl, metrics.displayName, 'ov-spotlight-avatar'));
  }
  const names = el('div', 'ov-spotlight-names');
  names.appendChild(el('div', 'ov-spotlight-player', metrics.displayName));
  names.appendChild(el('div', 'ov-spotlight-herotag', `${metrics.live?.isActive ? 'JOGANDO AGORA' : 'HERÓI PRINCIPAL'}: ${metrics.featuredHero.name.toUpperCase()}`));
  left.appendChild(names);
  head.appendChild(left);

  const right = el('div', 'ov-spotlight-rankbox');
  if (config.showRankIcon) right.appendChild(makeRankImg(metrics, 'ov-spotlight-rank-img'));
  const rText = el('div', 'ov-spotlight-rank-text');
  rText.appendChild(el('span', 'ov-spotlight-rank-name', metrics.rank.fullName));
  const delta = makeDeltaBadge(metrics.rank);
  if (delta) rText.appendChild(delta);
  right.appendChild(rText);
  head.appendChild(right);
  content.appendChild(head);

  const statsGrid = el('div', 'ov-spotlight-stats');
  for (const item of getSelectedStatItems(config, metrics, 4)) {
    statsGrid.appendChild(buildStatTile(item, { showSub: true, tileClass: 'ov-spotlight-stat' }));
  }
  content.appendChild(statsGrid);

  const foot = el('div', 'ov-spotlight-footer');
  if (config.showRecentForm && metrics.recentForm.length > 0) {
    const formBlock = el('div', 'ov-spotlight-form');
    formBlock.appendChild(el('span', 'ov-spotlight-form-lbl', `SESSÃO ${metrics.session.wins}V-${metrics.session.losses}D`));
    formBlock.appendChild(makeFormPills(metrics.recentForm, false));
    foot.appendChild(formBlock);
  }
  if (config.showLiveBar && metrics.live?.isActive) {
    foot.appendChild(makeLiveBanner(metrics.live, true));
  } else if (config.showFooter) {
    foot.appendChild(el('span', 'ov-spotlight-brand', config.footerText || 'DEADLOCK TRACKER'));
  }
  content.appendChild(foot);

  root.appendChild(content);
  return root;
}

function renderDlkMinimalPill(config, metrics) {
  const root = el('div', 'ov-widget ov-dlk-pill');

  if (config.showRankIcon) {
    root.appendChild(makeRankImg(metrics, 'ov-pill-rank-img'));
  } else if (config.showAvatar && metrics.avatarUrl) {
    root.appendChild(makeImg(metrics.avatarUrl, metrics.displayName, 'ov-pill-avatar'));
  }

  const idBox = el('div', 'ov-pill-id');
  idBox.appendChild(el('span', 'ov-pill-name', metrics.displayName));
  const rankSub = el('div', 'ov-pill-rank-line');
  rankSub.appendChild(el('span', 'ov-pill-rank', metrics.rank.fullName));
  const delta = makeDeltaBadge(metrics.rank);
  if (delta) rankSub.appendChild(delta);
  idBox.appendChild(rankSub);
  root.appendChild(idBox);

  root.appendChild(el('span', 'ov-pill-sep'));

  const stats = el('div', 'ov-pill-stats');
  for (const item of getSelectedStatItems(config, metrics, 4)) {
    stats.appendChild(buildStatTile(item, { tileClass: 'ov-pill-stat' }));
  }
  root.appendChild(stats);

  if (config.showRecentForm && metrics.recentForm.length > 0) {
    root.appendChild(el('span', 'ov-pill-sep'));
    root.appendChild(makeFormPills(metrics.recentForm, true));
  }

  if (config.showLiveBar && metrics.live?.isActive) {
    const liveBadge = el('span', 'ov-pill-live', `● ${metrics.live.elapsedLabel}`);
    root.appendChild(liveBadge);
  }

  return root;
}

const STYLE_RENDERERS = {
  'trn-boxed': renderTrnBoxed,
  'trn-angled': renderTrnAngled,
  'trn-glass': renderTrnGlass,
  'trn-card': renderTrnCard,
  'dlk-occult': renderDlkOccult,
  'dlk-amber-sapphire': renderDlkAmberSapphire,
  'dlk-hero-spotlight': renderDlkHeroSpotlight,
  'dlk-minimal-pill': renderDlkMinimalPill,
};

export function renderOverlay(container, config, metrics) {
  if (!container) return;

  const preset = getStylePreset(config.style);
  const renderer = STYLE_RENDERERS[preset.id] || renderTrnBoxed;
  const [r, g, b] = hexToRgbTuple(config.bg);
  const bgRgba = `rgba(${r}, ${g}, ${b}, ${config.bgAlpha})`;
  const bgSoftRgba = `rgba(${r}, ${g}, ${b}, ${Math.max(0.15, config.bgAlpha * 0.65)})`;
  const onAccent = getContrastTextColor(config.accent);

  container.style.setProperty('--ov-accent', config.accent);
  container.style.setProperty('--ov-on-accent', onAccent);
  container.style.setProperty('--ov-bg-hex', config.bg);
  container.style.setProperty('--ov-bg-rgba', bgRgba);
  container.style.setProperty('--ov-bg-soft', bgSoftRgba);
  container.style.setProperty('--ov-text', config.text);
  container.style.setProperty('--ov-label', config.label);
  container.style.setProperty('--ov-blur', `${config.blur}px`);
  container.style.setProperty('--ov-scale', String(config.scale));
  container.dataset.gradient = config.gradient ? 'true' : 'false';
  container.dataset.transparentBg = config.bgAlpha === 0 ? 'true' : 'false';
  container.dataset.position = config.position;
  container.dataset.style = preset.id;

  const fragment = document.createDocumentFragment();
  fragment.appendChild(renderer(config, metrics));
  container.replaceChildren(fragment);
}
