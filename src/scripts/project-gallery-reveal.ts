import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';

/** Reveals a project gallery once, without changing its layout or media. */
export function setupProjectGalleryReveal(gallery: HTMLElement): () => void {
  const items = [...gallery.querySelectorAll<HTMLElement>('[data-gallery-item]')];
  const posters = items.filter((item) => !item.classList.contains('project-gallery-item--wide'));
  if (!posters.length || matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};

  gsap.registerPlugin(ScrollTrigger);
  gallery.setAttribute('data-gallery-motion-ready', '');
  const media = gsap.matchMedia();

  const reveal = (targets: HTMLElement[], trigger: HTMLElement, stagger = 0) => gsap.fromTo(
    targets,
    { autoAlpha: 0, y: 18 },
    {
      autoAlpha: 1,
      y: 0,
      duration: .5,
      stagger,
      ease: 'power2.out',
      scrollTrigger: {
        trigger,
        start: 'top 85%',
        once: true,
      },
    },
  );

  media.add('(min-width: 601px)', () => {
    const animations = [reveal(posters, posters[0], .08)];
    return () => animations.forEach((animation) => {
      animation.scrollTrigger?.kill();
      animation.kill();
    });
  });

  media.add('(max-width: 600px)', () => {
    const animations = posters.map((item) => reveal([item], item));
    return () => animations.forEach((animation) => {
      animation.scrollTrigger?.kill();
      animation.kill();
    });
  });

  ScrollTrigger.refresh();
  return () => {
    media.revert();
    gallery.removeAttribute('data-gallery-motion-ready');
    gsap.set(posters, { clearProps: 'opacity,visibility,transform' });
  };
}
