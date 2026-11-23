// Dois temas visuais sobre o mesmo jogo. O tema vem do build (window.__THEME__) ou de ?theme= no modo dev.
const q = new URLSearchParams(location.search).get('theme');
export const THEME = q === 'buckshot' || q === 'severance' ? q : (window.__THEME__ ?? 'severance');
export const BUCKSHOT = THEME === 'buckshot';

export const T = BUCKSHOT ? {
  // porão de escritório: escuro, sujo, uma luminária industrial balançando sobre a mesa
  label: 'Buckshot',
  bg: 0x040605, fog: [0x060a08, 0.03],
  hemi: [0x6f9a86, 0x0a0f0c, 0.13], lamp: { color: 0xffd9a8, intensity: 300, pos: [0, 5.4, 0.2], angle: 0.6, penumbra: 0.75, decay: 1.5, sway: true },
  fill: [0x9fe8d2, 11], crt: 0x9dffb8, face: [0.55, 1.0, 0.62],
  post: { levels: [48, 24, 13], grain: [0.04, 0.07, 0.1], lines: [0, 560, 400], sat: 0.8, vig: 1.25, aberr: 0.0024, bloom: 0.7, shadow: [-0.016, 0.012, 0.0], high: [0.035, 0.014, -0.035], scan: 0.07, wobble: 0.0011 },
  card: { lit: 0x8a8a8a, table: 0.2 },
  glow: { play: 0x7fe08a, pick: 0xf2c94c },
} : {
  // andar seccionado: frio, simétrico, limpo — com o brilho azul dos terminais
  label: 'Severance',
  bg: 0x0c1512, fog: [0x101c17, 0.02],
  hemi: [0xdcefe6, 0x16332a, 0.22], lamp: { color: 0xf1fff7, intensity: 215, pos: [0, 7.3, 0.6], angle: 0.66, penumbra: 0.9, decay: 1.35, sway: false },
  fill: [0xdff5ea, 30], crt: 0x8fdcff, face: [0.62, 0.93, 1.0],
  post: { levels: [64, 32, 16], grain: [0.016, 0.03, 0.05], lines: [0, 620, 430], sat: 0.98, vig: 0.95, aberr: 0.0011, bloom: 1.15, shadow: [-0.012, 0.004, 0.02], high: [-0.008, 0.004, 0.012], scan: 0.022, wobble: 0.00018 },
  card: { lit: 0x5c5c5c, table: 0.28 },
  glow: { play: 0x6fe89a, pick: 0x9fe8ff },
};
