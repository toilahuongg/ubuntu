"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-destructive/20 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
    >
      <LogOut className="h-4 w-4" />
      Đăng xuất
    </button>
  );
}
