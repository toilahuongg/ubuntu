"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

type ResponsiveNameTickerProps = {
  children: ReactNode;
  className?: string;
};

type TickerStyle = CSSProperties & {
  "--lb-name-ticker-distance"?: string;
  "--lb-name-ticker-duration"?: string;
};

const TICKER_MEDIA_QUERY = "(min-width: 376px) and (max-width: 559px)";
const MARQUEE_GAP_REM = 1.5;

export function ResponsiveNameTicker({
  children,
  className,
}: ResponsiveNameTickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLSpanElement>(null);
  const primaryRef = useRef<HTMLSpanElement>(null);
  const [distance, setDistance] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    const track = trackRef.current;
    const primary = primaryRef.current;
    if (!container || !track || !primary) return;

    const mediaQuery = window.matchMedia(TICKER_MEDIA_QUERY);

    const measure = () => {
      if (!mediaQuery.matches) {
        setDistance(0);
        return;
      }

      const computedStyle = window.getComputedStyle(container);
      const rootFontSize = Number.parseFloat(
        window.getComputedStyle(document.documentElement).fontSize,
      );
      const horizontalPadding =
        Number.parseFloat(computedStyle.paddingLeft) +
        Number.parseFloat(computedStyle.paddingRight);
      const availableWidth = container.clientWidth - horizontalPadding;
      const primaryWidth = primary.scrollWidth;
      const overflows = primaryWidth - availableWidth > 1;

      setDistance(overflows ? primaryWidth + rootFontSize * MARQUEE_GAP_REM : 0);
    };

    measure();
    void document.fonts?.ready.then(measure);

    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(container);
    resizeObserver.observe(track);
    resizeObserver.observe(primary);
    mediaQuery.addEventListener("change", measure);

    return () => {
      resizeObserver.disconnect();
      mediaQuery.removeEventListener("change", measure);
    };
  }, [children]);

  const hasOverflow = distance > 1;
  const duration = Math.min(8, Math.max(3.6, distance / 42));
  const style: TickerStyle = hasOverflow
    ? {
        "--lb-name-ticker-distance": `-${distance}px`,
        "--lb-name-ticker-duration": `${duration}s`,
      }
    : {};

  return (
    <div
      ref={containerRef}
      className={`lb-name-ticker ${className ?? ""}`}
      data-overflow={hasOverflow ? "true" : undefined}
      style={style}
    >
      <span ref={trackRef} className="lb-name-ticker__track">
        <span ref={primaryRef} className="lb-name-ticker__item">
          {children}
        </span>
        {hasOverflow ? (
          <span aria-hidden className="lb-name-ticker__item lb-name-ticker__clone">
            {children}
          </span>
        ) : null}
      </span>
    </div>
  );
}
