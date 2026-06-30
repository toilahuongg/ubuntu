"use client";

import { useState } from "react";
import { GraduationCap, BookOpen } from "lucide-react";
import { DttClassTab } from "./dtt-class-tab";
import { DttTaskTab } from "./dtt-task-tab";

type ClassItem = {
  id: string;
  name: string;
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
        <div className="inline-flex rounded-2xl bg-overlay-subtle border border-border/60 p-1 gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("classes")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 ${
              activeTab === "classes"
                ? "bg-background text-foreground shadow-sm ring-1 ring-border/20"
                : "text-muted-foreground hover:text-foreground hover:bg-overlay-subtle/50"
            }`}
          >
            <GraduationCap className="h-4 w-4" />
            Lớp học & Học viên
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("tasks")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 ${
              activeTab === "tasks"
                ? "bg-background text-foreground shadow-sm ring-1 ring-border/20"
                : "text-muted-foreground hover:text-foreground hover:bg-overlay-subtle/50"
            }`}
          >
            <BookOpen className="h-4 w-4" />
            Nhiệm vụ ĐTT
          </button>
        </div>
      </div>

      {/* Tab content panel */}
      <div className="transition-all duration-200 ease-in-out">
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
