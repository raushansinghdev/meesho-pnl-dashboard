import { useEffect, useRef, useState } from 'react';

/**
 * AnimatedNumber — counts up from 0 to the target value with a smooth animation.
 */
export default function AnimatedNumber({ value, prefix = '₹', decimals = 2, duration = 800 }) {
  const [display, setDisplay] = useState(0);
  const frameRef = useRef(null);
  const startRef = useRef(null);

  useEffect(() => {
    if (value === null || value === undefined) return;

    const startVal = 0;
    const endVal = value;

    const animate = (timestamp) => {
      if (!startRef.current) startRef.current = timestamp;
      const progress = Math.min((timestamp - startRef.current) / duration, 1);

      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(startVal + (endVal - startVal) * eased);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    startRef.current = null;
    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [value, duration]);

  const formatted = Math.abs(display).toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  const sign = value < 0 ? '−' : '';

  return (
    <span>
      {sign}{prefix}{formatted}
    </span>
  );
}
