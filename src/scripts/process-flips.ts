import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';

/** Pauses on each summary before revealing it, then reverses as soon as scrolling returns. */
export function setupProcessFlips(board: HTMLElement): () => void {
  const notes = [...board.querySelectorAll<HTMLElement>('.process-note')];
  const layers = notes.map((note) => note.querySelector<HTMLElement>('[data-process-flip]'));
  if (!notes.length || layers.some((layer) => !layer)) return () => {};

  const flips = layers as HTMLElement[];
  gsap.registerPlugin(ScrollTrigger);
  const desktop = matchMedia('(min-width: 901px)');
  const tablet = matchMedia('(min-width: 601px) and (max-width: 900px)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const preferences = [desktop, tablet, reduced];
  let context: gsap.Context | undefined;
  let refreshFrame = 0;
  let active = true;
  const pendingReveals = new Set<ReturnType<typeof setTimeout>>();

  const reset = () => {
    pendingReveals.forEach(clearTimeout);
    pendingReveals.clear();
    context?.revert();
    context = undefined;
    board.removeAttribute('data-process-ready');
    board.removeAttribute('data-process-mode');
    notes.forEach((note) => note.removeAttribute('data-process-turning'));
  };

  const build = () => {
    if (!active) return;

    // Keep cards open after a breakpoint change if they were already revealed.
    const revealed = notes.map((note) => note.dataset.processRevealed === 'true');
    reset();

    if (reduced.matches) {
      notes.forEach((note) => { note.dataset.processRevealed = 'true'; });
      board.dataset.processMode = 'static';
      return;
    }

    try {
      context = gsap.context(() => {
        const rowSize = desktop.matches ? 3 : tablet.matches ? 2 : 1;

        for (let index = 0; index < notes.length; index += rowSize) {
          const row = notes.slice(index, index + rowSize);
          const rowLayers = row.map((note) => note.querySelector<HTMLElement>('[data-process-flip]')!);
          const rowWasOpen = row.every((note) => revealed[notes.indexOf(note)]);

          gsap.set(rowLayers, { rotationY: 180, force3D: true });
          const timeline = gsap.timeline({ paused: true });

          row.forEach((note, cardIndex) => {
            timeline.to(rowLayers[cardIndex], {
              rotationY: 0,
              duration: 0.82,
              ease: 'power2.inOut',
              onComplete: () => {
                note.dataset.processRevealed = 'true';
                note.removeAttribute('data-process-turning');
              },
              onReverseComplete: () => {
                note.dataset.processRevealed = 'false';
                note.removeAttribute('data-process-turning');
              },
            }, cardIndex * 0.16);
          });

          timeline.progress(rowWasOpen ? 1 : 0).pause();
          row.forEach((note) => { note.dataset.processRevealed = String(rowWasOpen); });
          let revealTimer: ReturnType<typeof setTimeout> | undefined;
          let rowTrigger: ScrollTrigger | undefined;
          const cancelReveal = () => {
            if (revealTimer === undefined) return;
            clearTimeout(revealTimer);
            pendingReveals.delete(revealTimer);
            revealTimer = undefined;
          };
          const play = () => {
            if (timeline.progress() >= 1) return;
            row.forEach((note) => { note.dataset.processTurning = 'true'; });
            timeline.play();
          };
          const reveal = () => {
            if (timeline.progress() >= 1 || revealTimer !== undefined) return;
            revealTimer = setTimeout(() => {
              pendingReveals.delete(revealTimer!);
              revealTimer = undefined;
              if (active && rowTrigger && rowTrigger.direction > 0 && rowTrigger.scroll() >= rowTrigger.start) play();
            }, 650);
            pendingReveals.add(revealTimer);
          };
          const finish = () => {
            cancelReveal();
            timeline.progress(1).pause();
            row.forEach((note) => {
              note.dataset.processRevealed = 'true';
              note.removeAttribute('data-process-turning');
            });
          };
          const close = () => {
            cancelReveal();
            if (timeline.progress() <= 0) return;
            row.forEach((note) => { note.dataset.processTurning = 'true'; });
            timeline.reverse();
          };

          rowTrigger = ScrollTrigger.create({
            id: `process-flip-row-${index + 1}`,
            trigger: row[0],
            start: 'top 78%',
            end: 'top 20%',
            onEnter: reveal,
            onEnterBack: close,
            onLeaveBack: close,
            onUpdate: (trigger) => trigger.direction < 0 ? close() : reveal(),
            onRefresh: (trigger) => {
              if (trigger.scroll() >= trigger.end) finish();
              else if (trigger.scroll() >= trigger.start) {
                if (trigger.direction < 0) close();
                else reveal();
              }
              else close();
            },
          });
        }
      }, board);

      board.dataset.processMode = 'reveal';
      board.dataset.processReady = 'true';
      ScrollTrigger.refresh();
    } catch {
      reset();
      flips.forEach((flip) => flip.style.removeProperty('transform'));
    }
  };

  const scheduleBuild = () => {
    if (!active || refreshFrame) return;
    refreshFrame = requestAnimationFrame(() => {
      refreshFrame = 0;
      build();
    });
  };

  build();
  window.addEventListener('resize', scheduleBuild);
  preferences.forEach((preference) => preference.addEventListener('change', scheduleBuild));

  return () => {
    active = false;
    cancelAnimationFrame(refreshFrame);
    window.removeEventListener('resize', scheduleBuild);
    preferences.forEach((preference) => preference.removeEventListener('change', scheduleBuild));
    reset();
  };
}
