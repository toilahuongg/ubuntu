import type { Role, SessionUser, TemplateScope } from "@/lib/domain";

export type OccurrenceStatus = "OPEN" | "LOCKED";

export type TemplateSummary = {
  id: string;
  title: string;
  description: string;
  deadlineTime: string;
  expReward: number;
  lateWindowDays: number;
  scope: TemplateScope;
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
  status: OccurrenceStatus;
  // Number of users inside the occurrence scope that have at least one
  // submission. A given user counts once regardless of how many times
  // they submitted.
  completionCount: number;
  // Total users inside occurrence scope (denominator).
  totalCount: number;
  // Number of times the acting user has submitted for themself.
  myCompletionCount: number;
};

export type RosterEntry = {
  id: string;
  fullName: string;
  role: Role;
  completionCount: number;
};

export type OccurrenceDetail = {
  id: string;
  title: string;
  description: string;
  date: string;
  deadlineAt: string;
  expReward: number;
  status: OccurrenceStatus;
  myCompletionCount: number;
  selectedSubject: SessionUser;
  rosterMembers: SessionUser[];
  roster: RosterEntry[];
};

export type DashboardRosterEntry = {
  id: string;
  fullName: string;
  role: Role;
  completed: number;
  pending: number;
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
  templates: TemplateSummary[];
};
