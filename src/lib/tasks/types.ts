import type { Role, SessionUser, TaskScope } from "@/lib/domain";
import type { TaskType } from "@/lib/tasks/constants";

export type TaskStatus = "OPEN" | "LOCKED" | "COMPLETED";

export type TaskProgressKind = "TOTAL" | "MONTHLY_MEMBER" | "DAILY_MEMBER";

export type TaskProgress = {
  kind: TaskProgressKind;
  current: number;
  target: number | null;
  unitLabel: "lượt" | "ngày";
  isGoalMissing: boolean;
  isGoalComplete: boolean;
};

export type DashboardGoalNoticeTask = {
  id: string;
  title: string;
  taskType: TaskType;
};

export type DashboardGoalNotice = {
  missingCount: number;
  tasks: DashboardGoalNoticeTask[];
};

export type TaskSummary = {
  id: string;
  title: string;
  description: string;
  deadlineTime: string;
  expReward: number;
  pointReward: number;
  lateWindowDays: number;
  scope: TaskScope;
  taskType: TaskType;
  targetCount: number | null;
  targetRoles: Role[];
  submissionMessage: string;
  completionMessage: string;
  completedAt: string | null;
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
  pointReward: number;
  status: TaskStatus;
  completionCount: number;
  totalCount: number;
  myCompletionCount: number;
  taskType: TaskType;
  isApplicableToActor: boolean;
  progress: TaskProgress;
};

export type RosterEntry = {
  id: string;
  fullName: string;
  role: Role;
  completionCount: number;
  monthlyCompletion?: number;
  monthlyGoal?: number | null;
  contribution?: number;
};

export type BackfillDay = {
  dateKey: string;
  completionCount: number;
};

export type TaskDetail = {
  id: string;
  title: string;
  description: string;
  date: string;
  yearMonth: string;
  deadlineAt: string;
  expReward: number;
  pointReward: number;
  lateWindowDays: number;
  status: TaskStatus;
  taskType: TaskType;
  targetRoles: Role[];
  targetCount: number | null;
  totalAcrossAll: number;
  monthlyGoal: number | null;
  monthlyCompletion: number;
  myCompletionCount: number;
  isApplicableToActor: boolean;
  totalCompletions: number;
  selectedSubject: SessionUser;
  rosterMembers: SessionUser[];
  roster: RosterEntry[];
  backfillDays: BackfillDay[];
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
  goalNotice: DashboardGoalNotice | null;
  roster: DashboardRosterEntry[];
  tasks: TaskSummary[];
};

export type ScopeLabel = "TEAM" | "ZONE" | "REGION";

export type MemberDashboardView = {
  date: string;
  cards: TaskCard[];
  goalNotice: DashboardGoalNotice | null;
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
