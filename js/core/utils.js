export const CATEGORIAS = {
  comida: { label: 'Comida', className: 'cat-comida' },
  bebida: { label: 'Bebida', className: 'cat-bebida' },
  alcoholica: { label: 'Bebida Alcohólica', className: 'cat-alcoholica' },
  dulces: { label: 'Dulces', className: 'cat-dulces' }
};

export function barajar(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function genUID() {
  return Math.random().toString(36).slice(2, 10);
}

export function genCodigo() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 5; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export function findCartaById(cartas, id) {
  return cartas.find(c => c.id === id) || null;
}
