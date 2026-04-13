import { AlertTriangleIcon, CheckCircle2Icon } from "lucide-react";

import { cn } from "@/lib/utils";

type NoticeBannerProps = {
  message?: string;
  tone: "error" | "success";
};

export function NoticeBanner({ message, tone }: NoticeBannerProps) {
  if (!message) {
    return null;
  }

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "mb-4 flex items-start gap-3 rounded-[22px] border px-4 py-3.5 text-sm shadow-[0_14px_32px_rgba(15,23,42,0.06)]",
        tone === "success"
          ? "border-emerald-200 bg-emerald-50/95 text-emerald-950"
          : "border-amber-200 bg-amber-50/95 text-amber-950",
      )}
    >
      {tone === "success" ? (
        <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-emerald-700" />
      ) : (
        <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-amber-700" />
      )}
      <p className="leading-6">{message}</p>
    </div>
  );
}
