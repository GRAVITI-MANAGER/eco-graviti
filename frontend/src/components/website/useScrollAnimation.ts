'use client';

import React, { useEffect } from 'react';

/**
 * Animation types supported by the scroll-triggered system.
 * Each maps to a CSS class: .anim-{type}
 */
export type AnimationType =
  | 'fade-up'
  | 'fade-in'
  | 'scale-in'
  | 'slide-left'
  | 'slide-right'
  | 'blur-in'
  | 'clip-reveal';

interface ScrollAnimationOptions {
  /** IntersectionObserver threshold (0-1). Default: 0.12 */
  threshold?: number;
  /** Root margin for triggering earlier/later. Default: '0px 0px -40px 0px' */
  rootMargin?: string;
  /** Once visible, unobserve (animate only once). Default: true */
  once?: boolean;
}

/**
 * Hook that initializes scroll-triggered animations on a container element.
 *
 * Elements with `.anim-*` classes start hidden and animate in when they
 * enter the viewport. Elements with `.stagger` class get automatic delay
 * on their children.
 *
 * Respects `prefers-reduced-motion: reduce` — skips animations entirely.
 *
 * Usage:
 *   const containerRef = useScrollAnimation<HTMLDivElement>();
 *   return <div ref={containerRef}>...</div>
 */
export function useScrollAnimation<T extends HTMLElement = HTMLDivElement>(
  externalRef: React.RefObject<T | null>,
  options: ScrollAnimationOptions = {},
  deps: unknown[] = []
) {
  const {
    threshold = 0.12,
    rootMargin = '0px 0px -40px 0px',
    once = true,
  } = options;

  useEffect(() => {
    const container = externalRef.current;
    if (!container) return;

    // Respect prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      // Make everything visible immediately
      container.querySelectorAll('[class*="anim-"], .reveal').forEach((el) => {
        el.classList.add('anim-visible');
        el.classList.add('visible');
      });
      return;
    }

    const animSelector = '[class*="anim-"], .reveal';
    const elements = container.querySelectorAll(animSelector);
    if (!elements.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target;
            el.classList.add('anim-visible');
            el.classList.add('visible');

            // Stagger children: if this element has .stagger, animate children with delays
            if (el.classList.contains('stagger')) {
              const children = el.children;
              for (let i = 0; i < children.length; i++) {
                const child = children[i] as HTMLElement;
                child.style.setProperty('--stagger-delay', `${i * 80}ms`);
                child.classList.add('stagger-child-visible');
              }
            }

            if (once) {
              io.unobserve(el);
            }
          }
        });
      },
      { threshold, rootMargin }
    );

    elements.forEach((el) => io.observe(el));
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalRef, threshold, rootMargin, once, ...deps]);
}
