import gsap from 'gsap';

/** Color-only reading progression for the homepage's problem block. */
export function setupReadingMotion(block: HTMLElement): () => void {
  const words = Array.from(block.querySelectorAll<HTMLElement>('[data-reading-word]'));
  if (!words.length || matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};

  let context: gsap.Context | undefined;
  let timeline: gsap.core.Timeline | undefined;
  let active = true;
  let refreshFrame = 0;
  let themeFrame = 0;

  const build = () => {
    context?.revert();
    const styles = getComputedStyle(block);
    const muted = styles.getPropertyValue('--reading-muted').trim();
    const text = styles.getPropertyValue('--reading-text').trim();
    const accent = styles.getPropertyValue('--reading-accent').trim();
    context = gsap.context(() => {}, block);
    context.add(() => {
      // A single baseline keeps even the later staggered words muted immediately.
      gsap.set(words, { color: muted });
      timeline = gsap.timeline({
        scrollTrigger: {
          id: 'problem-reading',
          trigger: block,
          start: 'top 85%',
          end: 'bottom 75%',
          scrub: .25,
          onRefresh: (trigger) => {
            // Reflow only changes the range, not the color baselines. Resync after
            // refresh rather than retaining the previous scrubbed animation time.
            const progress = gsap.utils.clamp(0, 1,
              (trigger.scroll() - trigger.start) / Math.max(1, trigger.end - trigger.start));
            trigger.getTween()?.pause();
            trigger.animation?.progress(progress);
          },
        },
      }).to(words, {
        color: (index: number) => words[index].closest('em') ? accent : text,
        duration: .28,
        stagger: .12,
        ease: 'none',
      });
      // Render from the current geometry, including restored scroll positions.
      // Reusing an old progress after font loading/resizing would desync scrub.
      timeline.scrollTrigger?.refresh();
    });
  };

  const refresh = () => {
    if (!active || refreshFrame) return;
    refreshFrame = requestAnimationFrame(() => {
      refreshFrame = 0;
      if (active) timeline?.scrollTrigger?.refresh();
    });
  };
  const resizeObserver = new ResizeObserver(refresh);
  const themeObserver = new MutationObserver(() => {
    if (!active || themeFrame) return;
    themeFrame = requestAnimationFrame(() => {
      themeFrame = 0;
      if (!active) return;
      try { build(); refresh(); }
      catch { dispose(); }
    });
  });
  const dispose = () => {
    active = false;
    cancelAnimationFrame(refreshFrame);
    cancelAnimationFrame(themeFrame);
    resizeObserver.disconnect();
    themeObserver.disconnect();
    document.fonts.removeEventListener('loadingdone', refresh);
    context?.revert();
    // Also restore readable CSS defaults if initialization was interrupted.
    words.forEach((word) => word.style.removeProperty('color'));
  };

  try {
    build();
    resizeObserver.observe(block);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    document.fonts.addEventListener('loadingdone', refresh);
    void document.fonts.ready.then(refresh);
  } catch { dispose(); }

  return dispose;
}
