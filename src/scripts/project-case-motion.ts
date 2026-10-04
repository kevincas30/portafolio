import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';

/** One-time section reveals shared by every project case study. */
export function setupProjectCaseMotion(project: HTMLElement): () => void {
  const blocks = [...project.querySelectorAll<HTMLElement>('[data-project-reveal]')];
  if (!blocks.length || matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};

  gsap.registerPlugin(ScrollTrigger);
  const animations = blocks.map((block) => gsap.fromTo(
    block,
    { autoAlpha: 0, y: 18 },
    {
      autoAlpha: 1,
      y: 0,
      duration: .5,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: block,
        start: 'top 85%',
        once: true,
      },
    },
  ));

  ScrollTrigger.refresh();
  return () => animations.forEach((animation) => {
    animation.scrollTrigger?.kill();
    animation.kill();
    gsap.set(animation.targets(), { clearProps: 'opacity,visibility,transform' });
  });
}
