// Sujeira do mundo (28/11). A arte de referência é "suja" na superfície dos objetos, não só no ruído da tela: paredes com
// manchas e escorridos, barro subindo do chão, poeira no que fica virado para cima, grão fino em tudo. Aqui isso vira um
// remendo nos materiais iluminados (Lambert, Phong, Standard) de uma cena inteira: o shader calcula a sujeira pela posição
// e pela normal no mundo, então vale para qualquer modelo, sem textura nova e sem costura entre peças.
// As cartas do duelo e o que é luz (materiais sem iluminação) ficam de fora. A força é uma só para o jogo todo (WEATHER).
import * as THREE from 'three';
import { cardMats } from './gfx.js';

export const WEATHER = { uGrime: { value: 1 } };

const NOISE = /* glsl */ `
  varying vec3 vGrimeP; varying vec3 vGrimeN; uniform float uGrime, uGrimeS, uGrimeG;
  float gH(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float gN(vec3 x) {
    vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(gH(i), gH(i + vec3(1, 0, 0)), f.x), mix(gH(i + vec3(0, 1, 0)), gH(i + vec3(1, 1, 0)), f.x), f.y),
               mix(mix(gH(i + vec3(0, 0, 1)), gH(i + vec3(1, 0, 1)), f.x), mix(gH(i + vec3(0, 1, 1)), gH(i + vec3(1, 1, 1)), f.x), f.y), f.z);
  }
  float gF(vec3 p) { return gN(p) * 0.55 + gN(p * 2.07 + 3.1) * 0.28 + gN(p * 4.3 + 7.7) * 0.17; }
`;

// as escalas estão em metros e pensadas para a tela pixelada (uns 40 pixels por metro a 10 m): detalhe menor que isso some
const GRIME = /* glsl */ `
  {
    vec3 gp = vGrimeP * uGrimeS, gn = normalize(vGrimeN);
    float up = gn.y, wall = 1.0 - abs(up);
    float mott = gF(gp * 0.32);                                            // manchas grandes
    float blot = gF(gp * 1.1 + 11.0);                                      // manchas menores
    float streak = gF(vec3(gp.x * 2.4, gp.y * 0.14, gp.z * 2.4) + 5.0);    // escorrido: esticado na vertical
    float grit = gN(gp * 3.2) * 0.6 + gN(gp * 7.5) * 0.4;                  // grão (ainda visível na tela pixelada)
    float wear = gF(gp * 0.75 + 20.0);                                     // desgaste: tinta e reboco gastos
    float foot = 1.0 - smoothstep(0.0, 0.6 + mott * 1.4, (vGrimeP.y - uGrimeG) * uGrimeS); // barro subindo do chão
    float dirt = smoothstep(0.38, 0.72, mott) * 0.5 + smoothstep(0.48, 0.78, blot) * 0.28
               + smoothstep(0.46, 0.72, streak) * wall * 0.62 + foot * wall * 0.6 + (grit - 0.5) * 0.5;
    dirt = clamp(dirt * uGrime, 0.0, 0.9);
    vec3 base = diffuseColor.rgb;
    float lum = dot(base, vec3(0.3, 0.59, 0.11));
    // desgaste claro antes da sujeira: a superfície perde a cor e clareia em placas (aparece o que está por baixo)
    float worn = smoothstep(0.6, 0.78, wear) * (0.5 + 0.5 * wall) * 0.45 * uGrime;
    base = mix(base, vec3(lum) * vec3(1.12, 1.04, 0.9) + 0.04, worn);
    // a sujeira escurece puxando para o marrom (fuligem e barro), sem apagar a cor de baixo
    base = mix(base, base * vec3(0.34, 0.29, 0.22), dirt);
    // poeira no que fica virado para cima: clareia e tira a cor, em manchas
    float dust = smoothstep(0.55, 0.95, up) * smoothstep(0.4, 0.8, blot) * 0.35 * uGrime;
    base = mix(base, vec3(dot(base, vec3(0.3, 0.59, 0.11))) * vec3(1.06, 1.0, 0.9) + 0.03, dust);
    diffuseColor.rgb = base;
  }
`;

function patch(mat, scale, ground) {
  if (!mat || mat.userData.weathered || mat.userData.noGrime || cardMats.has(mat)) return;
  if (!(mat.isMeshLambertMaterial || mat.isMeshPhongMaterial || mat.isMeshStandardMaterial)) return;
  mat.userData.weathered = true;
  const prev = mat.onBeforeCompile, prevKey = mat.customProgramCacheKey();
  mat.onBeforeCompile = (sh, r) => {
    prev.call(mat, sh, r);
    sh.uniforms.uGrime = WEATHER.uGrime; sh.uniforms.uGrimeS = { value: scale }; sh.uniforms.uGrimeG = { value: ground };
    sh.vertexShader = 'varying vec3 vGrimeP; varying vec3 vGrimeN;\n' + sh.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
      vec4 grimeW = vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
        grimeW = instanceMatrix * grimeW;
      #endif
      grimeW = modelMatrix * grimeW; vGrimeP = grimeW.xyz; vGrimeN = normalize(mat3(modelMatrix) * objectNormal);`);
    sh.fragmentShader = NOISE + sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n' + GRIME);
  };
  mat.customProgramCacheKey = () => `${prevKey}|grime`;
  mat.needsUpdate = true;
}

/** suja todos os materiais iluminados de uma cena (scale: tamanho das manchas, 1 = cena em metros; ground: altura do chão) */
export function weather(root, { scale = 1, ground = 0 } = {}) {
  root.traverse((o) => { if (o.isMesh) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => patch(m, scale, ground)); });
}
