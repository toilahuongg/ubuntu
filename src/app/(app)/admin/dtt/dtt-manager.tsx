"use client";

import { DttClassTab } from "./dtt-class-tab";

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
}: {
  classes: ClassItem[];
  enrollments: EnrollmentItem[];
  nonDttMembers: NonDttMember[];
}) {
  return (
    <div className="space-y-6">
      <DttClassTab
        classes={classes}
        enrollments={enrollments}
        nonDttMembers={nonDttMembers}
      />
    </div>
  );
}
