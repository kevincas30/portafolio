import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';

/** Connects and activates project-process steps as the timeline crosses the viewport. */
export function setupProcessTimeline(timeline: HTMLElement): () => void {
  const steps = [...timeline.querySelectorAll<HTMLElement>('.timeline-step')];
  if (steps.length < 2) return () => {};

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  if (reduced.matches) {
    steps.forEach((step) => step.setAttribute('data-timeline-active', ''));
    return () => steps.forEach((step) => step.removeAttribute('data-timeline-active'));
  }

  gsap.registerPlugin(ScrollTrigger);
  timeline.setAttribute('data-timeline-ready', '');
  let currentCount = -1;

  const activateThrough = (progress: number) => {
    const count = Math.min(steps.length, Math.floor(progress * (steps.length - 1) + .001) + 1);
    if (count === currentCount) return;
    currentCount = count;
    steps.forEach((step, index) => step.toggleAttribute('data-timeline-active', index < count));
  };

  activateThrough(0);
  const tween = gsap.fromTo(timeline,
    { '--timeline-progress': 0 },
    {
      '--timeline-progress': 1,
      ease: 'none',
      scrollTrigger: {
        id: 'project-process-timeline',
        trigger: timeline,
        start: 'top 82%',
        end: 'bottom 45%',
        scrub: .3,
        invalidateOnRefresh: true,
        onUpdate: (trigger) => activateThrough(trigger.progress),
      },
    },
  );

  return () => {
    tween.scrollTrigger?.kill();
    tween.kill();
    timeline.removeAttribute('data-timeline-ready');
    timeline.style.removeProperty('--timeline-progress');
    steps.forEach((step) => step.removeAttribute('data-timeline-active'));
  };
}
