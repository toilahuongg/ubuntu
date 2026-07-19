"use client";

import { DttClassTab } from "./dtt-class-tab";
import type { TaskTargetRole } from "@/lib/domain";

type ClassItem = {
  id: string;
  name: string;
  startDayOfWeek: number;
};

type EnrollmentItem = {
  userId: string;
  fullName: string;
  role: string;
  classId: string;
  className: string;
  enrolledAt: string;
};

type NonDttMember = {
  id: string;
  fullName: string;
  role: string;
  regionId: string | null;
  regionName: string | null;
};

export function DttManager({
  classes,
  enrollments,
  nonDttMembers,
  availableTasks,
  classTasksByClass,
}: {
  classes: ClassItem[];
  enrollments: EnrollmentItem[];
  nonDttMembers: NonDttMember[];
  availableTasks?: Array<{
    id: string;
    title: string;
    expReward: number;
    pointReward: number;
  }>;
  classTasksByClass?: Record<string, Array<{
    taskId: string;
    taskTitle: string;
    description: string;
    deadlineTime: string;
    expReward: number;
    lateWindowDays: number;
    targetRoles: TaskTargetRole[];
    submissionMessage: string;
    isInherited: boolean;
  }>>;
}) {
  return (
    <div className="space-y-6">
      <DttClassTab
        classes={classes}
        enrollments={enrollments}
        nonDttMembers={nonDttMembers}
        availableTasks={availableTasks}
        classTasksByClass={classTasksByClass}
      />
    </div>
  );
}
