import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function AdminSubHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Link
        href="/admin"
        aria-label="Quay lại quản trị"
        className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-overlay-subtle hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
      </Link>
      <div className="min-w-0 flex-1">
        <h1 className="font-display text-xl font-bold">{title}</h1>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  );
}
