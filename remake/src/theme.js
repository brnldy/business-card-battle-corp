// Tema visual do jogo: porão de escritório escuro, sujo, uma luminária industrial balançando sobre a mesa.
export const T = {
  label: 'Buckshot',
  bg: 0x040605, fog: [0x060a08, 0.03],
  hemi: [0x6f9a86, 0x0a0f0c, 0.05], lamp: { color: 0xf5a466, intensity: 420, pos: [0, 5.4, 0.2], angle: 0.6, penumbra: 0.75, decay: 1.5, sway: true },
  fill: [0x9fe8d2, 6], crt: 0x9dffb8, face: [0.55, 1.0, 0.62],
  // pós-processamento. Visual de 28/11 (look 1), a partir do Buckshot Roulette: 540 linhas, ACES, brilho 1,49, contraste 0,8,
  // saturação 0,26 e 7 degraus por canal no fim; sem brilho estourado, aberração nem tremor. Os demais valores servem ao antigo (look 0).
  post: { look: 1, bright: 1.49, contrast: 0.8, sat2: 0.26, steps: 7, levels: [48, 24, 13], grain: [0.04, 0.07, 0.1], lines: [0, 720, 540], sat: 0.8, vig: 1.25, aberr: 0, bloom: 0, shadow: [-0.016, 0.012, 0.0], high: [0.035, 0.014, -0.035], scan: 0.07, wobble: 0 },
  card: { lit: 0x8a8a8a, table: 0.2 },
  glow: { play: 0x7fe08a, pick: 0xf2c94c },
};
