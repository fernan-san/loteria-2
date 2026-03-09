export const G = {
  mazo: [],
  jugadas: [],
  cartaActual: null,
  tableros: [],
  numTableros: 0,
  jugadores: [],
  turnoIdx: 0,
  timerSeg: 0,
  timerInterval: null,
  juegoActivo: false
};

export const MP = {
  modo: 'solo',
  salaId: null,
  uid: null,
  esHost: false,
  numEsperados: 2,
  listeners: []
};

export function stopTimer() {
  if (G.timerInterval) {
    clearInterval(G.timerInterval);
    G.timerInterval = null;
  }
}

export function resetGameState() {
  stopTimer();
  G.mazo = [];
  G.jugadas = [];
  G.cartaActual = null;
  G.tableros = [];
  G.numTableros = 0;
  G.jugadores = [];
  G.turnoIdx = 0;
  G.timerSeg = 0;
  G.juegoActivo = false;
}

export function resetMultiplayerState() {
  MP.modo = 'solo';
  MP.salaId = null;
  MP.uid = null;
  MP.esHost = false;
  MP.numEsperados = 2;
  MP.listeners = [];
}
