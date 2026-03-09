const cache = new Map();

export function svgPattern(cat, w = 200, h = 300) {
  const key = `${cat}-${w}-${h}`;
  if (cache.has(key)) return cache.get(key);

  const palette = {
    comida: ['#0D3320', '#27AE60', '#D4A017', '🌿'],
    bebida: ['#064E4E', '#27C5C4', '#D4A017', '💧'],
    alcoholica: ['#1E0830', '#9B59B6', '#D4A017', '🌙'],
    dulces: ['#5C1A00', '#E67E22', '#D4A017', '🌸']
  }[cat] || ['#0D3320', '#27AE60', '#D4A017', '🌿'];

  const [bg, accent, gold, icon] = palette;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 200 300">
    <rect width="200" height="300" fill="${bg}"/>
    <defs>
      <pattern id="p-${cat}" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
        <rect width="32" height="32" fill="${bg}"/>
        <circle cx="16" cy="16" r="10" fill="none" stroke="${accent}" stroke-width="1.2"/>
        <circle cx="16" cy="16" r="5" fill="none" stroke="${gold}" stroke-width=".9"/>
        <circle cx="16" cy="16" r="2" fill="${gold}"/>
      </pattern>
    </defs>
    <rect width="200" height="300" fill="url(#p-${cat})"/>
    <rect x="8" y="8" width="184" height="284" fill="none" stroke="${gold}" opacity=".35"/>
    <text x="100" y="156" font-family="serif" font-size="38" text-anchor="middle" dominant-baseline="middle" fill="${gold}" opacity=".35">${icon}</text>
  </svg>`;
  cache.set(key, svg);
  return svg;
}
