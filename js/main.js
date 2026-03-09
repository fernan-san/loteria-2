import { CARTAS } from './data/cartas.js';
import { G, MP, stopTimer, resetGameState } from './core/state.js';
import { initFirebase } from './services/firebase.js';
import { showScreen } from './ui/navigation.js';
import { svgPattern } from './lib/patterns.js';
import { ensureAudioReady, playDraw, playFlip, playWin, playTimerWarn } from './lib/audio.js';
import {
  showToast,
  renderTurno,
  renderDeckCount,
  setDrawButtonDisabled,
  renderMainCard,
  abrirModal,
  cerrarModal,
  mostrarVictoria,
  cerrarVictoria
} from './ui/render.js';
import { iniciarJuegoLocal, sacarCartaLocal } from './game/local.js';
import { crearSala, unirseSala, escucharLobby, escucharInicioPartida, iniciarPartidaHost, sacarCartaFirebase, registrarFlip, salirSala, limpiarListeners } from './game/multiplayer.js';
import { CATEGORIAS } from './core/utils.js';

initFirebase();

let numMPSeleccionado = 2;
let accessMode = false;

function updateTimerUI(remaining, total) {
  const circ = document.getElementById('timerCircle');
  const txt  = document.getElementById('timerText');
  const circumference = 2 * Math.PI * 34;
  circ.style.strokeDashoffset = circumference * (1 - remaining / total);
  circ.style.stroke = remaining <= 5 ? '#E74C3C' : (remaining <= 10 ? '#F39C12' : '#D4A017');
  txt.textContent = remaining;
}

function startTimer(seg) {
  stopTimer();
  if (!seg) return;
  let remaining = seg;
  updateTimerUI(remaining, seg);
  G.timerInterval = setInterval(() => {
    remaining--;
    updateTimerUI(remaining, seg);
    if (remaining <= 3 && remaining > 0) playTimerWarn();
    if (remaining <= 0) {
      stopTimer();
      setDrawButtonDisabled(false);
    }
  }, 1000);
}

function checkWin(tablero) {
  return tablero.flipped.size === 16;
}

function renderTableros(animate = false) {
  const zone = document.getElementById('tablerosZone');
  zone.innerHTML = '';

  G.tableros.forEach((tablero, ti) => {
    const wrap = document.createElement('div');
    wrap.className = 'tablero-wrap' + (tablero.completado ? ' winner' : '');

    if (tablero.completado) {
      const banner = document.createElement('div');
      banner.className = 'winner-banner';
      banner.textContent = '✦ ¡LOTERÍA! ✦';
      wrap.appendChild(banner);
      wrap.style.paddingTop = '2.2rem';
    }

    const top = document.createElement('div');
    top.className = 'tablero-top';
    top.innerHTML = `<div class="tablero-name">Tablero ${ti + 1}</div><div class="tablero-owner">${tablero.ownerName || ''}</div>`;
    wrap.appendChild(top);

    const pct = (tablero.flipped.size / 16 * 100).toFixed(0);
    const pb = document.createElement('div');
    pb.className = 'progress-bar';
    const pf = document.createElement('div');
    pf.className = 'progress-fill';
    pf.style.width = pct + '%';
    pb.appendChild(pf);
    wrap.appendChild(pb);

    const grid = document.createElement('div');
    grid.className = 'tablero-grid';

    tablero.celdas.forEach((carta, ci) => {
      const isFlipped = tablero.flipped.has(carta.id);
      const isActive = G.cartaActual && G.cartaActual.id === carta.id && !isFlipped && !tablero.completado;

      const scene = document.createElement('div');
      scene.className = 'cell-scene' + (animate ? ' entering' : '');
      if (animate) scene.style.animationDelay = `${ci * 0.04}s`;

      const flipper = document.createElement('div');
      flipper.className = 'cell-flipper' + (isFlipped ? ' flipped' : '');

      const frontFace = document.createElement('div');
      frontFace.className = 'cell-face';
      const frontDiv = document.createElement('div');
      frontDiv.className = 'cell-front' + (isActive ? ' active' : '');
      frontDiv.innerHTML = `<div class="cell-emoji-sm">${carta.emoji}</div><div class="cell-name-sm">${carta.nombre}</div>`;
      if (isActive) {
        frontDiv.tabIndex = 0;
        frontDiv.addEventListener('click', () => voltearCelda(ti, carta.id));
        frontDiv.addEventListener('keydown', e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            voltearCelda(ti, carta.id);
          }
        });
      }
      frontFace.appendChild(frontDiv);

      const backFace = document.createElement('div');
      backFace.className = 'cell-face cell-back-face';
      const backDiv = document.createElement('div');
      backDiv.className = `cell-back back-${carta.cat}`;
      backDiv.innerHTML = `
        <div class="cell-back-pattern">${svgPattern(carta.cat, 100, 140)}</div>
        <div class="cell-back-emoji">${carta.emoji}</div>
        <div class="cell-back-name">${carta.nombre}</div>
        <div class="cell-back-region">📍 ${carta.region.split('/')[0].trim()}</div>`;
      if (isFlipped) backDiv.addEventListener('click', () => abrirModal(carta));
      backFace.appendChild(backDiv);

      flipper.appendChild(frontFace);
      flipper.appendChild(backFace);
      scene.appendChild(flipper);
      grid.appendChild(scene);
    });

    wrap.appendChild(grid);
    zone.appendChild(wrap);
  });
}

async function voltearCelda(ti, cartaId) {
  const tablero = G.tableros[ti];
  if (!tablero || tablero.flipped.has(cartaId) || tablero.completado) return;

  await ensureAudioReady();
  playFlip();
  tablero.flipped.add(cartaId);
  renderTableros(false);

  const carta = CARTAS.find(c => c.id === cartaId);
  setTimeout(() => abrirModal(carta), 400);

  let ganadorNombre = null;
  if (checkWin(tablero)) {
    tablero.completado = true;
    ganadorNombre = tablero.ownerName || 'Un jugador';
    G.juegoActivo = false;
    stopTimer();
    renderTableros(false);
  }

  if (MP.modo !== 'solo' && MP.salaId) {
    await registrarFlip(cartaId, ganadorNombre);
  } else if (ganadorNombre) {
    playWin();
    mostrarVictoria(`${ganadorNombre} ganó. La gastronomía chiapaneca te ha coronado.`);
  } else if (!G.timerInterval && G.mazo.length > 0) {
    setDrawButtonDisabled(false);
  }
}

function renderEnciclopedia(cat) {
  document.querySelectorAll('.f-btn').forEach(b => b.classList.toggle('active', b.dataset.cat === cat));
  const grid = document.getElementById('encGrid');
  grid.innerHTML = '';
  const lista = cat === 'todos' ? CARTAS : CARTAS.filter(c => c.cat === cat);

  lista.forEach(carta => {
    const card = document.createElement('div');
    card.className = 'enc-card';
    card.innerHTML = `
      <div class="enc-card-top">
        <div class="enc-emoji">${carta.emoji}</div>
        <div class="enc-info">
          <div class="enc-name">${carta.nombre}</div>
          <div class="enc-region">📍 ${carta.region}</div>
          <span class="enc-badge ${CATEGORIAS[carta.cat].className}">${CATEGORIAS[carta.cat].label}</span>
        </div>
      </div>
      <div class="enc-card-body">${carta.origen}</div>`;
    card.addEventListener('click', () => abrirModal(carta));
    grid.appendChild(card);
  });
}

function renderDebugGrid() {
  const grid = document.getElementById('debugGrid');
  grid.innerHTML = '';
  CARTAS.forEach(carta => {
    const card = document.createElement('div');
    card.className = 'debug-card';
    card.innerHTML = `
      <div class="debug-card-emo">${carta.emoji}</div>
      <div class="debug-card-name">${carta.nombre}</div>
      <span class="debug-card-cat ${CATEGORIAS[carta.cat].className}">${CATEGORIAS[carta.cat].label}</span>`;
    card.addEventListener('click', () => debugFlipCard(carta));
    grid.appendChild(card);
  });
}

function debugFlipCard(carta) {
  const preview = document.getElementById('debugPreview');
  const flipper = document.getElementById('debugFlipper');
  const front = document.getElementById('debugFront');
  const back = document.getElementById('debugBack');
  const infoBox = document.getElementById('debugInfoBox');

  flipper.style.transition = 'none';
  flipper.classList.remove('flipped');
  infoBox.classList.remove('visible');
  preview.style.display = 'block';

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      flipper.style.transition = '';
      back.innerHTML = svgPattern(carta.cat);
      front.innerHTML = `
        <div class="card-border-pat"></div>
        <div class="card-corner-txt">${CATEGORIAS[carta.cat].label}</div>
        <div class="card-emoji-big">${carta.emoji}</div>
        <div class="card-name-big">${carta.nombre}</div>
        <div class="card-region-txt">📍 ${carta.region}</div>
        <span class="cat-badge ${CATEGORIAS[carta.cat].className}">${CATEGORIAS[carta.cat].label}</span>`;
      flipper.classList.add('flipped');
      setTimeout(() => {
        flipper.classList.remove('flipped');
        setTimeout(() => {
          document.getElementById('debugInfoName').textContent = `${carta.emoji} ${carta.nombre}`;
          document.getElementById('debugInfoRegion').textContent = `📍 ${carta.region}`;
          document.getElementById('debugInfoOrigen').textContent = carta.origen;
          document.getElementById('debugInfoElab').textContent = carta.elaboracion;
          infoBox.classList.add('visible');
        }, 650);
      }, 650);

      preview.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  });
}

function setModoPanel(modo) {
  MP.modo = modo;
  document.querySelectorAll('.modo-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.setup-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('modo' + modo.charAt(0).toUpperCase() + modo.slice(1)).classList.add('active');
  document.getElementById('panel' + modo.charAt(0).toUpperCase() + modo.slice(1)).classList.add('active');
}

function checkCanStartSolo() {
  const nombre = document.getElementById('inputSoloNombre').value.trim();
  document.getElementById('btnStartSolo').disabled = !(nombre.length > 0);
}

function checkCanCrear() {
  const nombre = document.getElementById('inputHostNombre').value.trim();
  document.getElementById('btnCrearSala').disabled = !(nombre.length > 0 && numMPSeleccionado >= 2);
}

function checkCanUnirse() {
  const nombre = document.getElementById('inputJoinNombre').value.trim();
  const codigo = document.getElementById('inputCodigo').value.trim();
  document.getElementById('btnUnirse').disabled = !(nombre.length > 0 && codigo.length === 5);
}

async function handleDraw() {
  await ensureAudioReady();
  if (!G.juegoActivo) return;
  if (MP.modo === 'solo') {
    sacarCartaLocal({ svgPattern, renderTableros, playDraw, startTimer });
  } else {
    playDraw();
    await sacarCartaFirebase();
    if (G.timerSeg > 0) {
      setDrawButtonDisabled(true);
      startTimer(G.timerSeg);
    }
  }
}

function resetToMenu() {
  stopTimer();
  limpiarListeners();
  resetGameState();
  renderMainCard(null, svgPattern);
  renderDeckCount(CARTAS.length);
  showScreen('s-menu');
}

document.getElementById('btnEnciclopedia').onclick = () => { renderEnciclopedia('todos'); showScreen('s-enciclopedia'); };
document.getElementById('btnEncBack').onclick = () => showScreen('s-menu');
document.getElementById('btnNuevoJuego').onclick = () => document.getElementById('setupCard').scrollIntoView({ behavior:'smooth' });
document.getElementById('btnDebug').onclick = () => { renderDebugGrid(); showScreen('s-debug'); };
document.getElementById('btnDebugBack').onclick = () => showScreen('s-menu');

document.getElementById('btnJuegoMenu').onclick = async () => {
  if (G.juegoActivo && !confirm('Salir al menú terminará la partida actual. ¿Continuar?')) return;
  if (MP.modo !== 'solo') await salirSala();
  resetToMenu();
};

document.getElementById('winBtn').onclick = async () => {
  cerrarVictoria();
  if (MP.modo !== 'solo') await salirSala();
  resetToMenu();
};

document.getElementById('btnDisconnectMenu').onclick = async () => {
  document.getElementById('disconnectOverlay').classList.remove('open');
  if (MP.modo !== 'solo') await salirSala();
  resetToMenu();
};

document.getElementById('modoSolo').onclick = () => setModoPanel('solo');
document.getElementById('modoCrear').onclick = () => setModoPanel('crear');
document.getElementById('modoUnirse').onclick = () => setModoPanel('unirse');


document.querySelectorAll('.t-btn-mp').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.t-btn-mp').forEach(b => b.classList.remove('sel'));
    btn.classList.add('sel');
    numMPSeleccionado = parseInt(btn.dataset.n, 10);
    checkCanCrear();
  });
});

document.getElementById('inputSoloNombre').addEventListener('input', checkCanStartSolo);
document.getElementById('inputHostNombre').addEventListener('input', checkCanCrear);
document.getElementById('inputJoinNombre').addEventListener('input', checkCanUnirse);
document.getElementById('inputCodigo').addEventListener('input', e => {
  e.target.value = e.target.value.toUpperCase();
  checkCanUnirse();
});

document.getElementById('btnStartSolo').addEventListener('click', async () => {
  await ensureAudioReady();
  const nombre = document.getElementById('inputSoloNombre').value.trim();
  const timerSeg = parseInt(document.getElementById('timerSelect').value, 10);

  iniciarJuegoLocal({
    cartas: CARTAS,
    jugadores: [nombre],
    numTableros: 1,
    timerSeg,
    svgPattern,
    renderTableros
  });

  document.getElementById('timerRingWrap').classList.toggle('visible', timerSeg > 0);
  renderTurno(nombre);
  showScreen('s-juego');
});

document.getElementById('btnCrearSala').addEventListener('click', async () => {
  const nombre = document.getElementById('inputHostNombre').value.trim();
  const timerSeg = parseInt(document.getElementById('timerSelectMP').value, 10);
  const codigo = await crearSala({ nombre, numJugadores: numMPSeleccionado, timerSeg });
  if (!codigo) return;
  document.getElementById('lobbyCodigo').textContent = codigo;
  escucharLobby(codigo);
  escucharInicioPartida(codigo, { cartas: CARTAS, svgPattern, renderTableros, startTimer, playWin });
  showScreen('s-lobby');
});

document.getElementById('btnUnirse').addEventListener('click', async () => {
  const nombre = document.getElementById('inputJoinNombre').value.trim();
  const codigo = document.getElementById('inputCodigo').value.trim().toUpperCase();
  const ok = await unirseSala({ nombre, codigo });
  if (!ok) return;
  document.getElementById('lobbyCodigo').textContent = codigo;
  escucharLobby(codigo);
  escucharInicioPartida(codigo, { cartas: CARTAS, svgPattern, renderTableros, startTimer, playWin });
  showScreen('s-lobby');
});

document.getElementById('lobbyStartBtn').addEventListener('click', async () => {
  await iniciarPartidaHost(CARTAS);
});

document.getElementById('btnLobbyCancel').addEventListener('click', async () => {
  await salirSala();
  showScreen('s-menu');
});

document.getElementById('drawBtn').addEventListener('click', handleDraw);

document.getElementById('accessToggle').addEventListener('click', () => {
  accessMode = !accessMode;
  document.getElementById('toggleBox').classList.toggle('on', accessMode);
  document.body.classList.toggle('accesible', accessMode);
});

document.querySelectorAll('.f-btn').forEach(btn => {
  btn.addEventListener('click', () => renderEnciclopedia(btn.dataset.cat));
});

document.getElementById('modalClose').addEventListener('click', cerrarModal);
document.getElementById('modalOverlay').addEventListener('click', e => {
  if (e.target === document.getElementById('modalOverlay')) cerrarModal();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') cerrarModal();
});

document.getElementById('debugBtnReset').addEventListener('click', () => {
  document.getElementById('debugFlipper').classList.remove('flipped');
  document.getElementById('debugInfoBox').classList.remove('visible');
});

renderEnciclopedia('todos');
renderDeckCount(CARTAS.length);
renderMainCard(null, svgPattern);
