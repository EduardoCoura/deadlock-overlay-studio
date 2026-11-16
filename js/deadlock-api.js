const UPSTREAM_API_BASE = 'https://api.deadlock-api.com';
const API_BASE = UPSTREAM_API_BASE;
const STEAM64_BASE = 76561197960265728n;
const ROMAN_SUBRANKS = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'];
const ASSETS_CACHE_KEY = 'deadlock_overlay_assets_v1';
const ASSETS_TTL_MS = 12 * 60 * 60_000;

const FALLBACK_RANKS = [
  { tier: 0, name: 'Obscurus', color: '#333333', images: { large_webp: 'https://assets-bucket.deadlock-api.com/assets-api-res/images/ranks/rank00_lg.webp' } },
  { tier: 1, name: 'Initiate', color: '#6A3E1E', images: {} },
  { tier: 2, name: 'Seeker', color: '#882355', images: {} },
  { tier: 3, name: 'Acolyte', color: '#5C6DAB', images: {} },
  { tier: 4, name: 'Sentinel', color: '#719C47', images: {} },
  { tier: 5, name: 'Mystic', color: '#DDA326', images: {} },
  { tier: 6, name: 'Ritualist', color: '#EE4F57', images: {} },
  { tier: 7, name: 'Emissary', color: '#B47FEB', images: {} },
  { tier: 8, name: 'Oracle', color: '#955138', images: {} },
  { tier: 9, name: 'Phantom', color: '#7C7C7C', images: {} },
  { tier: 10, name: 'Ascendant', color: '#C39751', images: {} },
  { tier: 11, name: 'Eternus', color: '#5CE9A9', images: {} },
];

let assetsCache = null;
let assetsPromise = null;
const playerCache = new Map();
const leaderboardCache = new Map();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function canUseLocalProxy() {
  return (
    typeof window !== 'undefined' &&
    (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') &&
    !window.__DLK_STANDALONE
  );
}

async function fetchWithRetry(url, { retries = 2, bypassCache = false } = {}) {
  let attempt = 0;
  while (true) {
    try {
      const headers = { Accept: 'application/json' };
      if (bypassCache && url.startsWith('/api/')) {
        headers['X-Bypass-Cache'] = '1';
      }
      const response = await fetch(url, { headers });

      // Deadlock API returns 429 on /match-history with valid stored history JSON as fallback
      if (response.status === 429 && url.includes('/match-history')) {
        const text = await response.text();
        try {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed)) return parsed;
        } catch {
          // Fall through to retry/error
        }
      }

      if ([429, 502, 503, 504].includes(response.status) && attempt < retries) {
        const retryHeader = Number.parseFloat(response.headers.get('Retry-After') || '1');
        const waitMs = Number.isFinite(retryHeader)
          ? Math.min(4000, Math.max(450, retryHeader * 1000))
          : 700 * (attempt + 1);
        attempt += 1;
        await sleep(waitMs);
        continue;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ao consultar ${url}`);
      }

      return await response.json();
    } catch (err) {
      if (attempt < retries && (err?.name === 'TypeError' || /Failed to fetch|NetworkError/i.test(err?.message || ''))) {
        attempt += 1;
        await sleep(500 * attempt);
        continue;
      }
      throw err;
    }
  }
}

async function fetchJson(apiPathOrUrl, options = {}) {
  const apiPath = apiPathOrUrl.startsWith(UPSTREAM_API_BASE)
    ? apiPathOrUrl.slice(UPSTREAM_API_BASE.length)
    : apiPathOrUrl;

  if (canUseLocalProxy() && apiPath.startsWith('/v1/')) {
    try {
      return await fetchWithRetry(`/api${apiPath}`, options);
    } catch (proxyErr) {
      // Fallback directly to upstream if static host has no /api proxy (e.g. 404) or proxy failed
      if (/HTTP (404|502)/.test(proxyErr?.message || '') || proxyErr?.name === 'TypeError') {
        return fetchWithRetry(`${UPSTREAM_API_BASE}${apiPath}`, options);
      }
      throw proxyErr;
    }
  }

  const target = apiPath.startsWith('http') ? apiPath : `${UPSTREAM_API_BASE}${apiPath}`;
  return fetchWithRetry(target, options);
}

export function parseSteamInput(rawInput) {
  const value = (rawInput || '').trim();
  if (!value) return null;

  // Match [U:1:123456]
  const bracketMatch = value.match(/\[U:1:(\d+)\]/i);
  if (bracketMatch) {
    return { type: 'accountId', accountId: Number.parseInt(bracketMatch[1], 10) };
  }

  // Match steamcommunity.com/profiles/7656119...
  const profileUrlMatch = value.match(/steamcommunity\.com\/profiles\/(\d{17})/i);
  if (profileUrlMatch) {
    const id64 = BigInt(profileUrlMatch[1]);
    if (id64 > STEAM64_BASE) {
      return { type: 'accountId', accountId: Number(id64 - STEAM64_BASE) };
    }
  }

  // Match steamcommunity.com/id/<vanity> -> extract vanity handle for steam-search
  const vanityMatch = value.match(/steamcommunity\.com\/id\/([^/?#]+)/i);
  if (vanityMatch) {
    return { type: 'query', query: decodeURIComponent(vanityMatch[1]) };
  }

  // Match tracker URLs containing accountId (statlocker.gg / deadlocktracker.gg / tracklock.gg)
  const trackerIdMatch = value.match(/(?:statlocker\.gg|tracklock\.gg|deadlocktracker\.gg)\/[^\s]*?(\d{5,17})/i);
  if (trackerIdMatch) {
    const numStr = trackerIdMatch[1];
    if (numStr.length >= 16) {
      const id64 = BigInt(numStr);
      if (id64 > STEAM64_BASE) {
        return { type: 'accountId', accountId: Number(id64 - STEAM64_BASE) };
      }
    }
    return { type: 'accountId', accountId: Number.parseInt(numStr, 10) };
  }

  // Match pure numeric SteamID64 or SteamID3
  if (/^\d+$/.test(value)) {
    if (value.length >= 16) {
      const id64 = BigInt(value);
      if (id64 > STEAM64_BASE) {
        return { type: 'accountId', accountId: Number(id64 - STEAM64_BASE) };
      }
    }
    const id3 = Number.parseInt(value, 10);
    if (Number.isFinite(id3) && id3 > 0 && id3 < 4294967295) {
      return { type: 'accountId', accountId: id3 };
    }
  }

  return { type: 'query', query: value };
}

function buildAssetsObject(ranksList, heroesList) {
  const ranksByTier = new Map();
  for (const r of ranksList) ranksByTier.set(r.tier, r);

  const heroesById = new Map();
  for (const h of heroesList) heroesById.set(h.id, h);

  return { ranksList, ranksByTier, heroesList, heroesById };
}

function readCachedAssets() {
  try {
    const raw = localStorage.getItem(ASSETS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || Date.now() - parsed.ts > ASSETS_TTL_MS) return null;
    if (!Array.isArray(parsed.ranks) || !Array.isArray(parsed.heroes)) return null;
    return buildAssetsObject(parsed.ranks, parsed.heroes);
  } catch {
    return null;
  }
}

function writeCachedAssets(ranksList, heroesList) {
  try {
    const slimRanks = ranksList.map((r) => ({
      tier: r.tier,
      name: r.name,
      color: r.color,
      images: { large_webp: r.images?.large_webp || '' },
    }));
    const slimHeroes = heroesList.map((h) => ({
      id: h.id,
      name: h.name,
      images: {
        icon_hero_card_webp: h.images?.icon_hero_card_webp || '',
        icon_image_small_webp: h.images?.icon_image_small_webp || '',
        top_bar_vertical_image_webp: h.images?.top_bar_vertical_image_webp || '',
      },
    }));
    localStorage.setItem(ASSETS_CACHE_KEY, JSON.stringify({ ts: Date.now(), ranks: slimRanks, heroes: slimHeroes }));
  } catch {
    // Ignore storage errors
  }
}

export async function getStaticAssets() {
  if (assetsCache) return assetsCache;
  const fromStorage = readCachedAssets();
  if (fromStorage) {
    assetsCache = fromStorage;
    return assetsCache;
  }
  if (assetsPromise) return assetsPromise;

  assetsPromise = Promise.all([
    fetchJson('/v1/assets/ranks'),
    fetchJson('/v1/assets/heroes?only_active=true'),
  ])
    .then(([ranksList, heroesList]) => {
      writeCachedAssets(ranksList, heroesList);
      assetsCache = buildAssetsObject(ranksList, heroesList);
      return assetsCache;
    })
    .catch((err) => {
      assetsPromise = null;
      console.warn('[Deadlock API] Fallback de assets estáticos ativado:', err);
      return buildAssetsObject(FALLBACK_RANKS, []);
    });

  return assetsPromise;
}

export async function searchSteamPlayers(query) {
  const clean = (query || '').trim();
  if (!clean) return [];
  const params = new URLSearchParams({
    search_query: clean,
    limit: '15',
    min_matches_played_last_30d: '0',
  });
  const data = await fetchJson(`/v1/players/steam-search?${params.toString()}`);
  return Array.isArray(data) ? data : [];
}

export async function getLeaderboardPlayers(region = 'SAmerica') {
  const cached = leaderboardCache.get(region);
  if (cached && Date.now() - cached.ts < 5 * 60_000) {
    return cached.entries;
  }
  const data = await fetchJson(`/v1/leaderboard/${encodeURIComponent(region)}`);
  const entries = Array.isArray(data?.entries) ? data.entries.slice(0, 15) : [];
  leaderboardCache.set(region, { ts: Date.now(), entries });
  return entries;
}

export async function getActiveMatchesSample() {
  const data = await fetchJson('/v1/matches/active');
  return Array.isArray(data) ? data.slice(0, 12) : [];
}

export async function fetchPlayerSnapshot(accountId, { forceRefresh = false } = {}) {
  const id = Number.parseInt(accountId, 10);
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error('Account ID inválido.');
  }

  const cached = playerCache.get(id);
  if (!forceRefresh && cached && Date.now() - cached.ts < 20_000) {
    return cached.data;
  }

  const opts = { bypassCache: forceRefresh };
  const [assets, settled] = await Promise.all([
    getStaticAssets(),
    Promise.allSettled([
      fetchJson(`/v1/players/steam?account_ids=${id}`, opts),
      fetchJson(`/v1/players/${id}/rank`, opts),
      fetchJson(`/v1/players/${id}/match-history`, opts),
      fetchJson(`/v1/players/hero-stats?account_ids=${id}&game_mode=normal`, opts),
      fetchJson(`/v1/players/hero-stats?account_ids=${id}&game_mode=street_brawl`, opts),
      fetchJson(`/v1/matches/active?account_id=${id}`, opts),
    ]),
  ]);

  const [steamRes, rankRes, historyRes, heroNormalRes, heroBrawlRes, activeRes] = settled;
  const rejected = settled.filter((r) => r.status === 'rejected');

  const steamProfile = steamRes.status === 'fulfilled' && Array.isArray(steamRes.value)
    ? steamRes.value[0] || null
    : null;

  const rankInfo = rankRes.status === 'fulfilled'
    ? rankRes.value
    : { badge: 0, rank: 0, subrank: 0, last_match: null };

  const matchHistory = historyRes.status === 'fulfilled' && Array.isArray(historyRes.value)
    ? historyRes.value
    : [];

  const heroStatsNormal = heroNormalRes.status === 'fulfilled' && Array.isArray(heroNormalRes.value)
    ? heroNormalRes.value
    : [];

  const heroStatsBrawl = heroBrawlRes.status === 'fulfilled' && Array.isArray(heroBrawlRes.value)
    ? heroBrawlRes.value
    : [];

  const activeMatches = activeRes.status === 'fulfilled' && Array.isArray(activeRes.value)
    ? activeRes.value
    : [];

  const anyCoreFulfilled = [steamRes, rankRes, historyRes, heroNormalRes, heroBrawlRes].some((r) => r.status === 'fulfilled');
  if (!anyCoreFulfilled && rejected.length > 0) {
    const firstReason = rejected[0].reason?.message || 'Erro de rede ao consultar api.deadlock-api.com';
    throw new Error(`Falha ao consultar API: ${firstReason}`);
  }

  if (!steamProfile && matchHistory.length === 0 && heroStatsNormal.length === 0 && heroStatsBrawl.length === 0 && rankInfo.rank === 0) {
    throw new Error(`Nenhum dado público encontrado para a conta ${id}. Verifique se o ID está correto ou se o perfil Steam é público.`);
  }

  const data = {
    accountId: id,
    assets,
    steamProfile,
    rankInfo,
    matchHistory,
    heroStatsNormal,
    heroStatsBrawl,
    activeMatch: activeMatches[0] || null,
    fetchedAt: Date.now(),
  };

  playerCache.set(id, { ts: Date.now(), data });
  return data;
}

export function getRankDisplay(rankInfo, assets) {
  const tier = Number(rankInfo?.rank) || 0;
  const subrank = Number(rankInfo?.subrank) || 0;
  const rankMeta = assets?.ranksByTier?.get(tier) || assets?.ranksByTier?.get(0);
  const tierName = rankMeta?.name || (tier === 0 ? 'Obscurus' : `Tier ${tier}`);
  const roman = tier > 0 && subrank >= 1 && subrank <= 6 ? ROMAN_SUBRANKS[subrank] : '';
  const fullName = roman ? `${tierName} ${roman}` : tierName;

  const imageUrl = tier > 0
    ? `${API_BASE}/v1/assets/ranks/${tier}/${Math.max(1, Math.min(6, subrank || 1))}/image?format=webp`
    : rankMeta?.images?.large_webp || 'https://assets-bucket.deadlock-api.com/assets-api-res/images/ranks/rank00_lg.webp';

  const lastMatch = rankInfo?.last_match || null;
  const delta = typeof lastMatch?.player_rank_desired_progress_change === 'number'
    ? lastMatch.player_rank_desired_progress_change
    : null;
  const calibrationRemaining = typeof lastMatch?.player_rank_initial_calibration_games === 'number'
    ? lastMatch.player_rank_initial_calibration_games
    : 0;
  const winStreak = typeof lastMatch?.player_rank_initial_win_streak === 'number'
    ? lastMatch.player_rank_initial_win_streak
    : 0;

  return {
    tier,
    subrank,
    badge: Number(rankInfo?.badge) || 0,
    tierName,
    roman,
    fullName,
    color: rankMeta?.color || '#7c8596',
    imageUrl,
    delta,
    calibrationRemaining,
    winStreak,
  };
}

function isBrawlMatch(match) {
  return match.game_mode === 4 || match.brawl_score_team0 !== null;
}

function filterMatchesByMode(matches, gameMode) {
  if (gameMode === 'normal') return matches.filter((m) => !isBrawlMatch(m));
  if (gameMode === 'street_brawl') return matches.filter((m) => isBrawlMatch(m));
  return matches;
}

function isWinOutcome(match) {
  if (match.player_match_outcome === 1) return true;
  if (match.player_match_outcome === 2) return false;
  return match.player_team === match.match_result;
}

function isScoredMatch(match) {
  return match.player_match_outcome === 1 || match.player_match_outcome === 2;
}

function formatCompactNumber(n) {
  if (!Number.isFinite(n)) return '0';
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(Math.round(n));
}

function aggregateFromHeroStats(heroStatsList) {
  let matches = 0;
  let wins = 0;
  let kills = 0;
  let deaths = 0;
  let assists = 0;
  let timePlayed = 0;
  let totalPlayerDamage = 0;
  let weightedNetworth = 0;
  let weightedAccuracy = 0;
  let accuracyTime = 0;

  const byHero = new Map();

  for (const hs of heroStatsList) {
    const mp = Number(hs.matches_played) || 0;
    const w = Number(hs.wins) || 0;
    const tp = Number(hs.time_played) || 0;

    matches += mp;
    wins += w;
    kills += Number(hs.kills) || 0;
    deaths += Number(hs.deaths) || 0;
    assists += Number(hs.assists) || 0;
    timePlayed += tp;
    totalPlayerDamage += Number(hs.total_player_damage) || 0;
    weightedNetworth += (Number(hs.networth_per_min) || 0) * (tp / 60);
    if (Number.isFinite(hs.accuracy) && tp > 0) {
      weightedAccuracy += hs.accuracy * tp;
      accuracyTime += tp;
    }

    const prev = byHero.get(hs.hero_id) || { heroId: hs.hero_id, matches: 0, wins: 0, kills: 0, deaths: 0, assists: 0 };
    prev.matches += mp;
    prev.wins += w;
    prev.kills += Number(hs.kills) || 0;
    prev.deaths += Number(hs.deaths) || 0;
    prev.assists += Number(hs.assists) || 0;
    byHero.set(hs.hero_id, prev);
  }

  const totalMins = timePlayed / 60;
  return {
    matches,
    wins,
    losses: Math.max(0, matches - wins),
    kills,
    deaths,
    assists,
    soulsPerMin: totalMins > 0 ? weightedNetworth / totalMins : 0,
    dmgPerMin: totalMins > 0 ? totalPlayerDamage / totalMins : 0,
    accuracyPct: accuracyTime > 0 ? (weightedAccuracy / accuracyTime) * 100 : null,
    byHero: [...byHero.values()],
  };
}

function aggregateFromMatches(matchesList) {
  let matches = 0;
  let wins = 0;
  let kills = 0;
  let deaths = 0;
  let assists = 0;
  let durationSec = 0;
  let netWorthTotal = 0;

  const byHero = new Map();

  for (const m of matchesList) {
    if (!isScoredMatch(m)) continue;
    const won = isWinOutcome(m);
    matches += 1;
    if (won) wins += 1;
    kills += Number(m.player_kills) || 0;
    deaths += Number(m.player_deaths) || 0;
    assists += Number(m.player_assists) || 0;
    durationSec += Number(m.match_duration_s) || 0;
    netWorthTotal += Number(m.net_worth) || 0;

    const prev = byHero.get(m.hero_id) || { heroId: m.hero_id, matches: 0, wins: 0, kills: 0, deaths: 0, assists: 0 };
    prev.matches += 1;
    if (won) prev.wins += 1;
    prev.kills += Number(m.player_kills) || 0;
    prev.deaths += Number(m.player_deaths) || 0;
    prev.assists += Number(m.player_assists) || 0;
    byHero.set(m.hero_id, prev);
  }

  const mins = durationSec / 60;
  return {
    matches,
    wins,
    losses: Math.max(0, matches - wins),
    kills,
    deaths,
    assists,
    soulsPerMin: mins > 0 ? netWorthTotal / mins : 0,
    dmgPerMin: null,
    accuracyPct: null,
    byHero: [...byHero.values()],
  };
}

export function computePlayerMetrics(snapshot, config) {
  const { assets, steamProfile, rankInfo, matchHistory, heroStatsNormal, heroStatsBrawl, activeMatch } = snapshot;
  const rank = getRankDisplay(rankInfo, assets);

  const modeMatches = filterMatchesByMode(matchHistory, config.gameMode).filter(isScoredMatch);
  const nowSec = Math.floor(Date.now() / 1000);
  const sessionMatches = modeMatches.filter((m) => nowSec - m.start_time <= 12 * 3600);

  let careerHeroRows = [];
  if (config.gameMode === 'normal') careerHeroRows = heroStatsNormal;
  else if (config.gameMode === 'street_brawl') careerHeroRows = heroStatsBrawl;
  else careerHeroRows = [...heroStatsNormal, ...heroStatsBrawl];

  const careerAgg = aggregateFromHeroStats(careerHeroRows);

  let mainAgg = careerAgg;
  if (config.statWindow === 'recent20') {
    mainAgg = aggregateFromMatches(modeMatches.slice(0, 20));
  } else if (config.statWindow === 'session12h') {
    mainAgg = aggregateFromMatches(sessionMatches);
  }

  const winrate = mainAgg.matches > 0 ? (mainAgg.wins / mainAgg.matches) * 100 : 0;
  const kd = mainAgg.deaths > 0 ? mainAgg.kills / mainAgg.deaths : mainAgg.kills;
  const kda = mainAgg.deaths > 0 ? (mainAgg.kills + mainAgg.assists) / mainAgg.deaths : mainAgg.kills + mainAgg.assists;

  // Pick top hero from selected window (fallback to career if window is empty)
  const heroPool = mainAgg.byHero.length > 0 ? mainAgg.byHero : careerAgg.byHero;
  heroPool.sort((a, b) => b.matches - a.matches || b.wins - a.wins);
  const topHeroEntry = heroPool[0] || null;
  const lastPlayedMatch = modeMatches[0] || matchHistory[0] || null;
  const topHeroAsset = topHeroEntry
    ? assets.heroesById.get(topHeroEntry.heroId)
    : lastPlayedMatch
      ? assets.heroesById.get(lastPlayedMatch.hero_id)
      : null;

  // Session W-L
  const sessionWins = sessionMatches.filter(isWinOutcome).length;
  const sessionLosses = sessionMatches.length - sessionWins;

  // Recent 5 matches form
  const recentForm = modeMatches.slice(0, 5).map((m) => {
    const hero = assets.heroesById.get(m.hero_id);
    return {
      matchId: m.match_id,
      won: isWinOutcome(m),
      kills: m.player_kills,
      deaths: m.player_deaths,
      assists: m.player_assists,
      heroName: hero?.name || `#${m.hero_id}`,
      heroIcon: hero?.images?.icon_image_small_webp || '',
      durationMin: Math.round((m.match_duration_s || 0) / 60),
    };
  });

  // Live Match resolution (Real or Editor Simulation)
  let live = null;
  if (activeMatch) {
    const playerRow = (activeMatch.players || []).find((p) => p.account_id === snapshot.accountId);
    const liveHero = playerRow?.hero_id ? assets.heroesById.get(playerRow.hero_id) : topHeroAsset;
    const teamIdx = playerRow?.team === 1 ? 1 : 0;
    const elapsedSec = activeMatch.start_time ? Math.max(0, Math.floor(Date.now() / 1000) - activeMatch.start_time) : 0;
    live = {
      isActive: true,
      simulated: false,
      matchId: activeMatch.match_id,
      heroName: liveHero?.name || 'Em Partida',
      heroPortrait: liveHero?.images?.icon_hero_card_webp || liveHero?.images?.icon_image_small_webp || '',
      heroSmall: liveHero?.images?.icon_image_small_webp || '',
      teamIdx,
      teamName: teamIdx === 0 ? 'Amber Hand' : 'Sapphire Flame',
      amberSouls: activeMatch.net_worth_team_0 || 0,
      sapphireSouls: activeMatch.net_worth_team_1 || 0,
      elapsedLabel: `${Math.floor(elapsedSec / 60)}:${String(elapsedSec % 60).padStart(2, '0')}`,
      spectators: activeMatch.spectators || 0,
    };
  } else if (config.simulateLive) {
    live = {
      isActive: true,
      simulated: true,
      matchId: 0,
      heroName: topHeroAsset?.name || 'Infernus',
      heroPortrait: topHeroAsset?.images?.icon_hero_card_webp || '',
      heroSmall: topHeroAsset?.images?.icon_image_small_webp || '',
      teamIdx: 0,
      teamName: 'Amber Hand',
      amberSouls: 64800,
      sapphireSouls: 61200,
      elapsedLabel: '18:42',
      spectators: 14,
    };
  }

  const lastHero = lastPlayedMatch ? assets.heroesById.get(lastPlayedMatch.hero_id) : null;
  const lastMatchStr = lastPlayedMatch
    ? `${isWinOutcome(lastPlayedMatch) ? 'V' : 'D'} ${lastPlayedMatch.player_kills}/${lastPlayedMatch.player_deaths}/${lastPlayedMatch.player_assists}`
    : '—';

  const statValues = {
    winrate: { value: mainAgg.matches > 0 ? `${winrate.toFixed(1)}%` : '—', sub: `${mainAgg.wins}V ${mainAgg.losses}D` },
    kd: { value: mainAgg.matches > 0 ? kd.toFixed(2) : '—', sub: `${mainAgg.kills}K / ${mainAgg.deaths}D` },
    kda: { value: mainAgg.matches > 0 ? kda.toFixed(2) : '—', sub: `${mainAgg.assists}A` },
    wl: { value: `${mainAgg.wins} - ${mainAgg.losses}`, sub: `${winrate.toFixed(0)}% WR` },
    wins: { value: String(mainAgg.wins), sub: `${mainAgg.matches} jogos` },
    matches: { value: String(mainAgg.matches), sub: `${mainAgg.wins} vitórias` },
    souls_min: { value: mainAgg.soulsPerMin > 0 ? String(Math.round(mainAgg.soulsPerMin)) : '—', sub: 'souls/min' },
    dmg_min: {
      value: (mainAgg.dmgPerMin ?? careerAgg.dmgPerMin) > 0
        ? formatCompactNumber(mainAgg.dmgPerMin ?? careerAgg.dmgPerMin)
        : '—',
      sub: 'dano/min',
    },
    accuracy: {
      value: (mainAgg.accuracyPct ?? careerAgg.accuracyPct) != null
        ? `${(mainAgg.accuracyPct ?? careerAgg.accuracyPct).toFixed(1)}%`
        : '—',
      sub: 'precisão',
    },
    session_wl: {
      value: `${sessionWins}V - ${sessionLosses}D`,
      sub: sessionMatches.length > 0 ? `${Math.round((sessionWins / sessionMatches.length) * 100)}% hoje` : 'últimas 12h',
    },
    top_hero: {
      value: topHeroAsset?.name || '—',
      sub: topHeroEntry ? `${topHeroEntry.matches} jogos • ${Math.round((topHeroEntry.wins / Math.max(1, topHeroEntry.matches)) * 100)}%` : '',
    },
    last_match: {
      value: lastMatchStr,
      sub: lastHero?.name || '',
    },
  };

  const displayName = steamProfile?.personaname || `Jogador #${snapshot.accountId}`;
  const avatarUrl = steamProfile?.avatarmedium || steamProfile?.avatarfull || '';

  const featuredHero = live?.isActive
    ? {
        name: live.heroName,
        portrait: live.heroPortrait || topHeroAsset?.images?.icon_hero_card_webp || '',
        vertical: topHeroAsset?.images?.top_bar_vertical_image_webp || '',
        small: live.heroSmall || topHeroAsset?.images?.icon_image_small_webp || '',
      }
    : {
        name: topHeroAsset?.name || lastHero?.name || 'Deadlock',
        portrait: topHeroAsset?.images?.icon_hero_card_webp || lastHero?.images?.icon_hero_card_webp || '',
        vertical: topHeroAsset?.images?.top_bar_vertical_image_webp || lastHero?.images?.top_bar_vertical_image_webp || '',
        small: topHeroAsset?.images?.icon_image_small_webp || lastHero?.images?.icon_image_small_webp || '',
      };

  return {
    accountId: snapshot.accountId,
    displayName,
    avatarUrl,
    rank,
    statValues,
    recentForm,
    featuredHero,
    live,
    session: { wins: sessionWins, losses: sessionLosses, total: sessionMatches.length },
    careerTotals: careerAgg,
    fetchedAt: snapshot.fetchedAt,
  };
}
