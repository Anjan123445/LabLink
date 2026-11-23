// ============================================================
// LabLink — React useInView Hook for Accessible Viewport Reveals
// IntersectionObserver with once: true & Immediate Fallback
// ============================================================

import { useState, useEffect, useRef, type RefObject } from 'react';

interface UseInViewOptions {
  threshold?: number;
  rootMargin?: string;
}

export function useInView<T extends HTMLElement = HTMLElement>(
  options: UseInViewOptions = {}
): [RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  
  // Default to true if IntersectionObserver is absent or SSR
  const [isInView, setIsInView] = useState(() => {
    return typeof window === 'undefined' || !('IntersectionObserver' in window);
  });

  useEffect(() => {
    if (isInView) return;

    const element = ref.current;
    if (!element || typeof IntersectionObserver === 'undefined') {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        threshold: options.threshold ?? 0.05,
        rootMargin: options.rootMargin ?? '0px 0px -20px 0px',
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [isInView, options.threshold, options.rootMargin]);

  return [ref, isInView];
}
