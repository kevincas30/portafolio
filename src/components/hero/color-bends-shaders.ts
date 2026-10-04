/**
 * Adapted from ColorBends, React Bits — Copyright (c) 2026 David Haz.
 * MIT + Commons Clause; full required notice: /licenses/react-bits.txt.
 * https://github.com/DavidHDev/react-bits/blob/main/src/ts-default/Backgrounds/ColorBends/ColorBends.tsx
 * Adaptations: two bands only, weighted accent, transparent light-theme output.
 */
export const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}`;

export const fragmentShader = `
uniform vec2 uCanvas;
uniform float uTime;
uniform float uSpeed;
uniform vec2 uRot;
uniform vec3 uColors[2];
uniform float uScale;
uniform float uFrequency;
uniform float uWarpStrength;
uniform vec2 uPointer;
uniform float uMouseInfluence;
uniform float uParallax;
uniform int uIterations;
uniform float uIntensity;
uniform float uBandWidth;
uniform float uAccentWeight;
varying vec2 vUv;
void main() {
  float t = uTime * uSpeed;
  vec2 p = vUv * 2.0 - 1.0;
  p += uPointer * uParallax * 0.1;
  vec2 rp = vec2(p.x * uRot.x - p.y * uRot.y, p.x * uRot.y + p.y * uRot.x);
  vec2 q = vec2(rp.x * (uCanvas.x / uCanvas.y), rp.y);
  q /= max(uScale, 0.0001);
  q /= 0.5 + 0.2 * dot(q, q);
  q += 0.2 * cos(t) - 7.56;
  q += (uPointer - rp) * uMouseInfluence * 0.2;
  for (int j = 0; j < 5; j++) {
    if (j >= uIterations - 1) break;
    vec2 rr = sin(1.5 * (q.yx * uFrequency) + 2.0 * cos(q * uFrequency));
    q += (rr - q) * 0.15;
  }
  vec2 s = q;
  vec3 sumCol = vec3(0.0);
  float cover = 0.0;
  for (int i = 0; i < 2; i++) {
    s -= 0.01;
    vec2 r = sin(1.5 * (s.yx * uFrequency) + 2.0 * cos(s * uFrequency));
    float m0 = length(r + sin(5.0 * r.y * uFrequency - 3.0 * t + float(i)) / 4.0);
    float kBelow = clamp(uWarpStrength, 0.0, 1.0);
    float kMix = pow(kBelow, 0.3);
    float gain = 1.0 + max(uWarpStrength - 1.0, 0.0);
    vec2 warped = s + (r - s) * kBelow * gain;
    float m1 = length(warped + sin(5.0 * warped.y * uFrequency - 3.0 * t + float(i)) / 4.0);
    float m = mix(m0, m1, kMix);
    float w = 1.0 - exp(-uBandWidth / exp(uBandWidth * m));
    float weight = i == 0 ? 1.0 : uAccentWeight;
    sumCol += uColors[i] * w * weight;
    cover = max(cover, w * weight);
  }
  // Normalize before premultiplication: transparent edges do not create black
  // veils over the light theme. Geometry/flow are the original ColorBends math.
  vec3 col = clamp(sumCol / max(cover, 0.0001) * uIntensity, 0.0, 1.0);
  float alpha = clamp(cover, 0.0, 1.0);
  gl_FragColor = vec4(col * alpha, alpha);
}`;
