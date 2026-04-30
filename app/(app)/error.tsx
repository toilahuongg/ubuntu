"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      role="alert"
      className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 py-12 text-center"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="h-6 w-6" aria-hidden />
      </div>
      <div className="space-y-1">
        <h2 className="text-base font-semibold">Đã có lỗi xảy ra</h2>
        <p className="text-sm text-muted-foreground">
          Vui lòng thử lại. Nếu vẫn chưa được, hãy tải lại trang.
        </p>
      </div>
      <button
        type="button"
        onClick={reset}
        className="btn-gradient flex h-10 items-center justify-center gap-1.5 px-4 text-sm"
      >
        <RotateCcw className="h-4 w-4" aria-hidden />
        Thử lại
      </button>
    </div>
  );
}
