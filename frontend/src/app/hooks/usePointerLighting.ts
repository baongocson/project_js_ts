import { useEffect, type RefObject } from 'react';

export function usePointerLighting(shell: RefObject<HTMLDivElement | null>, authScene: boolean) {
  useEffect(() => {
    const root = shell.current;
    const layer = root?.querySelector<HTMLElement>('.pointer-spotlight');
    if (!root || !layer) return;
    const spotlight = layer;
    const { style } = spotlight;
    const parallax = root.style;
    const media = matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
    let frame = 0;
    let x = 0;
    let y = 0;
    function move(event: PointerEvent) {
      if (event.pointerType !== 'mouse') return;
      x = event.clientX;
      y = event.clientY;
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        style.setProperty('--spot-x', x + 'px');
        style.setProperty('--spot-y', y + 'px');
        if (authScene) {
          parallax.setProperty('--parallax-x', ((x / innerWidth - .5) * 22) + 'px');
          parallax.setProperty('--parallax-y', ((y / innerHeight - .5) * 18) + 'px');
        }
        spotlight.setAttribute('data-pointer-lit', '');
      });
    }
    function clear() {
      cancelAnimationFrame(frame);
      frame = 0;
      spotlight.removeAttribute('data-pointer-lit');
      parallax.removeProperty('--parallax-x');
      parallax.removeProperty('--parallax-y');
    }
    function configure() {
      window.removeEventListener('pointermove', move);
      clear();
      if (media.matches) window.addEventListener('pointermove', move, { passive: true });
    }
    configure();
    media.addEventListener('change', configure);
    document.documentElement.addEventListener('pointerleave', clear);
    window.addEventListener('blur', clear);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('blur', clear);
      document.documentElement.removeEventListener('pointerleave', clear);
      media.removeEventListener('change', configure);
      clear();
    };
  }, [shell, authScene]);
}
