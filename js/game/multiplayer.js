import { G, MP, resetGameState, stopTimer, resetMultiplayerState } from '../core/state.js';
import { genUID, genCodigo, barajar } from '../core/utils.js';
import { getDB } from '../services/firebase.js';
import { showToast, renderLobbyPlayers, renderTurno, renderDeckCount, clearPlayedChips, setDrawButtonVisible, setDrawButtonDisabled, showHostInfoLabel, removeHostInfoLabel, renderMainCard, addPlayedChip, mostrarVictoria } from '../ui/render.js';
import { showScreen } from '../ui/navigation.js';

export function limpiarListeners() {
  MP.listeners.forEach(({ ref, listener, event }) => {
    try { ref.off(event, listener); } catch(e) {}
  });
  MP.listeners = [];
}

export async function crearSala({ nombre, numJugadores, timerSeg }) {
  const db = getDB();
  const uid = genUID();
  const codigo = genCodigo();
  MP.uid = uid;
  MP.salaId = codigo;
  MP.esHost = true;
  MP.numEsperados = numJugadores;
  MP.modo = 'host';
  const salaRef = db.ref(`salas/${codigo}`);
  const jugRef = db.ref(`salas/${codigo}/jugadores/${uid}`);

  try {
    await salaRef.set({ estado: 'lobby', anfitrion: uid, numJugadores, timerSeg, creado: Date.now() });
    await jugRef.set({ nombre, esHost: true, conectado: true, flipped: {} });
    jugRef.onDisconnect().update({ conectado: false });
    salaRef.onDisconnect().update({ estado: 'cancelada' });
    return codigo;
  } catch (err) {
    console.error(err);
    showToast('No se pudo crear la sala', true);
    return null;
  }
}

export async function unirseSala({ nombre, codigo }) {
  const db = getDB();
  const salaRef = db.ref(`salas/${codigo}`);
  try {
    const snap = await salaRef.once('value');
    if (!snap.exists()) return showToast('Sala no encontrada', true), false;
    const sala = snap.val();
    if (sala.estado !== 'lobby') return showToast('La partida ya comenzó o fue cancelada', true), false;
    const jugadores = sala.jugadores ? Object.keys(sala.jugadores) : [];
    if (jugadores.length >= sala.numJugadores) return showToast('La sala está llena', true), false;

    const uid = genUID();
    MP.uid = uid;
    MP.salaId = codigo;
    MP.esHost = false;
    MP.numEsperados = sala.numJugadores;
    MP.modo = 'join';

    const jugRef = db.ref(`salas/${codigo}/jugadores/${uid}`);
    await jugRef.set({ nombre, esHost: false, conectado: true, flipped: {} });
    jugRef.onDisconnect().update({ conectado: false });
    return true;
  } catch (err) {
    console.error(err);
    showToast('No se pudo unir a la sala', true);
    return false;
  }
}

export function escucharLobby(codigo) {
  const db = getDB();
  const jugRef = db.ref(`salas/${codigo}/jugadores`);
  const listener = jugRef.on('value', async snap => {
    const jugadores = snap.val() || {};
    const lista = Object.entries(jugadores).filter(([, j]) => j.conectado !== false);
    renderLobbyPlayers(lista);
    const salaSnap = await db.ref(`salas/${codigo}`).once('value');
    const data = salaSnap.val();
    if (!data) return;
    const listos = lista.length >= data.numJugadores;
    document.getElementById('lobbyStartBtn').classList.toggle('visible', MP.esHost && listos);
    document.getElementById('lobbyWaiting').style.display = listos ? 'none' : 'block';
  });
  MP.listeners.push({ ref: jugRef, listener, event: 'value' });
}

export function escucharInicioPartida(codigo, deps) {
  const db = getDB();
  const ref = db.ref(`salas/${codigo}/estado`);
  const listener = ref.on('value', snap => {
    if (snap.val() === 'jugando') iniciarJuegoFirebase(codigo, deps);
    if (snap.val() === 'cancelada') {
      document.getElementById('disconnectMsg').textContent = 'El anfitrión canceló la sala.';
      document.getElementById('disconnectOverlay').classList.add('open');
    }
  });
  MP.listeners.push({ ref, listener, event: 'value' });
}

export async function iniciarPartidaHost(cartas) {
  const db = getDB();
  const salaRef = db.ref(`salas/${MP.salaId}`);
  const snap = await salaRef.once('value');
  const sala = snap.val();
  const jugadores = Object.entries(sala.jugadores || {}).filter(([,j]) => j.conectado !== false);
  const mazo = barajar([...cartas]);
  const tableros = {};
  jugadores.forEach(([uid]) => { tableros[uid] = barajar([...cartas]).slice(0,16).map(c => c.id); });
  await salaRef.update({
    estado: 'jugando',
    mazo: mazo.map(c => c.id),
    cartaActual: null,
    jugadas: [],
    tableros,
    turno: jugadores[0][0]
  });
}

export async function iniciarJuegoFirebase(codigo, { cartas, svgPattern, renderTableros, startTimer, playWin }) {
  const db = getDB();
  resetGameState();
  const snap = await db.ref(`salas/${codigo}`).once('value');
  const sala = snap.val();
  const mazo = (sala.mazo || []).map(id => cartas.find(c => c.id === id)).filter(Boolean);
  const tableroIds = sala.tableros?.[MP.uid] || [];
  const celdas = tableroIds.map(id => cartas.find(c => c.id === id)).filter(Boolean);
  const jugadoresObj = sala.jugadores || {};
  const ownName = jugadoresObj?.[MP.uid]?.nombre || 'Jugador';

  G.mazo = [...mazo];
  G.tableros = [{ celdas, flipped: new Set(), completado: false, uid: MP.uid, ownerName: ownName }];
  G.jugadores = Object.values(jugadoresObj).map(j => j.nombre);
  G.turnoIdx = 0;
  G.timerSeg = sala.timerSeg || 0;
  G.juegoActivo = true;

  renderDeckCount(mazo.length);
  clearPlayedChips();
  renderTurno(ownName);
  renderMainCard(null, svgPattern);
  renderTableros(true);
  showScreen('s-juego');

  if (MP.esHost) {
    setDrawButtonVisible(true);
    setDrawButtonDisabled(false);
    removeHostInfoLabel();
  } else {
    setDrawButtonVisible(false);
    showHostInfoLabel();
  }

  document.getElementById('timerRingWrap').classList.toggle('visible', G.timerSeg > 0);

  const cartaRef = db.ref(`salas/${codigo}/cartaActual`);
  const cartaListener = cartaRef.on('value', async snap => {
    const id = snap.val();
    if (!id) return;
    const carta = cartas.find(c => c.id === id);
    if (!carta) return;
    G.cartaActual = carta;
    G.mazo = G.mazo.filter(c => c.id !== id);
    renderDeckCount(G.mazo.length);
    addPlayedChip(carta);
    renderMainCard(carta, svgPattern);
    renderTableros(false);
    if (G.timerSeg > 0) startTimer(G.timerSeg);
  });
  MP.listeners.push({ ref: cartaRef, listener: cartaListener, event: 'value' });

  const ganadorRef = db.ref(`salas/${codigo}/ganador`);
  const ganadorListener = ganadorRef.on('value', snap => {
    const ganador = snap.val();
    if (!ganador) return;
    stopTimer();
    G.juegoActivo = false;
    playWin();
    mostrarVictoria(`¡${ganador} ganó! La gastronomía chiapaneca los ha coronado.`);
  });
  MP.listeners.push({ ref: ganadorRef, listener: ganadorListener, event: 'value' });
}

export async function sacarCartaFirebase() {
  if (!MP.esHost || !MP.salaId) return;
  const db = getDB();
  const salaRef = db.ref(`salas/${MP.salaId}`);
  const snap = await salaRef.once('value');
  const sala = snap.val();
  if (!sala?.mazo?.length) return;

  const mazo = [...sala.mazo];
  const cartaId = mazo.pop();
  const jugadas = [...(sala.jugadas || []), cartaId];
  await salaRef.update({ mazo, jugadas, cartaActual: cartaId });
  if (!mazo.length) setDrawButtonDisabled(true);
}

export async function registrarFlip(cartaId, ganadorNombre) {
  if (!MP.salaId) return;
  const db = getDB();
  await db.ref(`salas/${MP.salaId}/jugadores/${MP.uid}/flipped/${cartaId}`).set(true);
  if (ganadorNombre) await db.ref(`salas/${MP.salaId}`).update({ ganador: ganadorNombre });
}

export async function salirSala() {
  const db = getDB();
  try {
    if (MP.salaId) {
      if (MP.esHost) {
        await db.ref(`salas/${MP.salaId}`).update({ estado: 'cancelada' });
      } else {
        await db.ref(`salas/${MP.salaId}/jugadores/${MP.uid}`).update({ conectado: false });
      }
    }
  } catch(e) {
    console.error(e);
  } finally {
    limpiarListeners();
    stopTimer();
    resetMultiplayerState();
  }
}
