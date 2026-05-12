import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";

export function AdminSubHeader({
  backHref = "/admin",
  title,
  description,
}: {
  backHref?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[2.25rem_minmax(0,1fr)_2.25rem] items-center gap-2">
        <Link
          href={backHref}
          aria-label="Quay lại"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent/35 hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 text-center">
          <h1 className="truncate font-display text-base font-semibold tracking-tight">
            {title}
          </h1>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground">
          <Search className="h-4 w-4" />
        </div>
      </div>
      {description && (
        <p className="text-center text-xs leading-5 text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  );
}
