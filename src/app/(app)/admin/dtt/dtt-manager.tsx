"use client";

import { useState } from "react";
import { GraduationCap, BookOpen } from "lucide-react";
import { DttClassTab } from "./dtt-class-tab";
import { DttTaskTab } from "./dtt-task-tab";

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
};

type TaskItem = {
  id: string;
  title: string;
  isDtt: boolean;
};

export function DttManager({
  classes,
  enrollments,
  nonDttMembers,
  tasks,
}: {
  classes: ClassItem[];
  enrollments: EnrollmentItem[];
  nonDttMembers: NonDttMember[];
  tasks: TaskItem[];
}) {
  const [activeTab, setActiveTab] = useState<"classes" | "tasks">("classes");

  return (
    <div className="space-y-6">
      {/* Segmented control tabs */}
      <div className="flex justify-center sm:justify-start">
        <div
          role="tablist"
          aria-label="Quản lý Trường học ĐTT"
          className="inline-flex gap-1 rounded-lg border border-border/60 bg-overlay-subtle p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "classes"}
            aria-controls="dtt-classes-panel"
            id="dtt-classes-tab"
            onClick={() => setActiveTab("classes")}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors duration-150 ${
              activeTab === "classes"
                ? "bg-background text-foreground ring-1 ring-border/40"
                : "text-muted-foreground hover:text-foreground hover:bg-overlay-subtle/50"
            }`}
          >
            <GraduationCap className="h-4 w-4" />
            Lớp học & Học viên
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "tasks"}
            aria-controls="dtt-tasks-panel"
            id="dtt-tasks-tab"
            onClick={() => setActiveTab("tasks")}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors duration-150 ${
              activeTab === "tasks"
                ? "bg-background text-foreground ring-1 ring-border/40"
                : "text-muted-foreground hover:text-foreground hover:bg-overlay-subtle/50"
            }`}
          >
            <BookOpen className="h-4 w-4" />
            Nhiệm vụ ĐTT
          </button>
        </div>
      </div>

      {/* Tab content panel */}
      <div
        role="tabpanel"
        id={activeTab === "classes" ? "dtt-classes-panel" : "dtt-tasks-panel"}
        aria-labelledby={activeTab === "classes" ? "dtt-classes-tab" : "dtt-tasks-tab"}
      >
        {activeTab === "classes" ? (
          <DttClassTab
            classes={classes}
            enrollments={enrollments}
            nonDttMembers={nonDttMembers}
          />
        ) : (
          <DttTaskTab tasks={tasks} />
        )}
      </div>
    </div>
  );
}
