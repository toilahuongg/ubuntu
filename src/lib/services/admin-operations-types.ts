import type { Role } from "@/lib/domain";

export type AdminOperationsPeriod = "day" | "week" | "month";

export type AdminOperationsSummary = {
  assigned: number;
  completed: number;
  pending: number;
  completionPercent: number;
};

export type AdminOperationsMember = {
  id: string;
  fullName: string;
  role: Role;
  roleLabel: string;
  todayPending: number;
  status: "complete" | "idle" | "in_progress" | "needs_attention";
  periods: Record<AdminOperationsPeriod, AdminOperationsSummary>;
};

export type AdminOperationsTask = {
  id: string;
  title: string;
  deadlineAt: string;
  assigned: number;
  completed: number;
  pending: number;
  completionPercent: number;
};

export type AdminOperationsView = {
  scope: {
    role: Role;
    roleLabel: string;
    name: string;
    memberCount: number;
  };
  periods: Record<AdminOperationsPeriod, AdminOperationsSummary>;
  members: AdminOperationsMember[];
  todayTasks: AdminOperationsTask[];
};
