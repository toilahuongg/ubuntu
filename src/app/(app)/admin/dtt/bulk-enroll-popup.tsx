"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { X, Search, UserPlus } from "lucide-react";
import { bulkEnrollStudentsAction } from "./actions";
import { FormError, FormSuccess } from "../_shared";

export type BulkEnrollMember = {
  id: string;
  fullName: string;
  role: string;
  regionName: string | null;
  regionId: string | null;
};

type BulkEnrollPopupProps = {
  classId: string;
  className: string;
  onClose: () => void;
  members: BulkEnrollMember[];
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Quản trị viên",
  TEAM_LEAD: "Trưởng nhóm",
  ZONE_LEAD: "Trưởng vùng",
  REGIONAL_LEAD: "Trưởng khu vực",
  NGV: "Nguyện vọng",
  MEMBER: "Thành viên",
  TDM: "Tín đồ mới",
};

function groupMembersByRegion(members: BulkEnrollMember[]) {
  const groups = new Map<string | null, BulkEnrollMember[]>();
  for (const m of members) {
    const key = m.regionName;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(m);
  }
  const sorted = [...groups.entries()].toSorted((a, b) => {
    if (a[0] === null) return 1;
    if (b[0] === null) return -1;
    return a[0].localeCompare(b[0], "vi");
  });
  return sorted;
}

export function BulkEnrollPopup({
  classId,
  className,
  onClose,
  members,
}: BulkEnrollPopupProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Focus trap and escape key handler
  useEffect(() => {
    contentRef.current?.focus();

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (!isPending) onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose, isPending]);

  // Filter and sort members
  const filteredMembers = members.filter((m) =>
    m.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const grouped = groupMembersByRegion(filteredMembers);

  const allSelectedInGroup = (groupMembers: BulkEnrollMember[]) =>
    groupMembers.every((m) => selected.has(m.id));

  const toggleGroup = (groupMembers: BulkEnrollMember[]) => {
    setSelected((prev) => {
      const next = new Set(prev);
      const allSelected = groupMembers.every((m) => next.has(m.id));
      if (allSelected) {
        for (const m of groupMembers) next.delete(m.id);
      } else {
        for (const m of groupMembers) next.add(m.id);
      }
      return next;
    });
  };

  const toggleMember = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSubmit = () => {
    if (selected.size === 0) return;
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const res = await bulkEnrollStudentsAction([...selected], classId);
      if (res.ok && res.data) {
        const { success: s, skipped } = res.data;
        let msg = `Đã thêm ${s} học viên vào lớp "${className}".`;
        if (skipped > 0) {
          msg += ` Bỏ qua ${skipped} người đã tham gia DTT.`;
        }
        setSuccess(msg);
        // Close after a short delay to show the success message
        setTimeout(() => {
          router.refresh();
          onClose();
        }, 1200);
      } else {
        setError("Có lỗi xảy ra.");
      }
    });
  };

  if (members.length === 0) {
    return (
      <div
        ref={overlayRef}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          ref={contentRef}
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
          className="w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-center">
            <UserPlus className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="mt-3 text-sm font-semibold text-foreground">
              Tất cả thành viên đã tham gia ĐTT
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Không còn thành viên nào để thêm vào lớp.
            </p>
          </div>
          <button
            onClick={onClose}
            className="btn-gradient mt-5 flex h-9 w-full items-center justify-center text-sm font-semibold"
          >
            Đóng
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={contentRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className="flex w-full max-w-lg flex-col rounded-lg border border-border bg-background shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <h2 className="text-sm font-semibold text-foreground">
            Thêm học viên vào &ldquo;{className}&rdquo;
          </h2>
          <button
            onClick={onClose}
            disabled={isPending}
            className="rounded-md p-1 text-muted-foreground hover:text-foreground disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search */}
        <div className="border-b border-border px-5 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm theo tên..."
              className="h-9 w-full rounded-md border border-border bg-overlay-subtle pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Feedback */}
        {(error || success) && (
          <div className="px-5 pt-3">
            {error && <FormError message={error} onDismiss={() => setError(null)} />}
            {success && <FormSuccess message={success} onDismiss={() => setSuccess(null)} />}
          </div>
        )}

        {/* Member list */}
        <div className="max-h-96 overflow-y-auto px-5 py-3">
          {grouped.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">
              Không tìm thấy thành viên nào.
            </p>
          ) : (
            <div className="space-y-4">
              {grouped.map(([regionName, groupMembers]) => (
                <div key={regionName ?? "__none__"}>
                  {/* Group header */}
                  <div className="sticky top-0 z-10 mb-1.5 flex items-center gap-2 rounded-t-md bg-overlay-subtle/60 px-2.5 py-1.5 backdrop-blur-sm">
                    <label className="flex cursor-pointer items-center gap-1.5 text-xs">
                      <input
                        type="checkbox"
                        checked={allSelectedInGroup(groupMembers)}
                        onChange={() => toggleGroup(groupMembers)}
                        className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary focus:ring-offset-0"
                      />
                      <span className="font-semibold text-foreground">
                        {regionName ?? "Chưa xếp khu vực"}
                      </span>
                    </label>
                    <span className="text-[10px] text-muted-foreground">
                      ({groupMembers.length})
                    </span>
                  </div>

                  {/* Members */}
                  <div className="space-y-0.5">
                    {groupMembers
                      .toSorted((a, b) => a.fullName.localeCompare(b.fullName, "vi"))
                      .map((member) => (
                        <label
                          key={member.id}
                          className="flex cursor-pointer items-center gap-3 rounded-lg border border-transparent px-3 py-2 transition-colors hover:border-border/30 hover:bg-overlay-subtle/30 has-[:checked]:border-primary/20 has-[:checked]:bg-primary/5"
                        >
                          <input
                            type="checkbox"
                            checked={selected.has(member.id)}
                            onChange={() => toggleMember(member.id)}
                            className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary focus:ring-offset-0"
                          />
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-foreground">
                              {member.fullName}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {ROLE_LABELS[member.role] || member.role}
                            </p>
                          </div>
                        </label>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom bar */}
        <div className="sticky bottom-0 border-t border-border bg-background/95 px-5 py-3 backdrop-blur-sm">
          <button
            onClick={handleSubmit}
            disabled={isPending || selected.size === 0}
            className="btn-gradient flex h-10 w-full items-center justify-center gap-1.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
          >
            <UserPlus className="h-3.5 w-3.5" />
            {isPending
              ? "Đang thêm..."
              : selected.size === 0
                ? "Chọn học viên để thêm"
                : `Thêm ${selected.size} học viên`}
          </button>
        </div>
      </div>
    </div>
  );
}
