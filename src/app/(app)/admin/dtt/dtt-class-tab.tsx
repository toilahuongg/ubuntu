"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, X, ArrowRightLeft, ShieldAlert, Award, UserPlus, BookOpen, BarChart3 } from "lucide-react";
import {
  createClassAction,
  updateClassAction,
  deleteClassAction,
  unenrollStudentAction,
  changeStudentClassAction,
} from "./actions";
import { ConfirmDeleteButton, FormError, FormSuccess } from "../_shared";
import { BulkEnrollPopup, type BulkEnrollMember } from "./bulk-enroll-popup";
import { ClassTaskPopup } from "./class-task-popup";
import { ROLE_LABELS } from "@/lib/domain";

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

const WEEKDAY_LABELS = [
  { value: 1, label: "Thứ hai" },
  { value: 2, label: "Thứ ba" },
  { value: 3, label: "Thứ tư" },
  { value: 4, label: "Thứ năm" },
  { value: 5, label: "Thứ sáu" },
  { value: 6, label: "Thứ bảy" },
  { value: 7, label: "Chủ nhật" }
];

export function DttClassTab({
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
    isInherited: boolean;
  }>>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Forms state
  const [newClassName, setNewClassName] = useState("");
  const [newClassStartDay, setNewClassStartDay] = useState<number>(1);

  // Edit class state
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [editingClassName, setEditingClassName] = useState("");
  const [editingClassStartDay, setEditingClassStartDay] = useState<number>(1);

  // Bulk enroll state
  const [bulkEnrollClassId, setBulkEnrollClassId] = useState<string | null>(null);
  const [managingTaskClassId, setManagingTaskClassId] = useState<string | null>(null);

  const handleCreateClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;

    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const res = await createClassAction(newClassName, newClassStartDay);
      if (res.ok) {
        setSuccess(`Đã tạo lớp học "${newClassName.trim()}" thành công.`);
        setNewClassName("");
        setNewClassStartDay(1);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  };

  const handleUpdateClass = (classId: string) => {
    if (!editingClassName.trim()) return;

    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const res = await updateClassAction(classId, editingClassName, editingClassStartDay);
      if (res.ok) {
        setSuccess(`Đã cập nhật lớp thành công.`);
        setEditingClassId(null);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  };

  const handleUnenrollStudent = (userId: string) => {
    return async () => {
      const res = await unenrollStudentAction(userId);
      if (res.ok) {
        router.refresh();
        return { ok: true as const };
      } else {
        return { ok: false as const, error: res.error };
      }
    };
  };

  const handleChangeStudentClass = (userId: string, targetClassId: string) => {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const res = await changeStudentClassAction(userId, targetClassId);
      if (res.ok) {
        const student = enrollments.find(e => e.userId === userId);
        const className = classes.find(c => c.id === targetClassId)?.name || "";
        setSuccess(`Đã chuyển học viên ${student?.fullName} sang lớp ${className}.`);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  };

  return (
    <div className="space-y-6">
      {error && <FormError message={error} onDismiss={() => setError(null)} />}
      {success && <FormSuccess message={success} onDismiss={() => setSuccess(null)} />}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        {/* Left column: creation & enrollment forms */}
        <div className="space-y-4">
          {/* Create Class Card */}
          <div className="glass-card space-y-4 border border-border/40 p-4">
            <div className="flex items-center gap-2 border-b border-border/40 pb-2">
              <Plus className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Tạo lớp học mới</h3>
            </div>
            <form onSubmit={handleCreateClass} className="space-y-3">
              <input
                type="text"
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                placeholder="Tên lớp học (VD: Lớp ĐTT Khóa 1)"
                required
                className="h-10 w-full rounded-lg border border-border bg-overlay-subtle px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25"
              />
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Thứ bắt đầu tuần</label>
                <select
                  value={newClassStartDay}
                  onChange={(e) => setNewClassStartDay(Number(e.target.value))}
                  className="form-select w-full"
                >
                  {WEEKDAY_LABELS.map(d => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={isPending || !newClassName.trim()}
                className="btn-gradient flex h-10 w-full items-center justify-center gap-1.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
              >
                Tạo lớp học
              </button>
            </form>
          </div>
        </div>

        {/* Right column: Class Lists with students */}
        <div className="space-y-4">
          {classes.length === 0 ? (
            <div className="flex flex-col items-center justify-center space-y-3 rounded-lg border border-dashed border-border bg-overlay-subtle/20 p-8 text-center">
              <ShieldAlert className="h-10 w-10 text-muted-foreground/60" />
              <p className="text-sm font-semibold text-muted-foreground">Chưa có lớp học ĐTT nào được tạo</p>
              <p className="text-xs text-muted-foreground/50 max-w-xs leading-relaxed">Hãy tạo lớp học ở bảng bên trái để bắt đầu quản lý danh sách học viên</p>
            </div>
          ) : (
            classes.map((classItem) => {
              const classStudents = enrollments.filter((e) => e.classId === classItem.id);
              const otherClasses = classes.filter((c) => c.id !== classItem.id);

              return (
                <div key={classItem.id} className="glass-card overflow-hidden border border-border/40">
                  {/* Class Header */}
                  <div className="flex items-center justify-between border-b border-border/40 bg-overlay-subtle/50 px-4 py-3">
                    {editingClassId === classItem.id ? (
                      <div className="flex items-center gap-2 flex-1 max-w-md">
                        <input
                          type="text"
                          value={editingClassName}
                          onChange={(e) => setEditingClassName(e.target.value)}
                          className="h-8 w-full max-w-[150px] rounded-lg bg-overlay-subtle border border-border px-2 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                        />
                        <select
                          value={editingClassStartDay}
                          onChange={(e) => setEditingClassStartDay(Number(e.target.value))}
                          className="h-8 rounded-lg bg-overlay-subtle border border-border px-2 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                        >
                          {WEEKDAY_LABELS.map(d => (
                            <option key={d.value} value={d.value}>{d.label}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleUpdateClass(classItem.id)}
                          className="rounded-md bg-primary px-2 py-1 text-xs font-semibold text-background hover:bg-primary/95 shrink-0"
                        >
                          Lưu
                        </button>
                        <button
                          onClick={() => setEditingClassId(null)}
                          className="p-1 text-muted-foreground hover:text-foreground shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-sm truncate text-foreground">{classItem.name}</h4>
                          <span className="inline-flex shrink-0 items-center rounded-md border border-primary/10 bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary">
                            {classStudents.length} học viên
                          </span>
                          <button
                            onClick={() => {
                              setEditingClassId(classItem.id);
                              setEditingClassName(classItem.name);
                              setEditingClassStartDay(classItem.startDayOfWeek);
                            }}
                            className="text-[10px] font-medium text-muted-foreground hover:text-primary transition-colors ml-1"
                          >
                            Sửa
                          </button>
                          <button
                            onClick={() => setBulkEnrollClassId(classItem.id)}
                            className="text-[10px] font-medium text-muted-foreground hover:text-primary transition-colors ml-1"
                          >
                            <UserPlus className="h-3.5 w-3.5 inline mr-0.5" />
                            Thêm
                          </button>
                          <button
                            onClick={() => setManagingTaskClassId(classItem.id)}
                            className="text-[10px] font-medium text-muted-foreground hover:text-primary transition-colors ml-1 inline-flex items-center"
                          >
                            <BookOpen className="h-3.5 w-3.5 mr-0.5" />
                            Nhiệm vụ
                          </button>
                          <Link
                            href={`/admin/dtt/classes/${classItem.id}/report`}
                            className="text-[10px] font-medium text-muted-foreground hover:text-primary transition-colors ml-1 inline-flex items-center"
                          >
                            <BarChart3 className="h-3.5 w-3.5 mr-0.5" />
                            Báo cáo
                          </Link>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Bắt đầu tuần: {WEEKDAY_LABELS.find(d => d.value === classItem.startDayOfWeek)?.label ?? "Thứ hai"}
                        </p>
                      </div>
                    )}

                    <ConfirmDeleteButton
                      ariaLabel="Xóa lớp"
                      confirmLabel="Xác nhận xóa"
                      onConfirm={async () => {
                        const res = await deleteClassAction(classItem.id);
                        if (res.ok) router.refresh();
                        return res;
                      }}
                    />
                  </div>

                  {/* Class Student List */}
                  <div className="p-3">
                    {classStudents.length === 0 ? (
                      <p className="text-xs text-muted-foreground/50 py-4 text-center">Chưa có học viên trong lớp này</p>
                    ) : (
                      <div className="space-y-1.5">
                        {classStudents.map((student) => (
                          <div key={student.userId} className="flex items-center justify-between rounded-lg border border-transparent p-2.5 transition-colors hover:border-border/30 hover:bg-overlay-subtle/30">
                            <div className="min-w-0 flex items-center gap-2.5">
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-overlay-subtle">
                                <Award className="h-4 w-4 text-primary/70" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold truncate text-foreground">{student.fullName}</p>
                                <p className="text-[10px] text-muted-foreground font-medium">
                                  {ROLE_LABELS[student.role as keyof typeof ROLE_LABELS] || student.role}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              {/* Move class action selector */}
                              {otherClasses.length > 0 && (
                                <div className="flex items-center gap-1.5 rounded-lg border border-border/40 bg-overlay-subtle px-2 py-1">
                                  <ArrowRightLeft className="h-3 w-3 text-muted-foreground" />
                                  <select
                                    onChange={(e) => {
                                      if (e.target.value) {
                                        handleChangeStudentClass(student.userId, e.target.value);
                                      }
                                    }}
                                    defaultValue=""
                                    className="bg-transparent border-0 text-[10px] font-semibold text-muted-foreground hover:text-foreground outline-none cursor-pointer max-w-[80px]"
                                  >
                                    <option value="" disabled>Chuyển lớp...</option>
                                    {otherClasses.map((oc) => (
                                      <option key={oc.id} value={oc.id}>
                                        {oc.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              )}

                              {/* Unenroll action */}
                              <ConfirmDeleteButton
                                ariaLabel="Rút khỏi ĐTT"
                                confirmLabel="Xác nhận rút"
                                onConfirm={handleUnenrollStudent(student.userId)}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Bulk enroll popup */}
      {bulkEnrollClassId && (() => {
        const targetClass = classes.find((c) => c.id === bulkEnrollClassId);
        if (!targetClass) return null;

        // Get users already enrolled in this specific class
        const classEnrolledIds = new Set(
          enrollments.filter((e) => e.classId === bulkEnrollClassId).map((e) => e.userId)
        );

        // Filter to members not in ANY DTT class (same as nonDttMembers)
        const popupMembers: BulkEnrollMember[] = nonDttMembers.map((m) => ({
          id: m.id,
          fullName: m.fullName,
          role: m.role,
          regionId: m.regionId,
          regionName: m.regionName,
        }));

        return (
          <BulkEnrollPopup
            classId={bulkEnrollClassId}
            className={targetClass.name}
            onClose={() => setBulkEnrollClassId(null)}
            members={popupMembers}
          />
        );
      })()}

      {/* Class task popup */}
      {managingTaskClassId && (() => {
        const targetClass = classes.find((c) => c.id === managingTaskClassId);
        if (!targetClass) return null;
        return (
          <ClassTaskPopup
            classId={managingTaskClassId}
            className={targetClass.name}
            availableTasks={availableTasks ?? []}
            classTasks={classTasksByClass?.[managingTaskClassId] ?? []}
            onClose={() => setManagingTaskClassId(null)}
          />
        );
      })()}
    </div>
  );
}
