import type { DailyScripture } from "@/lib/daily-scripture";
import type { TrendPoint } from "@/lib/services/analytics-service";
import type {
  Role,
  SessionUser,
  TaskScope,
  TaskTargetRole,
} from "@/lib/domain";
import type { TaskType } from "@/lib/tasks/constants";
import type { TaskScheduleType } from "@/lib/tasks/schedule";
import type { EquippedView } from "@/lib/cosmetics/serialize";

export type TaskStatus = "OPEN" | "LOCKED" | "COMPLETED";
export type TaskMoveDirection = "up" | "down";

export type TaskProgressKind =
  | "TOTAL"
  | "MONTHLY_MEMBER"
  | "WEEKLY_MEMBER"
  | "DAILY_MEMBER";

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
  externalLabel: string;
  externalUrl: string;
  deadlineTime: string;
  expReward: number;
  pointReward: number;
  lateWindowDays: number;
  sortOrder: number | null;
  scope: TaskScope;
  taskType: TaskType;
  scheduleType: TaskScheduleType;
  scheduledWeekdays: number[];
  scheduledMonthDays: number[];
  targetCount: number | null;
  targetRoles: TaskTargetRole[];
  submissionMessage: string;
  completionMessage: string;
  completedAt: string | null;
  isActive: boolean;
  isDtt: boolean;
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
  notificationTime: string;
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
  externalLabel: string;
  externalUrl: string;
  date: string;
  yearMonth: string;
  deadlineAt: string;
  expReward: number;
  pointReward: number;
  lateWindowDays: number;
  status: TaskStatus;
  taskType: TaskType;
  targetRoles: TaskTargetRole[];
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

type DashboardLevelSummary = {
  currentLevelXp: number;
  dailyScripture: DailyScripture;
  equipped?: EquippedView;
  totalXp: number;
  level: number;
  progressXp: number;
  nextLevelXp: number;
  levelName: string;
  levelDescription: string;
  levelIcon: string;
};

export type MemberDashboardView = {
  date: string;
  cards: TaskCard[];
  goalNotice: DashboardGoalNotice | null;
} & DashboardLevelSummary;

export type LeaderDashboardView = DashboardView & {
  scopeLabel: ScopeLabel;
  trends: TrendPoint[];
} & DashboardLevelSummary;

export type TemplateCoverageEntry = {
  completed: number;
  applicable: number;
};

export type TemplateCoverage = Record<string, TemplateCoverageEntry>;
