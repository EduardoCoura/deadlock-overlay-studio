import { sanitizeConfig } from './config.js';

function stripModuleSyntax(source) {
  return source
    .replace(/^\s*import\s+[\s\S]*?from\s+['"][^'"]+['"];\s*$/gm, '')
    .replace(/^\s*export\s+(?=(async\s+)?function\b|const\b|let\b|var\b|class\b)/gm, '');
}

function getAppBaseUrl() {
  const { origin, pathname } = window.location;
  if (pathname.endsWith('/')) return `${origin}${pathname}`;
  if (pathname.endsWith('.html')) {
    return `${origin}${pathname.slice(0, pathname.lastIndexOf('/') + 1)}`;
  }
  return `${origin}${pathname}/`;
}

async function loadTextAsset(relPath) {
  const targetUrl = new URL(relPath.replace(/^\.\//, ''), getAppBaseUrl()).href;
  const res = await fetch(targetUrl, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Falha ao carregar ${relPath}`);
  return res.text();
}

function collectFallbackCss() {
  const chunks = [];
  for (const sheet of document.styleSheets) {
    try {
      if (sheet.href && sheet.href.includes('overlays.css')) {
        for (const rule of sheet.cssRules) {
          chunks.push(rule.cssText);
        }
      }
    } catch {
      // Ignore cross-origin sheets (e.g., Google Fonts)
    }
  }
  return chunks.join('\n');
}

export async function generateStandaloneObsHtml(config) {
  const cleanConfig = sanitizeConfig({ ...config, simulateLive: false });

  const [overlaysCss, configJs, apiJs, rendererJs] = await Promise.all([
    loadTextAsset('./styles/overlays.css').catch(() => collectFallbackCss()),
    loadTextAsset('./js/config.js'),
    loadTextAsset('./js/deadlock-api.js'),
    loadTextAsset('./js/overlay-renderer.js'),
  ]);

  const combinedScript = [
    stripModuleSyntax(configJs),
    stripModuleSyntax(apiJs),
    stripModuleSyntax(rendererJs),
  ].join('\n\n');

  // Escape closing script tags defensively inside embedded JSON or code
  const safeJsonConfig = JSON.stringify(cleanConfig).replace(/<\//g, '<\\/');
  const safeScriptBody = combinedScript.replace(/<\/script>/gi, '<\\/script>');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Deadlock Overlay — OBS Browser Source</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800;900&family=Cinzel:wght@700&family=Inter:wght@600;700;800&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      width: 100vw;
      height: 100vh;
      overflow: hidden;
      background: transparent !important;
      font-family: "Inter", "Segoe UI", system-ui, sans-serif;
    }
    ${overlaysCss}
  </style>
</head>
<body>
  <main class="overlay-stage">
    <div id="obs-overlay-anchor" class="overlay-anchor"></div>
  </main>
  <script>
  window.__DLK_STANDALONE = true;
  (function () {
    'use strict';
    ${safeScriptBody}

    const CONFIG = sanitizeConfig(${safeJsonConfig});
    const anchor = document.getElementById('obs-overlay-anchor');

    async function tick(forceRefresh) {
      try {
        const snapshot = await fetchPlayerSnapshot(CONFIG.accountId, { forceRefresh: !!forceRefresh });
        const metrics = computePlayerMetrics(snapshot, CONFIG);
        renderOverlay(anchor, CONFIG, metrics);
      } catch (err) {
        console.error('[Deadlock Overlay]', err);
      }
    }

    tick(false);
    setInterval(() => tick(true), Math.max(15, CONFIG.refreshSeconds) * 1000);
    setInterval(() => tickLiveClockElements(document), 1000);
  })();
  </script>
</body>
</html>
`;
}
