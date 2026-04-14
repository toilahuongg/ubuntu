"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Layers,
  LayoutDashboard,
  ListChecks,
  MapPin,
  Trophy,
  User,
  Settings,
} from "lucide-react";
import type { Role } from "@/lib/domain";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: Role[];
};

const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Tổng quan",
    icon: LayoutDashboard,
  },
  {
    href: "/templates",
    label: "Nhiệm vụ",
    icon: ListChecks,
    roles: ["TEAM_LEAD", "ZONE_LEAD", "REGIONAL_LEAD"],
  },
  {
    href: "/zone",
    label: "Địa vực",
    icon: Layers,
    roles: ["ZONE_LEAD"],
  },
  {
    href: "/region",
    label: "Khu vực",
    icon: MapPin,
    roles: ["REGIONAL_LEAD"],
  },
  {
    href: "/leaderboard",
    label: "Xếp hạng",
    icon: Trophy,
  },
  {
    href: "/profile",
    label: "Hồ sơ",
    icon: User,
  },
  {
    href: "/admin",
    label: "Quản lý",
    icon: Settings,
    roles: ["TEAM_LEAD"],
  },
];

export function BottomNav({ role }: { role: Role }) {
  const pathname = usePathname();

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(role),
  );

  return (
    <nav
      aria-label="Điều hướng chính"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-background/50 pb-[env(safe-area-inset-bottom)] shadow-[0_-1px_0_0_rgba(255,255,255,0.04)_inset,0_-8px_24px_-12px_rgba(0,0,0,0.6)] backdrop-blur-2xl backdrop-saturate-150 supports-[backdrop-filter]:bg-background/25"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-white/[0.04] via-white/[0.01] to-transparent"
      />
      <div className="relative mx-auto flex max-w-2xl items-center justify-around py-1">
        {visibleItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
              className={`flex min-h-[44px] min-w-[56px] cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl px-3 py-2 text-[10px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon
                className={`h-5 w-5 ${isActive ? "text-foreground" : ""}`}
              />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
