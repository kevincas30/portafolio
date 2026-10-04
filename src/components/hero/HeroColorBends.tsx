import { useEffect, useRef, type CSSProperties } from 'react';
import type { WebGLRenderer, ShaderMaterial, PlaneGeometry, Scene, OrthographicCamera, Vector3 } from 'three';
import { heroBackground as settings } from '../../config/hero-background';
import { fragmentShader, vertexShader } from './color-bends-shaders';

/** Decorative React island only. All hero content remains server-rendered Astro. */
export default function HeroColorBends() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasHostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const host = canvasHostRef.current;
    const hero = container?.closest<HTMLElement>('[data-hero-motion]');
    if (!settings.enabled || !container || !host || !hero) return;

    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const mobile = matchMedia('(max-width: 900px)');
    const pointer = matchMedia('(hover: hover) and (pointer: fine)');
    let active = true;
    let failed = false;
    let initializing = false;
    let visible = hero.getBoundingClientRect().bottom > 0 && hero.getBoundingClientRect().top < innerHeight;
    let raf = 0;
    let previousFrame = 0;
    let elapsed = 0;
    let canvas: HTMLCanvasElement | undefined;
    let renderer: WebGLRenderer | undefined;
    let material: ShaderMaterial | undefined;
    let geometry: PlaneGeometry | undefined;
    let scene: Scene | undefined;
    let camera: OrthographicCamera | undefined;
    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    const quality = () => mobile.matches ? settings.quality.mobile : settings.quality.desktop;
    const palette = () => document.documentElement.dataset.theme === 'dark'
      ? settings.colors.dark : settings.colors.light;
    const updateColor = (vector: Vector3, hex: string) => {
      const value = parseInt(hex.slice(1), 16);
      vector.set(((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255);
    };
    const canRun = () => active && !failed && !motion.matches && visible && !document.hidden;
    const state = (value: string) => { container.dataset.renderState = value; };

    const stop = () => { cancelAnimationFrame(raf); raf = 0; previousFrame = 0; };
    const releaseGraphics = () => {
      stop();
      canvas?.removeEventListener('webglcontextlost', contextLost);
      geometry?.dispose();
      material?.dispose();
      if (renderer) {
        const lost = renderer.getContext().isContextLost();
        renderer.dispose();
        if (!lost) renderer.forceContextLoss();
      }
      canvas?.remove();
      canvas = undefined; renderer = undefined; material = undefined;
      geometry = undefined; scene = undefined; camera = undefined;
    };
    const fallback = () => { failed = true; releaseGraphics(); state('fallback'); };
    const contextLost = (event: Event) => { event.preventDefault(); fallback(); };

    const updateReadingShield = () => {
      const rect = hero.getBoundingClientRect();
      const copy = hero.querySelector<HTMLElement>('.hero-copy')?.getBoundingClientRect();
      if (!copy) return;
      const edge = mobile.matches ? copy.bottom - rect.top + 12 : copy.right - rect.left;
      container.style.setProperty('--bends-copy-end', `${Math.max(0, edge)}px`);
      container.style.setProperty('--bends-copy-top', `${Math.max(0, copy.top - rect.top)}px`);
      container.style.setProperty('--bends-copy-bottom', `${Math.max(0, copy.bottom - rect.top)}px`);
    };
    const configure = () => {
      updateReadingShield();
      if (!material) return;
      material.uniforms.uIntensity.value = document.documentElement.dataset.theme === 'dark'
        ? settings.intensity.dark : settings.intensity.light;
      const colors = material.uniforms.uColors.value as Vector3[];
      palette().forEach((hex, index) => updateColor(colors[index], hex));
      material.uniforms.uIterations.value = quality().iterations;
      material.uniforms.uMouseInfluence.value = pointer.matches ? settings.mouseInfluence : 0;
      material.uniforms.uParallax.value = pointer.matches ? settings.parallax : 0;
      if (!pointer.matches) target.x = target.y = current.x = current.y = 0;
    };
    const resize = () => {
      configure();
      if (!renderer || !material) return;
      const width = Math.max(1, container.clientWidth);
      const height = Math.max(1, container.clientHeight);
      const q = quality();
      const ratio = Math.min(devicePixelRatio || 1, q.maxPixelRatio) * q.resolutionScale;
      const capped = Math.min(ratio, q.maxDimension / Math.max(width, height));
      renderer.setPixelRatio(1);
      renderer.setSize(Math.max(1, Math.round(width * capped)), Math.max(1, Math.round(height * capped)), false);
      material.uniforms.uCanvas.value.set(width, height);
    };

    const loop = (time: number) => {
      raf = 0;
      if (!canRun() || !renderer || !material || !scene || !camera) return;
      if (previousFrame && time - previousFrame < 1000 / quality().fps) {
        raf = requestAnimationFrame(loop); return;
      }
      const dt = previousFrame ? Math.min(.1, (time - previousFrame) / 1000) : 0;
      previousFrame = time;
      elapsed += dt;
      material.uniforms.uTime.value = elapsed;
      const smoothing = 1 - Math.exp(-dt * 2.5);
      current.x += (target.x - current.x) * smoothing;
      current.y += (target.y - current.y) * smoothing;
      material.uniforms.uPointer.value.set(current.x, current.y);
      try { renderer.render(scene, camera); }
      catch { fallback(); return; }
      if (canRun()) { state('running'); raf = requestAnimationFrame(loop); }
    };

    const initialize = async () => {
      if (!canRun() || initializing || renderer) return;
      initializing = true;
      try {
        // Reduced-motion users do not download Three.js or allocate a context.
        const THREE = await import('./three-runtime');
        if (!canRun()) return;
        canvas = document.createElement('canvas');
        const context = canvas.getContext('webgl2', {
          alpha: true, premultipliedAlpha: true, antialias: false,
          depth: false, stencil: false, powerPreference: 'low-power',
        });
        if (!context) { fallback(); return; }
        renderer = new THREE.WebGLRenderer({ canvas, context, alpha: true, antialias: false });
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.setClearColor(0x000000, 0);
        renderer.debug.onShaderError = () => fallback();
        scene = new THREE.Scene();
        camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        geometry = new THREE.PlaneGeometry(2, 2);
        const color = (hex: string) => {
          const n = parseInt(hex.slice(1), 16);
          return new THREE.Vector3(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
        };
        const angle = settings.rotation * Math.PI / 180;
        material = new THREE.ShaderMaterial({
          vertexShader, fragmentShader, transparent: true, premultipliedAlpha: true,
          depthTest: false, depthWrite: false,
          uniforms: {
            uCanvas: { value: new THREE.Vector2(1, 1) }, uTime: { value: elapsed },
            uSpeed: { value: settings.speed }, uRot: { value: new THREE.Vector2(Math.cos(angle), Math.sin(angle)) },
            uColors: { value: settings.colors.light.map(color) }, uScale: { value: settings.scale },
            uFrequency: { value: settings.frequency }, uWarpStrength: { value: settings.warpStrength },
            uPointer: { value: new THREE.Vector2(0, 0) }, uMouseInfluence: { value: 0 },
            uParallax: { value: 0 }, uIterations: { value: quality().iterations },
            uIntensity: { value: settings.intensity.light }, uBandWidth: { value: settings.bandWidth },
            uAccentWeight: { value: settings.accentWeight },
          },
        });
        scene.add(new THREE.Mesh(geometry, material));
        canvas.addEventListener('webglcontextlost', contextLost);
        host.append(canvas);
        resize();
      } catch { fallback(); }
      finally { initializing = false; if (active) sync(); }
    };

    const sync = () => {
      if (!active) return;
      if (failed) { state('fallback'); return; }
      if (motion.matches) { releaseGraphics(); state('static'); return; }
      if (!canRun()) { stop(); state(renderer ? 'paused' : 'static'); return; }
      if (!renderer) { void initialize(); return; }
      if (!raf) { previousFrame = 0; raf = requestAnimationFrame(loop); }
    };
    const move = (event: PointerEvent) => {
      if (!pointer.matches || motion.matches || event.pointerType === 'touch') return;
      const rect = hero.getBoundingClientRect();
      target.x = ((event.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
      target.y = 1 - ((event.clientY - rect.top) / Math.max(1, rect.height)) * 2;
    };
    const resetPointer = () => { target.x = target.y = 0; };
    const mediaChange = () => { resize(); sync(); };
    const visibility = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
    const sizing = new ResizeObserver(resize);
    const theme = new MutationObserver(configure);
    const dispose = () => {
      if (!active) return;
      active = false;
      visibility.disconnect(); sizing.disconnect(); theme.disconnect();
      motion.removeEventListener('change', mediaChange);
      mobile.removeEventListener('change', mediaChange);
      pointer.removeEventListener('change', mediaChange);
      document.removeEventListener('visibilitychange', sync);
      document.removeEventListener('astro:before-swap', dispose);
      hero.removeEventListener('pointermove', move);
      hero.removeEventListener('pointerleave', resetPointer);
      releaseGraphics();
      state('static');
    };

    visibility.observe(hero); sizing.observe(hero);
    const copy = hero.querySelector<HTMLElement>('.hero-copy');
    if (copy) sizing.observe(copy);
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    motion.addEventListener('change', mediaChange);
    mobile.addEventListener('change', mediaChange);
    pointer.addEventListener('change', mediaChange);
    document.addEventListener('visibilitychange', sync);
    document.addEventListener('astro:before-swap', dispose);
    hero.addEventListener('pointermove', move, { passive: true });
    hero.addEventListener('pointerleave', resetPointer);
    updateReadingShield(); sync();
    return dispose;
  }, []);

  const style = {
    '--bends-primary-light': settings.colors.light[0], '--bends-secondary-light': settings.colors.light[1],
    '--bends-primary-dark': settings.colors.dark[0], '--bends-secondary-dark': settings.colors.dark[1],
    '--bends-intensity-light': settings.intensity.light, '--bends-intensity-dark': settings.intensity.dark,
    '--bends-opacity-light': settings.opacity.light, '--bends-opacity-dark': settings.opacity.dark,
  } as CSSProperties;
  return settings.enabled ? (
    <div ref={containerRef} className="hero-color-bends" data-render-state="static" aria-hidden="true" style={style}>
      <div className="hero-color-bends-fallback" />
      <div ref={canvasHostRef} className="hero-color-bends-canvas" />
    </div>
  ) : null;
}
