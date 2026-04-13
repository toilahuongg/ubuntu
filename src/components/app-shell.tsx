"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardListIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from "lucide-react";

import { logoutAction } from "@/app/(app)/actions";
import { ROLE_LABELS, type SessionUser } from "@/lib/domain";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type AppShellProps = {
  children: React.ReactNode;
  user: SessionUser;
};

export function AppShell({ children, user }: AppShellProps) {
  const currentPath = usePathname();
  const navigation = [
    {
      href: "/dashboard",
      icon: LayoutDashboardIcon,
      label: "Tong quan",
      note: "Theo doi tien do va su co trong ngay",
      visible: true,
    },
    {
      href: "/templates",
      icon: ClipboardListIcon,
      label: "Mau nhiem vu",
      note: "Tao va kich hoat flow cap nhat",
      visible: user.role === "TEAM_LEAD",
    },
    {
      href: "/admin",
      icon: ShieldCheckIcon,
      label: "Quan tri",
      note: "Quan ly nguoi dung, team va khu vuc",
      visible: user.role === "ADMIN",
    },
  ].filter((item) => item.visible);

  return (
    <div className="min-h-screen">
      <div className="surface-grid mx-auto flex min-h-screen w-full max-w-[1600px] flex-col gap-6 px-4 py-4 md:px-6 md:py-6">
        <div className="grid gap-4 xl:grid-cols-[310px_minmax(0,1fr)]">
          <aside className="overflow-hidden rounded-[32px] border border-slate-800/70 bg-[linear-gradient(180deg,rgba(34,43,73,0.98),rgba(24,31,58,0.98))] text-white shadow-[0_24px_80px_rgba(15,23,42,0.28)]">
            <div className="space-y-6 p-5 md:p-6 xl:sticky xl:top-4">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-cyan-100">
                  <SparklesIcon className="size-3.5" />
                  Operations cockpit
                </div>
                <div className="space-y-2">
                  <h1 className="font-heading text-[2rem] leading-none tracking-tight text-white">
                    Nhiem vu moi ngay
                  </h1>
                  <p className="max-w-xs text-sm leading-7 text-slate-300">
                    Khong gian dieu phoi task, nhac deadline va cap nhat tien do trong Telegram.
                  </p>
                </div>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-white/8 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                <p className="text-sm font-semibold text-white">{user.fullName}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
                  Ho so dang hoat dong
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge className="border-transparent bg-cyan-300/18 text-cyan-50 hover:bg-cyan-300/18">
                    {ROLE_LABELS[user.role]}
                  </Badge>
                  <Badge className="border-transparent bg-white/10 text-slate-200 hover:bg-white/10">
                    {user.teamId ? "Da gan team" : "Chua gan team"}
                  </Badge>
                </div>
              </div>

              <nav className="space-y-2" aria-label="Dieu huong ung dung">
                {navigation.map((item) => {
                  const isActive = currentPath.startsWith(item.href);
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "flex items-start gap-3 rounded-[24px] border px-4 py-3.5 transition",
                        isActive
                          ? "border-cyan-300/30 bg-cyan-300/15 text-white shadow-[0_18px_40px_rgba(29,78,216,0.22)]"
                          : "border-white/8 bg-white/4 text-slate-200 hover:border-white/12 hover:bg-white/8",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-2xl",
                          isActive ? "bg-white/14 text-cyan-100" : "bg-white/8 text-slate-300",
                        )}
                      >
                        <Icon className="size-[18px]" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold">{item.label}</span>
                        <span className="mt-1 block text-xs leading-5 text-slate-400">
                          {item.note}
                        </span>
                      </span>
                    </Link>
                  );
                })}
              </nav>

              <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.04))] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Focus hom nay
                </p>
                <p className="mt-2 text-sm leading-7 text-slate-200">
                  Uu tien kiem tra cac the dang treo, sau do mo nhanh khu vuc quan tri hoac template phu hop theo vai tro.
                </p>
              </div>

              <form action={logoutAction}>
                <button
                  type="submit"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    "w-full border-white/12 bg-white/5 text-white hover:bg-white/10",
                  )}
                >
                  <LogOutIcon />
                  Dang xuat
                </button>
              </form>
            </div>
          </aside>

          <main className="min-w-0 space-y-4">{children}</main>
        </div>
      </div>
    </div>
  );
}
