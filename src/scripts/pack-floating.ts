import gsap from 'gsap';

/** Separate layers own ambient floating and reversible scroll-driven perspective. */
export function setupPackFloating(section: HTMLElement): () => void {
  const layers = Array.from(section.querySelectorAll<HTMLElement>('[data-pack-float]'));
  if (!layers.length) return () => {};
  const media = gsap.matchMedia(section);

  media.add({
    mobile: '(max-width: 900px)',
    desktop: '(min-width: 901px)',
    reduced: '(prefers-reduced-motion: reduce)',
  }, (context) => {
    const { mobile, reduced } = context.conditions ?? {};
    if (reduced) return;

    // Small front-facing angles keep the flat screenshots readable, without pinning.
    const angles = mobile ? { x: 10, y: 18 } : { x: 8, y: 20 };
    layers.forEach((layer) => {
      const tilt = layer.querySelector<HTMLElement>('[data-pack-tilt]');
      if (!tilt) return;
      const direction = layer.querySelector('.phone') ? 1 : -1;
      gsap.fromTo(tilt, {
        rotationX: angles.x,
        rotationY: -angles.y * direction,
      }, {
        rotationX: -angles.x,
        rotationY: angles.y * direction,
        force3D: true,
        ease: 'none',
        scrollTrigger: {
          id: `pack-tilt-${direction === 1 ? 'phone' : 'browser'}`,
          trigger: layer.closest('.service-visual') ?? layer,
          start: 'top 90%',
          end: 'bottom 10%',
          scrub: .7,
          invalidateOnRefresh: true,
        },
      });
    });

    const visible = new Set<HTMLElement>();
    const animations = layers.map((layer, index) => gsap.fromTo(layer, { y: 0 }, {
      y: -(layer.querySelector('.phone') ? (mobile ? 11 : 12) : (mobile ? 8 : 8)),
      duration: layer.querySelector('.phone') ? 2.8 : 2.4,
      delay: index * .2,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
      paused: true,
      immediateRender: false,
    }));
    const sync = () => layers.forEach((layer, index) => {
      if (visible.has(layer) && !document.hidden) animations[index].play();
      else animations[index].pause();
    });
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const layer = entry.target as HTMLElement;
        if (entry.isIntersecting) visible.add(layer);
        else visible.delete(layer);
      });
      sync();
    });
    layers.forEach((layer) => observer.observe(layer));
    document.addEventListener('visibilitychange', sync);

    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', sync);
    };
  });

  return () => media.revert();
}
