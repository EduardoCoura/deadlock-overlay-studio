# Deadlock Overlay Studio

Editor visual de overlays para **Deadlock** inspirado no editor da Tracker.gg, com **8 estilos selecionáveis**, personalização em tempo real, busca de jogadores Steam/Leaderboard e URL direta para o **OBS Studio**.

🌐 **Acesse online no GitHub Pages:** https://eduardocoura.github.io/deadlock-overlay-studio/

## Como usar direto no OBS Studio (sem instalar nada)

1. Acesse **https://eduardocoura.github.io/deadlock-overlay-studio/**
2. Clique no cartão do jogador no topo do painel direito para selecionar sua conta (por **Nick da Steam**, **SteamID3**, **SteamID64**, URL do perfil ou Leaderboard).
3. Escolha um dos **8 estilos** e personalize cores, transparência, métricas e posição.
4. Clique em **Copiar URL OBS** (`?obs=1&...`) e adicione como fonte **Navegador (Browser Source)** `1920x1080` no OBS Studio (ou clique em **Baixar deadlock-overlay-obs.html** para usar como arquivo local).

## Estilos incluídos (8 opções)

### Inspirados na Tracker.gg
- **Tracker Boxed**: Banner horizontal com blocos translúcidos e selo central (estilo Fortnite/Esports).
- **Tracker Skewed**: Faixa angulada estilo Apex Legends com ticks de progressão de tier e divisórias inclinadas.
- **Tactical Glass**: Barra glassmorphism tática estilo Valorant Competitivo + indicador de delta/calibração.
- **Lifetime Card**: Cartão vertical compacto com ícones e linhas de métricas (estilo Lifetime Stats).

### Exclusivos para Deadlock & Extra
- **Cursed Apple Noir**: Visual Art Deco Oculto anos 40 com moldura dupla dourada e selo arcano.
- **Amber vs Sapphire**: HUD nas cores das duas facções do Deadlock + barra comparativa de Souls quando em partida ao vivo.
- **Hero Spotlight**: Destaque com retrato do herói principal/atual, placar da sessão de hoje (12h) e últimas 5 partidas.
- **Minimal Pill**: Pílula ultra-compacta de canto de tela.

## Rodando localmente (opcional)

1. Dê um duplo clique em `start.bat` (ou execute `npm start` / `node server.mjs`).
2. Abra `http://127.0.0.1:4747/` no navegador (o servidor local também inclui um proxy `/api/v1/*` com cache).

## Créditos da API
Dados de jogadores, partidas ao vivo, ranks e retratos de heróis fornecidos pela API pública [deadlock-api.com](https://deadlock-api.com/).
