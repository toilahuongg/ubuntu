import type { Role } from "@/lib/domain";
import type { TaskType } from "@/lib/tasks/constants";

export type AdminOperationsSummary = {
  assigned: number;
  completed: number;
  pending: number;
  completionPercent: number;
};

export type AdminOperationsCompletionTask = {
  id: string;
  completionCount: number;
  submittedAt: string;
  taskType: TaskType;
  title: string;
};

export type AdminOperationsCompletionDay = {
  date: string;
  completionCount: number;
  tasks: AdminOperationsCompletionTask[];
};

export type AdminOperationsSelection = {
  teamId: string | null;
  zoneId: string | null;
  regionId: string | null;
};

export type AdminOperationsNodeSummary = {
  id: string;
  memberCount: number;
  name: string;
  summary: AdminOperationsSummary;
};

export type AdminOperationsRegionNode = AdminOperationsNodeSummary & {
  teamId: string;
  zoneId: string;
};

export type AdminOperationsZoneNode = AdminOperationsNodeSummary & {
  regions: AdminOperationsRegionNode[];
  teamId: string;
};

export type AdminOperationsTeamNode = AdminOperationsNodeSummary & {
  zones: AdminOperationsZoneNode[];
};

export type AdminOperationsMember = {
  completionDays: AdminOperationsCompletionDay[];
  id: string;
  fullName: string;
  regionId: string | null;
  role: Role;
  roleLabel: string;
  status: "complete" | "idle" | "in_progress" | "needs_attention";
  summary: AdminOperationsSummary;
  teamId: string | null;
  zoneId: string | null;
};

export type AdminOperationsView = {
  dateKey: string;
  members: AdminOperationsMember[];
  scope: {
    memberCount: number;
    name: string;
    role: Role;
    roleLabel: string;
  };
  selectionDefaults: AdminOperationsSelection;
  summary: AdminOperationsSummary;
  tree: {
    teams: AdminOperationsTeamNode[];
  };
};
