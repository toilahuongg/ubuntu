import type { SerializedUser } from "@/lib/domain";
import { ROLE_LABELS } from "@/lib/domain";

export function UserSection({ users }: { users: SerializedUser[] }) {
  if (users.length === 0) {
    return (
      <div className="glass-card py-8 text-center text-sm text-muted-foreground">
        Chưa có người dùng nào.
      </div>
    );
  }

  return (
    <div className="glass-card divide-y divide-border overflow-hidden">
      {users.map((user) => (
        <div key={user.id} className="flex items-center justify-between px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user.fullName}</p>
            <p className="text-[11px] text-muted-foreground">
              {ROLE_LABELS[user.role]}
              {user.username && ` · @${user.username}`}
            </p>
          </div>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              user.status === "ACTIVE"
                ? "bg-white/10 text-foreground"
                : user.status === "PENDING"
                  ? "bg-yellow-500/10 text-yellow-400"
                  : "bg-destructive/10 text-destructive"
            }`}
          >
            {user.status === "ACTIVE"
              ? "Hoạt động"
              : user.status === "PENDING"
                ? "Chờ duyệt"
                : "Khóa"}
          </span>
        </div>
      ))}
    </div>
  );
}
