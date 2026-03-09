import { CATEGORIAS } from '../core/utils.js';

let toastTimer = null;
let hostInfoLabel = null;

export function showToast(msg, isError = false) {
  let t = document.getElementById('globalToast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'globalToast';
    t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.className = 'toast' + (isError ? ' error' : '');
  requestAnimationFrame(() => t.classList.add('show'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
}

export function renderTurno(nombre) {
  document.getElementById('turnName').textContent = nombre || '—';
}

export function renderDeckCount(count) {
  document.getElementById('deckCountLabel').textContent = `${count} cartas`;
}

export function clearPlayedChips() {
  document.getElementById('playedChips').innerHTML = '';
}

export function addPlayedChip(carta) {
  const chip = document.createElement('span');
  chip.className = 'p-chip';
  chip.textContent = carta.emoji;
  chip.title = carta.nombre;
  document.getElementById('playedChips').appendChild(chip);
}

export function showHostInfoLabel() {
  if (hostInfoLabel) return;
  hostInfoLabel = document.createElement('div');
  hostInfoLabel.className = 'host-info-label';
  hostInfoLabel.style.cssText = 'font-family:Alegreya SC,serif;font-size:.75rem;letter-spacing:.1rem;color:rgba(212,160,23,.5);text-align:center;margin-bottom:.7rem;';
  hostInfoLabel.textContent = 'El anfitrión controla el mazo';
  document.getElementById('drawBtn').insertAdjacentElement('beforebegin', hostInfoLabel);
}

export function removeHostInfoLabel() {
  if (hostInfoLabel) {
    hostInfoLabel.remove();
    hostInfoLabel = null;
  }
}

export function setDrawButtonVisible(visible) {
  document.getElementById('drawBtn').style.display = visible ? 'block' : 'none';
}

export function setDrawButtonDisabled(disabled) {
  document.getElementById('drawBtn').disabled = disabled;
}

export function renderMainCard(carta, svgPattern) {
  const flipper = document.getElementById('mainCardFlipper');
  const front = document.getElementById('mainCardFront');
  const back = document.getElementById('mainCardBack');

  if (!carta) {
    flipper.classList.remove('flipped');
    front.innerHTML = `<div class="card-border-pat"></div>
      <div class="card-placeholder-wrap"><div class="ph-icon">🌿</div><div>Presiona "Sacar Carta"</div></div>`;
    return;
  }

  back.innerHTML = svgPattern(carta.cat);
  flipper.classList.add('flipped');

  setTimeout(() => {
    front.innerHTML = `
      <div class="card-border-pat"></div>
      <div class="card-corner-txt">${CATEGORIAS[carta.cat].label}</div>
      <div class="card-emoji-big">${carta.emoji}</div>
      <div class="card-name-big">${carta.nombre}</div>
      <div class="card-region-txt">📍 ${carta.region}</div>
      <span class="cat-badge ${CATEGORIAS[carta.cat].className}">${CATEGORIAS[carta.cat].label}</span>`;
    flipper.classList.remove('flipped');
  }, 650);
}

export function abrirModal(carta) {
  const cat = CATEGORIAS[carta.cat];
  document.getElementById('mEmo').textContent = carta.emoji;
  document.getElementById('mName').textContent = carta.nombre;
  const catEl = document.getElementById('mCat');
  catEl.textContent = cat.label;
  catEl.className = `modal-badge ${cat.className}`;
  document.getElementById('mRegion').textContent = '📍 ' + carta.region;
  document.getElementById('mOrigen').textContent = carta.origen;
  document.getElementById('mElab').textContent = carta.elaboracion;
  document.getElementById('mCurioso').textContent = carta.curioso;
  document.getElementById('modalOverlay').classList.add('open');
}

export function cerrarModal() {
  document.getElementById('modalOverlay').classList.remove('open');
}

export function mostrarVictoria(msg) {
  document.getElementById('winMsg').textContent = msg;
  document.getElementById('winOverlay').classList.add('open');
}

export function cerrarVictoria() {
  document.getElementById('winOverlay').classList.remove('open');
}

export function renderLobbyPlayers(lista) {
  const wrap = document.getElementById('lobbyPlayerList');
  wrap.innerHTML = '';
  lista.forEach(([uid, jug]) => {
    const row = document.createElement('div');
    row.className = 'lobby-player-row';
    row.innerHTML = `
      <div class="lobby-player-dot ${jug.esHost ? 'host' : ''}"></div>
      <div class="lobby-player-name">${jug.nombre}</div>
      ${jug.esHost ? '<div class="lobby-player-tag">Anfitrión</div>' : ''}`;
    wrap.appendChild(row);
  });
}
