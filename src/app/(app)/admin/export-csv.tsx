"use client";

import { Download } from "lucide-react";

import { ROLE_LABELS } from "@/lib/domain";
import type { SerializedUser } from "@/lib/domain";

type Lookup = { id: string; name: string };

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function ExportUsersCsv({
  users,
  teams,
  zones,
  regions,
}: {
  users: SerializedUser[];
  teams: Lookup[];
  zones: Lookup[];
  regions: Lookup[];
}) {
  function handleExport() {
    const teamMap = new Map(teams.map((t) => [t.id, t.name]));
    const zoneMap = new Map(zones.map((z) => [z.id, z.name]));
    const regionMap = new Map(regions.map((r) => [r.id, r.name]));

    const header = [
      "fullName",
      "username",
      "role",
      "status",
      "team",
      "zone",
      "region",
      "telegramId",
      "createdAt",
    ];

    const rows = users.map((u) =>
      [
        u.fullName,
        u.username ?? "",
        ROLE_LABELS[u.role],
        u.status,
        (u.teamId && teamMap.get(u.teamId)) || "",
        (u.zoneId && zoneMap.get(u.zoneId)) || "",
        (u.regionId && regionMap.get(u.regionId)) || "",
        u.telegramId?.toString() ?? "",
        u.createdAt ?? "",
      ]
        .map((v) => csvEscape(String(v)))
        .join(","),
    );

    // UTF-8 BOM so Excel on Windows renders Vietnamese correctly.
    const csv = "\uFEFF" + [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `users-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={users.length === 0}
      className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-overlay-medium px-3 text-[11px] font-medium transition-colors hover:bg-overlay-strong disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Download className="h-3.5 w-3.5" />
      Xuất CSV
    </button>
  );
}
