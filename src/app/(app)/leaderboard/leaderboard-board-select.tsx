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
    const params = new URLSearchParams(searchParams.toString());
    params.set("board", nextBoard);

    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  return (
    <div className="flex items-center gap-2">
      <label
        className="shrink-0 text-xs font-medium text-muted-foreground"
        htmlFor="leaderboard-board"
      >
        Loại bảng
      </label>
      <select
        aria-busy={isPending}
        className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 pr-8 text-sm font-medium outline-none transition focus:ring-2 focus:ring-primary/30"
        id="leaderboard-board"
        onChange={(event) => handleChange(event.target.value)}
        value={activeBoard}
      >
        {boards.map((board) => (
          <option key={board.value} value={board.value}>
            {board.label}
          </option>
        ))}
      </select>
    </div>
  );
}
