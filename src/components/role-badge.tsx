import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS, type Role } from "@/lib/domain";

const toneClasses: Record<Role, string> = {
  ADMIN: "border-transparent bg-slate-900 text-white hover:bg-slate-900",
  TEAM_LEAD: "border-transparent bg-indigo-100 text-indigo-900 hover:bg-indigo-100",
  REGIONAL_LEAD: "border-transparent bg-teal-100 text-teal-900 hover:bg-teal-100",
  MEMBER: "border-transparent bg-amber-100 text-amber-900 hover:bg-amber-100",
};

export function RoleBadge({ role }: { role: Role }) {
  return <Badge className={toneClasses[role]}>{ROLE_LABELS[role]}</Badge>;
}
