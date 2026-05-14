"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

type BoardOption = {
  label: string;
  value: string;
};

export function LeaderboardBoardSelect({
  activeBoard,
  boards,
}: {
  activeBoard: string;
  boards: BoardOption[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function handleChange(nextBoard: string) {
    if (nextBoard === activeBoard) return;

    const params = new URLSearchParams(searchParams.toString());
    params.set("board", nextBoard);

    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  return (
    <div className="-mx-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div
        aria-busy={isPending}
        aria-label="Loại bảng xếp hạng"
        className="inline-flex min-w-max items-center gap-1 rounded-lg border border-border bg-muted/30 p-1"
        role="tablist"
      >
        {boards.map((board) => (
          <button
            aria-selected={board.value === activeBoard}
            className={`h-8 shrink-0 rounded-md border px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/35 disabled:cursor-wait ${
              board.value === activeBoard
                ? "border-border bg-background text-foreground shadow-sm"
                : "border-transparent text-muted-foreground hover:bg-background/70 hover:text-foreground"
            }`}
            disabled={isPending}
            key={board.value}
            onClick={() => handleChange(board.value)}
            role="tab"
            type="button"
          >
            {board.label}
          </button>
        ))}
      </div>
    </div>
  );
}
