/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { Creation } from '../components/CreationHistory';

const cassetteHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Toca-Fitas Cassete</title>
<style>
  * { box-sizing: border-box; user-select: none; }
  body {
    margin: 0;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: radial-gradient(circle at 30% 20%, #27272a 0%, #09090b 75%);
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    color: #f4f4f5;
    padding: 20px;
  }
  .deck {
    width: 100%;
    max-width: 440px;
    background: linear-gradient(160deg, #27272a, #18181b);
    border: 1px solid #3f3f46;
    border-radius: 22px;
    padding: 22px;
    box-shadow: 0 30px 60px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.08);
  }
  .top-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 14px;
    font-size: 11px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #a1a1aa;
  }
  .led {
    width: 8px; height: 8px; border-radius: 50%;
    background: #3f3f46;
    display: inline-block;
    margin-right: 6px;
    transition: all 0.2s;
  }
  .led.on { background: #22c55e; box-shadow: 0 0 10px #22c55e; }
  .cassette {
    background: linear-gradient(180deg, #e4e4e7 0%, #d4d4d8 100%);
    color: #18181b;
    border-radius: 14px;
    padding: 14px 16px 18px;
    border: 2px solid #52525b;
    position: relative;
    box-shadow: inset 0 2px 6px rgba(0,0,0,0.2);
  }
  .label-strip {
    background: #fef3c7;
    border: 1px solid #d97706;
    border-radius: 8px;
    padding: 10px 12px;
    margin-bottom: 14px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .label-title { font-weight: 800; font-size: 14px; color: #18181b; }
  .label-sub { font-family: monospace; font-size: 11px; color: #92400e; }
  .window {
    background: #18181b;
    border-radius: 10px;
    padding: 14px 22px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border: 2px solid #3f3f46;
  }
  .reel {
    width: 56px; height: 56px;
    border-radius: 50%;
    border: 5px solid #e4e4e7;
    background: radial-gradient(circle, #27272a 32%, #52525b 34%, #52525b 60%, #18181b 62%);
    position: relative;
    display: flex; align-items: center; justify-content: center;
  }
  .reel::before, .reel::after {
    content: "";
    position: absolute;
    background: #e4e4e7;
  }
  .reel::before { width: 4px; height: 22px; border-radius: 2px; }
  .reel::after { width: 22px; height: 4px; border-radius: 2px; }
  .spinning { animation: spin 1.6s linear infinite; }
  .spinning-fast { animation: spin 0.35s linear infinite; }
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  .tape-bridge {
    flex: 1;
    height: 16px;
    margin: 0 12px;
    background: repeating-linear-gradient(90deg, #27272a 0 6px, #3f3f46 6px 12px);
    border-radius: 4px;
    position: relative;
    overflow: hidden;
  }
  .vu-meter {
    margin-top: 16px;
    background: #09090b;
    border: 1px solid #27272a;
    border-radius: 10px;
    padding: 10px 12px;
  }
  .vu-bars {
    display: flex;
    gap: 4px;
    height: 28px;
    align-items: flex-end;
  }
  .vu-bar {
    flex: 1;
    background: #27272a;
    border-radius: 2px;
    height: 18%;
    transition: height 0.08s ease, background 0.1s;
  }
  .track-list {
    display: flex;
    gap: 6px;
    margin-top: 14px;
  }
  .track-btn {
    flex: 1;
    background: #27272a;
    color: #a1a1aa;
    border: 1px solid #3f3f46;
    border-radius: 8px;
    padding: 7px 6px;
    font-size: 11px;
    font-family: monospace;
    cursor: pointer;
    transition: all 0.15s;
  }
  .track-btn.active {
    background: #3b82f6;
    border-color: #60a5fa;
    color: #fff;
    font-weight: 700;
  }
  .controls {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    margin-top: 14px;
  }
  .ctrl-btn {
    background: #27272a;
    border: 1px solid #3f3f46;
    color: #f4f4f5;
    border-radius: 10px;
    padding: 12px 0;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 3px 0 #09090b;
    transition: transform 0.1s, background 0.15s;
  }
  .ctrl-btn:active, .ctrl-btn.pressed {
    transform: translateY(2px);
    box-shadow: 0 1px 0 #09090b;
    background: #3f3f46;
  }
  .ctrl-btn.play.pressed {
    background: #22c55e;
    color: #052e16;
    border-color: #4ade80;
  }
  .status-row {
    display: flex;
    justify-content: space-between;
    margin-top: 12px;
    font-family: monospace;
    font-size: 11px;
    color: #a1a1aa;
  }
</style>
</head>
<body>
  <div class="deck">
    <div class="top-bar">
      <span><span id="led" class="led"></span>TOCA-FITAS ESTÉREO</span>
      <span id="modeBadge">PARADO</span>
    </div>

    <div class="cassette">
      <div class="label-strip">
        <div>
          <div class="label-title" id="trackTitle">LADO A: SYNTH NOTURNO</div>
          <div class="label-sub">FITA CROMO TIPO II • 90 MIN</div>
        </div>
        <div class="label-sub" id="counter">00:00</div>
      </div>
      <div class="window">
        <div id="reelL" class="reel"></div>
        <div class="tape-bridge"></div>
        <div id="reelR" class="reel"></div>
      </div>
    </div>

    <div class="vu-meter">
      <div class="vu-bars" id="vuBars"></div>
    </div>

    <div class="track-list">
      <button class="track-btn active" onclick="selectTrack(0)">01. SYNTH</button>
      <button class="track-btn" onclick="selectTrack(1)">02. LO-FI</button>
      <button class="track-btn" onclick="selectTrack(2)">03. AMBIENT</button>
    </div>

    <div class="controls">
      <button class="ctrl-btn" onclick="rewind()">⏮ VOLT</button>
      <button id="playBtn" class="ctrl-btn play" onclick="togglePlay()">▶ TOCAR</button>
      <button class="ctrl-btn" onclick="stopTape()">■ PARAR</button>
      <button class="ctrl-btn" onclick="fastForward()">⏭ AVANÇ</button>
    </div>

    <div class="status-row">
      <span>SINTETIZADOR WEB AUDIO</span>
      <span id="bpmLabel">96 BPM</span>
    </div>
  </div>

<script>
  const tracks = [
    { name: "LADO A: SYNTH NOTURNO", bpm: 96, notes: [220, 261.63, 329.63, 392, 329.63, 261.63, 293.66, 349.23], wave: "sawtooth" },
    { name: "LADO A: CHUVA LO-FI", bpm: 78, notes: [196, 246.94, 293.66, 369.99, 293.66, 246.94, 220, 261.63], wave: "triangle" },
    { name: "LADO B: DERIVA ORBITAL", bpm: 64, notes: [174.61, 220, 261.63, 329.63, 440, 329.63, 261.63, 220], wave: "sine" }
  ];

  let currentTrack = 0;
  let playing = false;
  let seconds = 0;
  let stepIndex = 0;
  let audioCtx = null;
  let stepTimer = null;
  let clockTimer = null;
  let vuTimer = null;

  const vuContainer = document.getElementById('vuBars');
  for (let i = 0; i < 16; i++) {
    const bar = document.createElement('div');
    bar.className = 'vu-bar';
    vuContainer.appendChild(bar);
  }
  const bars = Array.from(document.querySelectorAll('.vu-bar'));

  function formatTime(s) {
    const m = String(Math.floor(s / 60)).padStart(2, '0');
    const sec = String(s % 60).padStart(2, '0');
    return m + ':' + sec;
  }

  function updateUI(modeText, reelClass) {
    document.getElementById('modeBadge').textContent = modeText;
    document.getElementById('led').classList.toggle('on', playing);
    document.getElementById('playBtn').classList.toggle('pressed', playing);
    document.getElementById('playBtn').textContent = playing ? '❚❚ PAUSA' : '▶ TOCAR';
    const rL = document.getElementById('reelL');
    const rR = document.getElementById('reelR');
    rL.className = 'reel ' + (reelClass || '');
    rR.className = 'reel ' + (reelClass || '');
  }

  function playNote(freq, wave) {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const filter = audioCtx.createBiquadFilter();
    const gain = audioCtx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1100, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.001, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, audioCtx.currentTime + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.38);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.4);
  }

  function startPlayback() {
    clearInterval(stepTimer);
    clearInterval(clockTimer);
    clearInterval(vuTimer);
    const track = tracks[currentTrack];
    const intervalMs = Math.round((60 / track.bpm) * 500);
    stepTimer = setInterval(() => {
      const note = track.notes[stepIndex % track.notes.length];
      playNote(note, track.wave);
      stepIndex++;
    }, intervalMs);
    clockTimer = setInterval(() => {
      seconds++;
      document.getElementById('counter').textContent = formatTime(seconds);
    }, 1000);
    vuTimer = setInterval(() => {
      bars.forEach((b) => {
        const h = 20 + Math.floor(Math.random() * 80);
        b.style.height = h + '%';
        b.style.background = h > 82 ? '#ef4444' : h > 60 ? '#f59e0b' : '#22c55e';
      });
    }, 110);
  }

  function togglePlay() {
    playing = !playing;
    if (playing) {
      updateUI('TOCANDO', 'spinning');
      startPlayback();
    } else {
      clearInterval(stepTimer);
      clearInterval(clockTimer);
      clearInterval(vuTimer);
      bars.forEach(b => { b.style.height = '18%'; b.style.background = '#27272a'; });
      updateUI('PAUSADO', '');
    }
  }

  function stopTape() {
    playing = false;
    clearInterval(stepTimer);
    clearInterval(clockTimer);
    clearInterval(vuTimer);
    seconds = 0;
    stepIndex = 0;
    document.getElementById('counter').textContent = '00:00';
    bars.forEach(b => { b.style.height = '18%'; b.style.background = '#27272a'; });
    updateUI('PARADO', '');
  }

  function selectTrack(idx) {
    currentTrack = idx;
    stepIndex = 0;
    seconds = 0;
    document.getElementById('trackTitle').textContent = tracks[idx].name;
    document.getElementById('bpmLabel').textContent = tracks[idx].bpm + ' BPM';
    document.getElementById('counter').textContent = '00:00';
    document.querySelectorAll('.track-btn').forEach((btn, i) => btn.classList.toggle('active', i === idx));
    if (playing) startPlayback();
  }

  function rewind() {
    seconds = Math.max(0, seconds - 10);
    document.getElementById('counter').textContent = formatTime(seconds);
    if (!playing) {
      updateUI('REBOBINANDO', 'spinning-fast');
      setTimeout(() => updateUI('PARADO', ''), 450);
    }
  }

  function fastForward() {
    seconds += 10;
    document.getElementById('counter').textContent = formatTime(seconds);
    if (!playing) {
      updateUI('AVANÇANDO', 'spinning-fast');
      setTimeout(() => updateUI('PARADO', ''), 450);
    }
  }
</script>
</body>
</html>`;

const chessHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Tabuleiro de Xadrez Interativo</title>
<style>
  * { box-sizing: border-box; user-select: none; }
  body {
    margin: 0;
    min-height: 100vh;
    background: #09090b;
    color: #fafafa;
    font-family: 'Inter', system-ui, sans-serif;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
  }
  .layout {
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
    align-items: flex-start;
    justify-content: center;
    max-width: 820px;
    width: 100%;
  }
  .board {
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    width: min(88vw, 440px);
    height: min(88vw, 440px);
    border: 3px solid #3f3f46;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 20px 50px rgba(0,0,0,0.6);
  }
  .sq {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: clamp(24px, 5vw, 38px);
    cursor: pointer;
    position: relative;
    transition: background 0.12s;
  }
  .sq.light { background: #e4e4e7; color: #18181b; }
  .sq.dark { background: #52525b; color: #18181b; }
  .sq.selected { background: #3b82f6 !important; }
  .sq.hint::after {
    content: "";
    width: 28%;
    height: 28%;
    border-radius: 50%;
    background: rgba(59, 130, 246, 0.55);
    position: absolute;
  }
  .sq.capture::after {
    content: "";
    inset: 4px;
    border-radius: 50%;
    border: 3px solid rgba(239, 68, 68, 0.75);
    position: absolute;
  }
  .piece-w { color: #ffffff; text-shadow: 0 1px 3px rgba(0,0,0,0.75); }
  .piece-b { color: #09090b; text-shadow: 0 1px 1px rgba(255,255,255,0.25); }
  .sidebar {
    width: 260px;
    background: #18181b;
    border: 1px solid #27272a;
    border-radius: 12px;
    padding: 16px;
  }
  .turn-pill {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: #27272a;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 12px;
  }
  .dot { width: 10px; height: 10px; border-radius: 50%; }
  .moves {
    height: 220px;
    overflow-y: auto;
    background: #09090b;
    border: 1px solid #27272a;
    border-radius: 8px;
    padding: 10px;
    font-family: monospace;
    font-size: 12px;
    color: #a1a1aa;
    margin-bottom: 12px;
  }
  .captured {
    min-height: 28px;
    font-size: 18px;
    margin-bottom: 10px;
    letter-spacing: 2px;
  }
  button.reset {
    width: 100%;
    background: #fafafa;
    color: #09090b;
    border: none;
    border-radius: 8px;
    padding: 10px;
    font-weight: 700;
    font-size: 13px;
    cursor: pointer;
  }
  button.reset:hover { background: #e4e4e7; }
</style>
</head>
<body>
  <div class="layout">
    <div id="board" class="board"></div>
    <div class="sidebar">
      <div class="turn-pill">
        <span id="turnDot" class="dot" style="background:#fff"></span>
        <span id="turnText">Vez das Brancas</span>
      </div>
      <div style="font-size:11px;color:#71717a;margin-bottom:4px;text-transform:uppercase;">Capturadas</div>
      <div id="captured" class="captured"></div>
      <div style="font-size:11px;color:#71717a;margin-bottom:4px;text-transform:uppercase;">Registro de Jogadas</div>
      <div id="moves" class="moves">Selecione uma peça para começar.</div>
      <button class="reset" onclick="resetGame()">Reiniciar Tabuleiro</button>
    </div>
  </div>
<script>
  const GLYPHS = {
    wK:'♔', wQ:'♕', wR:'♖', wB:'♗', wN:'♘', wP:'♙',
    bK:'♚', bQ:'♛', bR:'♜', bB:'♝', bN:'♞', bP:'♟'
  };
  const INIT = [
    ['bR','bN','bB','bQ','bK','bB','bN','bR'],
    ['bP','bP','bP','bP','bP','bP','bP','bP'],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    ['wP','wP','wP','wP','wP','wP','wP','wP'],
    ['wR','wN','wB','wQ','wK','wB','wN','wR']
  ];

  let board, turn, selected, legalMoves, moveLog, captured;

  function resetGame() {
    board = INIT.map(r => r.slice());
    turn = 'w';
    selected = null;
    legalMoves = [];
    moveLog = [];
    captured = [];
    render();
  }

  function inBounds(r, c) { return r >= 0 && r < 8 && c >= 0 && c < 8; }

  function getMoves(r, c) {
    const p = board[r][c];
    if (!p) return [];
    const col = p[0], type = p[1], moves = [];
    const addSlide = (dr, dc) => {
      let nr = r + dr, nc = c + dc;
      while (inBounds(nr, nc)) {
        if (!board[nr][nc]) moves.push([nr, nc]);
        else {
          if (board[nr][nc][0] !== col) moves.push([nr, nc]);
          break;
        }
        nr += dr; nc += dc;
      }
    };
    if (type === 'P') {
      const dir = col === 'w' ? -1 : 1;
      const startRow = col === 'w' ? 6 : 1;
      if (inBounds(r + dir, c) && !board[r + dir][c]) {
        moves.push([r + dir, c]);
        if (r === startRow && !board[r + 2 * dir][c]) moves.push([r + 2 * dir, c]);
      }
      for (const dc of [-1, 1]) {
        if (inBounds(r + dir, c + dc) && board[r + dir][c + dc] && board[r + dir][c + dc][0] !== col) {
          moves.push([r + dir, c + dc]);
        }
      }
    } else if (type === 'N') {
      for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
        const nr = r + dr, nc = c + dc;
        if (inBounds(nr, nc) && (!board[nr][nc] || board[nr][nc][0] !== col)) moves.push([nr, nc]);
      }
    } else if (type === 'B') {
      [[-1,-1],[-1,1],[1,-1],[1,1]].forEach(([dr, dc]) => addSlide(dr, dc));
    } else if (type === 'R') {
      [[-1,0],[1,0],[0,-1],[0,1]].forEach(([dr, dc]) => addSlide(dr, dc));
    } else if (type === 'Q') {
      [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]].forEach(([dr, dc]) => addSlide(dr, dc));
    } else if (type === 'K') {
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const nr = r + dr, nc = c + dc;
        if (inBounds(nr, nc) && (!board[nr][nc] || board[nr][nc][0] !== col)) moves.push([nr, nc]);
      }
    }
    return moves;
  }

  function handleSquare(r, c) {
    const isTarget = legalMoves.some(([mr, mc]) => mr === r && mc === c);
    if (selected && isTarget) {
      const [sr, sc] = selected;
      const piece = board[sr][sc];
      const target = board[r][c];
      if (target) captured.push(GLYPHS[target]);
      board[r][c] = piece;
      board[sr][sc] = null;
      if (piece[1] === 'P' && (r === 0 || r === 7)) board[r][c] = piece[0] + 'Q';
      const files = 'abcdefgh';
      moveLog.push((moveLog.length + 1) + '. ' + piece + ' ' + files[sc] + (8 - sr) + ' → ' + files[c] + (8 - r));
      turn = turn === 'w' ? 'b' : 'w';
      selected = null;
      legalMoves = [];
      render();
      return;
    }
    const p = board[r][c];
    if (p && p[0] === turn) {
      selected = [r, c];
      legalMoves = getMoves(r, c);
    } else {
      selected = null;
      legalMoves = [];
    }
    render();
  }

  function render() {
    const el = document.getElementById('board');
    el.innerHTML = '';
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const sq = document.createElement('div');
        const isLight = (r + c) % 2 === 0;
        sq.className = 'sq ' + (isLight ? 'light' : 'dark');
        if (selected && selected[0] === r && selected[1] === c) sq.classList.add('selected');
        if (legalMoves.some(([mr, mc]) => mr === r && mc === c)) {
          sq.classList.add(board[r][c] ? 'capture' : 'hint');
        }
        const p = board[r][c];
        if (p) {
          const span = document.createElement('span');
          span.textContent = GLYPHS[p];
          span.className = p[0] === 'w' ? 'piece-w' : 'piece-b';
          sq.appendChild(span);
        }
        sq.onclick = () => handleSquare(r, c);
        el.appendChild(sq);
      }
    }
    document.getElementById('turnDot').style.background = turn === 'w' ? '#ffffff' : '#18181b';
    document.getElementById('turnText').textContent = turn === 'w' ? 'Vez das Brancas' : 'Vez das Pretas';
    document.getElementById('captured').textContent = captured.join(' ') || '—';
    const logEl = document.getElementById('moves');
    logEl.innerHTML = moveLog.length ? moveLog.map(m => '<div>' + m + '</div>').join('') : 'Selecione uma peça para começar.';
    logEl.scrollTop = logEl.scrollHeight;
  }

  resetGame();
</script>
</body>
</html>`;

const vibecodeBlogHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Notas de Vibecode — Leitor Interativo</title>
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: #09090b;
    color: #e4e4e7;
    font-family: 'Inter', system-ui, sans-serif;
    line-height: 1.6;
  }
  header {
    border-bottom: 1px solid #27272a;
    padding: 20px 24px;
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    justify-content: space-between;
    align-items: center;
    background: rgba(24, 24, 27, 0.7);
    backdrop-filter: blur(8px);
    position: sticky;
    top: 0;
  }
  .brand { font-weight: 800; letter-spacing: -0.02em; font-size: 18px; color: #fff; }
  .filters { display: flex; gap: 8px; flex-wrap: wrap; }
  .chip {
    background: #18181b;
    border: 1px solid #3f3f46;
    color: #a1a1aa;
    padding: 5px 12px;
    border-radius: 6px;
    font-size: 12px;
    cursor: pointer;
  }
  .chip.active { background: #3b82f6; border-color: #60a5fa; color: #fff; font-weight: 600; }
  main { max-width: 780px; margin: 0 auto; padding: 28px 20px; display: grid; gap: 18px; }
  .card {
    background: #18181b;
    border: 1px solid #27272a;
    border-radius: 12px;
    padding: 20px;
  }
  .meta { font-family: monospace; font-size: 11px; color: #60a5fa; text-transform: uppercase; margin-bottom: 6px; }
  h2 { margin: 0 0 8px; font-size: 20px; color: #fff; }
  p { margin: 0 0 12px; color: #a1a1aa; font-size: 14px; }
  pre {
    background: #09090b;
    border: 1px solid #27272a;
    border-radius: 8px;
    padding: 12px;
    overflow-x: auto;
    font-family: monospace;
    font-size: 12px;
    color: #a7f3d0;
    margin: 0 0 10px;
  }
  .run-btn {
    background: #27272a;
    color: #f4f4f5;
    border: 1px solid #3f3f46;
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 12px;
    cursor: pointer;
  }
  .run-btn:hover { background: #3f3f46; }
  .output {
    margin-top: 8px;
    font-family: monospace;
    font-size: 12px;
    color: #fde68a;
    background: #09090b;
    border-left: 3px solid #3b82f6;
    padding: 8px 10px;
    display: none;
  }
</style>
</head>
<body>
  <header>
    <div class="brand">VIBECODE // NOTAS DE CAMPO</div>
    <div class="filters">
      <button class="chip active" onclick="filterPosts('all', this)">Todos</button>
      <button class="chip" onclick="filterPosts('ui', this)">Interface</button>
      <button class="chip" onclick="filterPosts('canvas', this)">Canvas</button>
      <button class="chip" onclick="filterPosts('audio', this)">Áudio</button>
    </div>
  </header>
  <main id="posts"></main>
<script>
  const posts = [
    {
      tag: 'ui',
      title: 'Do Rascunho ao Software Funcional',
      summary: 'Transformando rabiscos espaciais direto em máquinas de estado reativas sem código repetitivo.',
      code: 'const estados = ["ocioso", "analisando", "vivo"];\\nreturn estados.map((s, i) => (i + 1) + ". " + s.toUpperCase()).join(" → ");'
    },
    {
      tag: 'canvas',
      title: 'Grades Técnicas a 60fps',
      summary: 'Um utilitário matemático simples para alinhar nós interativos em coordenadas precisas.',
      code: 'const alinhar = (v, grade = 16) => Math.round(v / grade) * grade;\\nreturn "Alinhado (43, 91) -> (" + alinhar(43) + ", " + alinhar(91) + ")";'
    },
    {
      tag: 'audio',
      title: 'Design Sonoro Sem Arquivos Externos',
      summary: 'Sintetize cliques táteis usando osciladores da Web Audio API sem depender de arquivos mp3.',
      code: 'const harmonicos = [220, 330, 440, 660];\\nreturn "Acorde Hz: " + harmonicos.join(" | ");'
    }
  ];

  let activeFilter = 'all';

  function filterPosts(tag, btn) {
    activeFilter = tag;
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    renderPosts();
  }

  function runSnippet(idx) {
    const p = posts[idx];
    const outEl = document.getElementById('out-' + idx);
    try {
      const fn = new Function(p.code);
      outEl.textContent = '> ' + fn();
    } catch (err) {
      outEl.textContent = 'Erro: ' + err.message;
    }
    outEl.style.display = 'block';
  }

  function renderPosts() {
    const container = document.getElementById('posts');
    container.innerHTML = posts
      .map((p, i) => ({ ...p, i }))
      .filter(p => activeFilter === 'all' || p.tag === activeFilter)
      .map(p => \`
        <article class="card">
          <div class="meta">\${p.tag}</div>
          <h2>\${p.title}</h2>
          <p>\${p.summary}</p>
          <pre>\${p.code}</pre>
          <button class="run-btn" onclick="runSnippet(\${p.i})">▶ Executar Trecho</button>
          <div id="out-\${p.i}" class="output"></div>
        </article>
      \`).join('');
  }

  renderPosts();
</script>
</body>
</html>`;

export const STARTER_EXAMPLES: Creation[] = [
  {
    id: 'example-vibecode-blog',
    name: 'Notas Vibecode',
    html: vibecodeBlogHtml,
    timestamp: new Date('2025-05-01T10:30:00Z'),
  },
  {
    id: 'example-cassette-deck',
    name: 'Toca-Fitas Cassete',
    html: cassetteHtml,
    timestamp: new Date('2025-05-01T09:15:00Z'),
  },
  {
    id: 'example-chess-board',
    name: 'Xadrez Interativo',
    html: chessHtml,
    timestamp: new Date('2025-05-01T08:00:00Z'),
  },
];
