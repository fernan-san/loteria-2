import { G, MP, resetGameState } from '../core/state.js';
import { barajar } from '../core/utils.js';
import {
  renderTurno,
  renderDeckCount,
  clearPlayedChips,
  setDrawButtonVisible,
  setDrawButtonDisabled,
  removeHostInfoLabel,
  renderMainCard,
  addPlayedChip
} from '../ui/render.js';

export function generarTablero(cartas) {
  return {
    celdas: barajar([...cartas]).slice(0, 16),
    flipped: new Set(),
    completado: false,
    ownerName: ''
  };
}

export function iniciarJuegoLocal({ cartas, jugadores, numTableros, timerSeg, svgPattern, renderTableros }) {
  resetGameState();
  MP.modo = 'solo';
  G.mazo = barajar([...cartas]);
  G.jugadas = [];
  G.cartaActual = null;
  G.tableros = Array.from({ length: numTableros }, () => generarTablero(cartas));
  G.numTableros = numTableros;
  G.jugadores = jugadores;
  G.turnoIdx = 0;
  G.timerSeg = timerSeg;
  G.juegoActivo = true;

  G.tableros.forEach(t => {
  t.ownerName = jugadores[0];
});

  renderDeckCount(G.mazo.length);
  clearPlayedChips();
  setDrawButtonVisible(true);
  setDrawButtonDisabled(false);
  removeHostInfoLabel();
  renderTurno(G.jugadores[0] || '—');
  renderMainCard(null, svgPattern);
  renderTableros(true);
}

export function sacarCartaLocal({ svgPattern, renderTableros, playDraw, startTimer }) {
  if (!G.juegoActivo || G.mazo.length === 0) return null;
  playDraw();
  const carta = G.mazo.pop();
  G.jugadas.push(carta);
  G.cartaActual = carta;
  renderDeckCount(G.mazo.length);
  addPlayedChip(carta);
  renderMainCard(carta, svgPattern);
  renderTableros(false);

  if (G.timerSeg > 0) {
    setDrawButtonDisabled(true);
    startTimer(G.timerSeg);
  } else if (G.mazo.length === 0) {
    setDrawButtonDisabled(true);
  }

  return carta;
}
