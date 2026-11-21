import { useEffect, useState } from 'react';
import { useMediaQuery } from './useMediaQuery';

export function AnimatedNumber({ value, format }: { value: number; format(value: number): string }) {
  const reduce = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [initial] = useState(value);
  const [animated, setAnimated] = useState(0);
  useEffect(() => {
    if (reduce || !initial) return;
    let frame = 0;
    const start = performance.now();
    function tick(now: number) {
      const progress = Math.min(1, (now - start) / 900);
      setAnimated(initial * (1 - (1 - progress) ** 3));
      if (progress < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [initial, reduce]);
  const current = reduce || initial !== value ? value : animated;
  return <><span aria-hidden="true">{format(current)}</span><span className="analytics-sr">{format(value)}</span></>;
}
