"use client";

import { useMemo } from "react";

const URL_RE =
  /https?:\/\/[-A-Za-z0-9+&@#/%?=~_|!:,.;]*[-A-Za-z0-9+&@#/%=~_|]/g;

export function LinkifyText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const parts = useMemo(() => {
    const nodes: React.ReactNode[] = [];
    let lastIndex = 0;
    let key = 0;

    text.replace(URL_RE, (match, index) => {
      if (index > lastIndex) {
        nodes.push(text.slice(lastIndex, index));
      }
      nodes.push(
        <a
          key={key++}
          href={match}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline hover:text-primary/80"
          onClick={(e) => e.stopPropagation()}
        >
          {match}
        </a>,
      );
      lastIndex = index + match.length;
      return match;
    });

    if (lastIndex < text.length) {
      nodes.push(text.slice(lastIndex));
    }

    return nodes;
  }, [text]);

  return <span className={className}>{parts}</span>;
}
