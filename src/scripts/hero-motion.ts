import gsap from 'gsap';

/** Entrance, idle floating, scroll and CSS highlights use independent layers. */
export function setupHeroMotion(hero: HTMLElement): () => void {
  const entries = hero.querySelectorAll<HTMLElement>('.hero-entry');
  const floats = hero.querySelectorAll<HTMLElement>('.hero-float');
  const titleLines = hero.querySelectorAll<HTMLElement>('.hero-title-motion');
  const browser = hero.querySelector<HTMLElement>('.hero-browser');
  const phone = hero.querySelector<HTMLElement>('.hero-phone');
  const note = hero.querySelector<HTMLElement>('.hero-note');
  if (!entries.length || !browser || !phone || !note) return () => {};

  const media = gsap.matchMedia(hero);
  let entered = false;

  media.add({
    desktop: '(min-width: 901px)',
    mobile: '(max-width: 900px)',
    reduced: '(prefers-reduced-motion: reduce)',
  }, (context) => {
    const { mobile, reduced } = context.conditions ?? {};
    if (reduced) return;

    const composition = hero.querySelector<HTMLElement>('[data-hero-composition]') ?? hero;
    const bounds = composition.getBoundingClientRect();
    let visible = bounds.bottom > 0 && bounds.top < window.innerHeight;
    let atTop = window.scrollY <= 2;
    let entranceReady = entered;
    const amplitudes = mobile ? [4, 6, 3] : [8, 12, 6];
    const floating = Array.from(floats, (layer, index) => gsap.fromTo(layer, { y: 0 }, {
      y: -(amplitudes[index] ?? 6),
      duration: [2.4, 2.8, 2.2][index] ?? 2.4,
      delay: index * .2,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
      paused: true,
      immediateRender: false,
    }));
    const syncFloating = () => {
      const active = entranceReady && atTop && visible && !document.hidden;
      floating.forEach((animation) => active ? animation.play() : animation.pause());
    };
    const visibility = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      syncFloating();
    });
    visibility.observe(composition);
    document.addEventListener('visibilitychange', syncFloating);

    // Pointer state also gives touch devices a reliable press response.
    // No pointer capture: releasing outside retains the anchor's native behavior.
    const demo = hero.querySelector<HTMLAnchorElement>('.hero-demo');
    const releasePress = () => demo?.removeAttribute('data-pressed');
    const press = (event: PointerEvent) => {
      if (event.isPrimary && event.button === 0) demo?.setAttribute('data-pressed', 'true');
    };
    demo?.addEventListener('pointerdown', press);
    demo?.addEventListener('blur', releasePress);
    document.addEventListener('pointerup', releasePress);
    document.addEventListener('pointercancel', releasePress);
    document.addEventListener('visibilitychange', releasePress);
    window.addEventListener('blur', releasePress);

    if (!entered) {
      entered = true;
      gsap.from(entries, {
        opacity: 0,
        y: 20,
        duration: .55,
        stagger: .1,
        ease: 'power2.out',
        clearProps: 'transform,opacity',
        onComplete: () => { entranceReady = true; syncFloating(); },
      });
    }

    // Initial progress is zero below the header. No pin or wheel interception.
    const scrollTimeline = gsap.timeline({
      defaults: { duration: 1, ease: 'none' },
      scrollTrigger: {
        id: 'hero-composition',
        trigger: hero,
        start: () => `top top+=${document.querySelector<HTMLElement>('.site-header')?.offsetHeight ?? 0}`,
        end: 'bottom 20%',
        scrub: .6,
        invalidateOnRefresh: true,
        onUpdate: (trigger) => {
          atTop = trigger.progress === 0 && window.scrollY <= 2;
          syncFloating();
        },
      },
    })
      .to(browser, { y: mobile ? -14 : -35, rotation: mobile ? 1.75 : .5 }, 0)
      .to(phone, { x: mobile ? 0 : -15, y: mobile ? -25 : -62.5, rotation: mobile ? -4.5 : -5.5 }, 0)
      .to(note, { y: mobile ? -11 : -25, rotation: mobile ? -2 : -1 }, 0);

    if (titleLines.length === 2) {
      // The upper line moves first, keeping the tight leading readable on exit.
      scrollTimeline
        .to(titleLines[0], { y: mobile ? -5 : -12.5, ease: 'power1.out' }, 0)
        .to(titleLines[1], { y: mobile ? -9 : -22.5 }, 0);
    }

    syncFloating();

    return () => {
      visibility.disconnect();
      document.removeEventListener('visibilitychange', syncFloating);
      releasePress();
      demo?.removeEventListener('pointerdown', press);
      demo?.removeEventListener('blur', releasePress);
      document.removeEventListener('pointerup', releasePress);
      document.removeEventListener('pointercancel', releasePress);
      document.removeEventListener('visibilitychange', releasePress);
      window.removeEventListener('blur', releasePress);
    };
  });

  // Reverts all motion layers and runs the pointer-state cleanup above.
  return () => media.revert();
}
