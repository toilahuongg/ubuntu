import { Link } from "react-router";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-overlay-medium text-foreground">
        <Compass className="h-6 w-6" aria-hidden />
      </div>
      <div className="space-y-1">
        <h2 className="text-base font-semibold">Không tìm thấy trang</h2>
        <p className="text-sm text-muted-foreground">
          Trang bạn yêu cầu không tồn tại hoặc đã bị di chuyển.
        </p>
      </div>
      <Link
        to="/dashboard"
        className="btn-gradient flex h-10 items-center justify-center px-4 text-sm"
      >
        Về tổng quan
      </Link>
    </div>
  );
}
