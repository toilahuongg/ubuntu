import type { Role, SessionUser, TaskScope } from "@/lib/domain";

export type TaskStatus = "OPEN" | "LOCKED";

export type TaskSummary = {
  id: string;
  title: string;
  description: string;
  deadlineTime: string;
  expReward: number;
  lateWindowDays: number;
  scope: TaskScope;
  isActive: boolean;
  teamId: string;
  zoneId: string | null;
  regionId: string | null;
  createdAt: string;
};

export type TaskCard = {
  id: string;
  title: string;
  description: string;
  date: string;
  deadlineAt: string;
  expReward: number;
  status: TaskStatus;
  completionCount: number;
  totalCount: number;
  myCompletionCount: number;
};

export type RosterEntry = {
  id: string;
  fullName: string;
  role: Role;
  completionCount: number;
};

export type TaskDetail = {
  id: string;
  title: string;
  description: string;
  date: string;
  deadlineAt: string;
  expReward: number;
  status: TaskStatus;
  myCompletionCount: number;
  selectedSubject: SessionUser;
  rosterMembers: SessionUser[];
  roster: RosterEntry[];
};

export type DashboardMemberTaskStatus = {
  taskId: string;
  applicable: boolean;
  completionCount: number;
};

export type DashboardRosterEntry = {
  id: string;
  fullName: string;
  role: Role;
  completed: number;
  pending: number;
  statuses: DashboardMemberTaskStatus[];
};

export type DashboardHighlights = {
  visibleUsers: number;
  completionPercent: number;
  completed: number;
  pending: number;
};

export type DashboardView = {
  date: string;
  highlights: DashboardHighlights;
  cards: TaskCard[];
  roster: DashboardRosterEntry[];
  tasks: TaskSummary[];
};

export type ScopeLabel = "TEAM" | "ZONE" | "REGION";

export type MemberDashboardView = {
  date: string;
  cards: TaskCard[];
  totalXp: number;
  level: number;
  progressXp: number;
  nextLevelXp: number;
  levelName: string;
  levelIcon: string;
};

export type LeaderDashboardView = DashboardView & {
  scopeLabel: ScopeLabel;
};

export type TemplateCoverageEntry = {
  completed: number;
  applicable: number;
};

export type TemplateCoverage = Record<string, TemplateCoverageEntry>;
