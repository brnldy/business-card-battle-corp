// Tema visual do jogo: porão de escritório escuro, sujo, uma luminária industrial balançando sobre a mesa.
export const T = {
  label: 'Buckshot',
  bg: 0x040605, fog: [0x060a08, 0.03],
  hemi: [0x6f9a86, 0x0a0f0c, 0.13], lamp: { color: 0xffd9a8, intensity: 300, pos: [0, 5.4, 0.2], angle: 0.6, penumbra: 0.75, decay: 1.5, sway: true },
  fill: [0x9fe8d2, 11], crt: 0x9dffb8, face: [0.55, 1.0, 0.62],
  post: { levels: [48, 24, 13], grain: [0.04, 0.07, 0.1], lines: [0, 560, 400], sat: 0.8, vig: 1.25, aberr: 0.0024, bloom: 0.7, shadow: [-0.016, 0.012, 0.0], high: [0.035, 0.014, -0.035], scan: 0.07, wobble: 0.0011 },
  card: { lit: 0x8a8a8a, table: 0.2 },
  glow: { play: 0x7fe08a, pick: 0xf2c94c },
};
