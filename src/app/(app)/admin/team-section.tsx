import { Building2, Users } from "lucide-react";

type Team = {
  code: string;
  id: string;
  leadUserIds: string[];
  memberCount: number;
  name: string;
};

export function TeamSection({ teams }: { teams: Team[] }) {
  if (teams.length === 0) {
    return (
      <div className="glass-card py-8 text-center text-sm text-muted-foreground">
        Chưa có nhóm nào.
      </div>
    );
  }

  return (
    <div className="glass-card divide-y divide-border overflow-hidden">
      {teams.map((team) => (
        <div key={team.id} className="flex items-center justify-between px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <p className="truncate text-sm font-medium">{team.name}</p>
            </div>
            <p className="ml-5.5 text-[11px] text-muted-foreground">
              {team.code}
            </p>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="h-3 w-3" />
            {team.memberCount}
          </div>
        </div>
      ))}
    </div>
  );
}
