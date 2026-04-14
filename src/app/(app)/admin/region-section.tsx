import { MapPin, Users } from "lucide-react";

type Region = {
  code: string;
  id: string;
  leadUserIds: string[];
  memberCount: number;
  name: string;
  teamId: string;
  teamName?: string;
};

export function RegionSection({ regions }: { regions: Region[] }) {
  if (regions.length === 0) {
    return (
      <div className="glass-card py-8 text-center text-sm text-muted-foreground">
        Chưa có khu vực nào.
      </div>
    );
  }

  return (
    <div className="glass-card divide-y divide-border overflow-hidden">
      {regions.map((region) => (
        <div key={region.id} className="flex items-center justify-between px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <p className="truncate text-sm font-medium">{region.name}</p>
            </div>
            <p className="ml-5.5 text-[11px] text-muted-foreground">
              {region.code}
              {region.teamName && ` · ${region.teamName}`}
            </p>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="h-3 w-3" />
            {region.memberCount}
          </div>
        </div>
      ))}
    </div>
  );
}
