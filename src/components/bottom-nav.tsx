"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Ellipsis,
  Heart,
  LayoutDashboard,
  Settings,
  Trophy,
  User,
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
    href: "/customers",
    label: "Học viên",
    icon: Heart,
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
    roles: ["ADMIN", "TEAM_LEAD", "ZONE_LEAD", "REGIONAL_LEAD"],
  },
];

const CORE_HREFS = ["/dashboard", "/customers", "/leaderboard", "/profile"];
const EXTRA_PRIORITIES = ["/admin"];

export function BottomNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(role),
  );

  const { primaryItems, overflowItems } = useMemo(() => {
    if (visibleItems.length <= 5) {
      return { primaryItems: visibleItems, overflowItems: [] as NavItem[] };
    }

    const primary: NavItem[] = [];

    for (const href of CORE_HREFS) {
      const item = visibleItems.find((entry) => entry.href === href);
      if (item) primary.push(item);
    }

    for (const href of EXTRA_PRIORITIES) {
      if (primary.length >= 4) break;
      const item = visibleItems.find((entry) => entry.href === href);
      if (item && !primary.some((entry) => entry.href === item.href)) {
        primary.push(item);
      }
    }

    const overflow = visibleItems.filter(
      (item) => !primary.some((entry) => entry.href === item.href),
    );

    return { primaryItems: primary, overflowItems: overflow };
  }, [visibleItems]);

  const isMoreActive = overflowItems.some(
    (item) => pathname === item.href || pathname.startsWith(item.href + "/"),
  );

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!moreRef.current) return;
      if (!moreRef.current.contains(event.target as Node)) {
        setIsMoreOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMoreOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <nav
      aria-label="Điều hướng chính"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-sidebar/80 pb-[env(safe-area-inset-bottom)] shadow-[0_-1px_0_0_var(--overlay-subtle)_inset,0_-8px_24px_-12px_var(--overlay-strong)] backdrop-blur-2xl backdrop-saturate-150 supports-[backdrop-filter]:bg-sidebar/60"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-overlay-subtle via-transparent to-transparent"
      />
      <div className="relative mx-auto flex max-w-2xl items-center justify-between px-1 py-1">
        {primaryItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsMoreOpen(false)}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
              className={`flex min-h-[44px] min-w-[48px] flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-2 text-[10px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
                isActive
                  ? "bg-sky-50 text-sky-700 shadow-sm ring-1 ring-sky-200/80"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon
                className={`h-5 w-5 ${isActive ? "text-sky-600" : ""}`}
              />
              <span className="max-w-[52px] truncate">{item.label}</span>
            </Link>
          );
        })}

        {overflowItems.length > 0 && (
          <div className="relative flex-1" ref={moreRef}>
            <button
              type="button"
              onClick={() => setIsMoreOpen((prev) => !prev)}
              aria-expanded={isMoreOpen}
              aria-haspopup="menu"
              aria-label="Mở mục khác"
              className={`flex min-h-[44px] min-w-[48px] w-full cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-2 text-[10px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
                isMoreActive || isMoreOpen
                  ? "bg-sky-50 text-sky-700 shadow-sm ring-1 ring-sky-200/80"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Ellipsis
                className={`h-5 w-5 ${
                  isMoreActive || isMoreOpen ? "text-sky-600" : ""
                }`}
              />
              <span className="max-w-[52px] truncate">Thêm</span>
            </button>

            {isMoreOpen && (
              <div
                role="menu"
                className="glass-card absolute bottom-14 right-2 z-50 min-w-40 p-1"
              >
                {overflowItems.map((item) => {
                  const isActive =
                    pathname === item.href || pathname.startsWith(item.href + "/");
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsMoreOpen(false)}
                      role="menuitem"
                      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs transition-colors ${
                        isActive
                          ? "bg-overlay-medium text-foreground"
                          : "text-muted-foreground hover:bg-overlay-subtle hover:text-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
