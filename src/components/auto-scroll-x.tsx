"use client";

import { useEffect, useRef } from "react";

type AutoScrollXProps = {
  children: React.ReactNode;
  className?: string;
  speed?: number;
};

export function AutoScrollX({ children, className, speed = 0.35 }: AutoScrollXProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) return;

    let rafId = 0;
    let direction = 1;
    let paused = false;

    const tick = () => {
      const maxScroll = element.scrollWidth - element.clientWidth;
      if (!paused && maxScroll > 0) {
        element.scrollLeft += speed * direction;
        if (element.scrollLeft >= maxScroll) {
          element.scrollLeft = maxScroll;
          direction = -1;
        } else if (element.scrollLeft <= 0) {
          element.scrollLeft = 0;
          direction = 1;
        }
      }
      rafId = window.requestAnimationFrame(tick);
    };

    const pause = () => {
      paused = true;
    };

    const resume = () => {
      paused = false;
    };

    element.addEventListener("pointerdown", pause);
    element.addEventListener("pointerup", resume);
    element.addEventListener("pointercancel", resume);
    element.addEventListener("mouseenter", pause);
    element.addEventListener("mouseleave", resume);

    rafId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(rafId);
      element.removeEventListener("pointerdown", pause);
      element.removeEventListener("pointerup", resume);
      element.removeEventListener("pointercancel", resume);
      element.removeEventListener("mouseenter", pause);
      element.removeEventListener("mouseleave", resume);
    };
  }, [speed]);

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
}
