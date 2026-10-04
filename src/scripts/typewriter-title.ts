import gsap from 'gsap';

/** Reveal pre-rendered glyphs: full accessible copy and layout stay unchanged. */
export function setupTypewriterTitle(title: HTMLElement): () => void {
  const characters = Array.from(title.querySelectorAll<HTMLElement>('[data-typewriter-char]'));
  if (!characters.length || matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};

  let revealed = 0;
  const state = { count: 0 };
  let timeline: gsap.core.Timeline | undefined;
  const restore = () => {
    characters.forEach((character) => {
      character.style.removeProperty('visibility');
      character.removeAttribute('data-typing-caret');
    });
    title.removeAttribute('data-typing-active');
  };
  const update = () => {
    const next = Math.floor(state.count);
    if (next === revealed) return;
    characters[revealed - 1]?.removeAttribute('data-typing-caret');
    for (let index = revealed; index < next; index++) characters[index].style.visibility = 'visible';
    revealed = next;
    characters[revealed - 1]?.setAttribute('data-typing-caret', '');
  };
  const syncVisibility = () => {
    const active = !!timeline?.scrollTrigger?.isActive && !document.hidden;
    title.dataset.typingActive = String(active);
    if (active) timeline?.resume();
    else timeline?.pause();
  };

  let context: gsap.Context | undefined;
  try {
    context = gsap.context(() => {
      gsap.set(characters, { visibility: 'hidden' });
      timeline = gsap.timeline({
        scrollTrigger: {
          id: 'packs-typewriter',
          trigger: title,
          start: 'top 80%',
          end: 'bottom top',
          toggleActions: 'play pause resume pause',
          onToggle: syncVisibility,
        },
      }).to(state, { count: characters.length, duration: characters.length * .065, ease: 'none', onUpdate: update });
    }, title);
    document.addEventListener('visibilitychange', syncVisibility);
    syncVisibility();
  } catch (error) {
    context?.revert();
    restore();
    console.warn('El titular conserva su estado estático:', error);
  }

  return () => {
    document.removeEventListener('visibilitychange', syncVisibility);
    context?.revert();
    restore();
  };
}
