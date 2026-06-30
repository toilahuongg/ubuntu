"use client";

import { useState, useTransition } from "react";
import { Plus, X, GraduationCap, Users, UserMinus, ArrowRightLeft, ShieldAlert, Award } from "lucide-react";
import {
  createClassAction,
  updateClassAction,
  deleteClassAction,
  enrollStudentAction,
  unenrollStudentAction,
  changeStudentClassAction,
} from "./actions";
import { ConfirmDeleteButton, FormError, FormSuccess } from "../_shared";

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

export function DttClassTab({
  classes,
  enrollments,
  nonDttMembers,
}: {
  classes: ClassItem[];
  enrollments: EnrollmentItem[];
  nonDttMembers: NonDttMember[];
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Forms state
  const [newClassName, setNewClassName] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");

  // Edit class state
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [editingClassName, setEditingClassName] = useState("");

  const ROLE_LABELS: Record<string, string> = {
    ADMIN: "Quản trị viên",
    TEAM_LEAD: "Trưởng nhóm",
    ZONE_LEAD: "Trưởng vùng",
    REGIONAL_LEAD: "Trưởng khu vực",
    NGV: "Nguyện vọng",
    MEMBER: "Thành viên",
    TDM: "Tín đồ mới",
  };

  const handleCreateClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;

    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const res = await createClassAction(newClassName);
      if (res.ok) {
        setSuccess(`Đã tạo lớp học "${newClassName}" thành công.`);
        setNewClassName("");
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
      const res = await updateClassAction(classId, editingClassName);
      if (res.ok) {
        setSuccess(`Đã đổi tên lớp thành "${editingClassName}".`);
        setEditingClassId(null);
      } else {
        setError(res.error);
      }
    });
  };

  const handleEnrollStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !selectedClassId) return;

    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const res = await enrollStudentAction(selectedStudentId, selectedClassId);
      if (res.ok) {
        const studentName = nonDttMembers.find(m => m.id === selectedStudentId)?.fullName || "";
        const className = classes.find(c => c.id === selectedClassId)?.name || "";
        setSuccess(`Đã xếp học viên ${studentName} vào lớp ${className}.`);
        setSelectedStudentId("");
        setSelectedClassId("");
      } else {
        setError(res.error);
      }
    });
  };

  const handleUnenrollStudent = (userId: string, fullName: string) => {
    return async () => {
      const res = await unenrollStudentAction(userId);
      if (res.ok) {
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
      } else {
        setError(res.error);
      }
    });
  };

  return (
    <div className="space-y-6">
      {error && <FormError message={error} onDismiss={() => setError(null)} />}
      {success && <FormSuccess message={success} onDismiss={() => setSuccess(null)} />}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column: creation & enrollment forms */}
        <div className="space-y-6 lg:col-span-1">
          {/* Create Class Card */}
          <div className="glass-card p-5 space-y-4 border border-border/40 shadow-sm rounded-2xl">
            <div className="flex items-center gap-2 border-b border-border/40 pb-2">
              <Plus className="h-4 w-4 text-primary" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Tạo lớp học mới</h3>
            </div>
            <form onSubmit={handleCreateClass} className="space-y-3">
              <input
                type="text"
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                placeholder="Tên lớp học (VD: Lớp ĐTT Khóa 1)"
                required
                className="h-10 w-full rounded-xl bg-overlay-subtle border border-border px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25"
              />
              <button
                type="submit"
                disabled={isPending || !newClassName.trim()}
                className="btn-gradient flex h-10 w-full items-center justify-center gap-1.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
              >
                Tạo lớp học
              </button>
            </form>
          </div>

          {/* Enroll Student Card */}
          <div className="glass-card p-5 space-y-4 border border-border/40 shadow-sm rounded-2xl">
            <div className="flex items-center gap-2 border-b border-border/40 pb-2">
              <GraduationCap className="h-4 w-4 text-primary" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Ghi danh học viên</h3>
            </div>
            <form onSubmit={handleEnrollStudent} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Thành viên chưa vào ĐTT</label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  required
                  className="h-10 w-full rounded-xl bg-overlay-subtle border border-border px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25"
                >
                  <option value="">-- Chọn thành viên --</option>
                  {nonDttMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.fullName} ({ROLE_LABELS[member.role] || member.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Lớp học ĐTT mục tiêu</label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  required
                  className="h-10 w-full rounded-xl bg-overlay-subtle border border-border px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25"
                >
                  <option value="">-- Chọn lớp học --</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={isPending || !selectedStudentId || !selectedClassId}
                className="btn-gradient flex h-10 w-full items-center justify-center gap-1.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
              >
                Ghi danh
              </button>
            </form>
          </div>
        </div>

        {/* Right column: Class Lists with students */}
        <div className="space-y-4 lg:col-span-2">
          {classes.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-overlay-subtle/20 p-8 text-center space-y-3">
              <ShieldAlert className="h-10 w-10 text-muted-foreground/60" />
              <p className="text-sm font-semibold text-muted-foreground">Chưa có lớp học ĐTT nào được tạo</p>
              <p className="text-xs text-muted-foreground/50 max-w-xs leading-relaxed">Hãy tạo lớp học ở bảng bên trái để bắt đầu quản lý danh sách học viên</p>
            </div>
          ) : (
            classes.map((classItem) => {
              const classStudents = enrollments.filter((e) => e.classId === classItem.id);
              const otherClasses = classes.filter((c) => c.id !== classItem.id);

              return (
                <div key={classItem.id} className="glass-card overflow-hidden border border-border/40 shadow-sm rounded-2xl">
                  {/* Class Header */}
                  <div className="border-b border-border/40 bg-overlay-subtle/50 px-4 py-3 flex items-center justify-between">
                    {editingClassId === classItem.id ? (
                      <div className="flex items-center gap-2 flex-1 max-w-xs">
                        <input
                          type="text"
                          value={editingClassName}
                          onChange={(e) => setEditingClassName(e.target.value)}
                          className="h-8 w-full rounded-lg bg-overlay-subtle border border-border px-2 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                        />
                        <button
                          onClick={() => handleUpdateClass(classItem.id)}
                          className="px-2 py-1 bg-primary text-background rounded-md text-xs font-semibold hover:bg-primary/95"
                        >
                          Lưu
                        </button>
                        <button
                          onClick={() => setEditingClassId(null)}
                          className="p-1 text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 min-w-0">
                        <h4 className="font-semibold text-sm truncate text-foreground">{classItem.name}</h4>
                        <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/10">
                          {classStudents.length} học viên
                        </span>
                        <button
                          onClick={() => {
                            setEditingClassId(classItem.id);
                            setEditingClassName(classItem.name);
                          }}
                          className="text-[10px] font-medium text-muted-foreground hover:text-primary transition-colors ml-1"
                        >
                          Đổi tên
                        </button>
                      </div>
                    )}

                    <ConfirmDeleteButton
                      ariaLabel="Xóa lớp"
                      confirmLabel="Xác nhận xóa"
                      onConfirm={async () => {
                        const res = await deleteClassAction(classItem.id);
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
                          <div key={student.userId} className="flex items-center justify-between p-2.5 hover:bg-overlay-subtle/30 rounded-xl transition-all border border-transparent hover:border-border/30">
                            <div className="min-w-0 flex items-center gap-2.5">
                              <div className="h-7 w-7 rounded-lg bg-overlay-subtle flex items-center justify-center shrink-0">
                                <Award className="h-4 w-4 text-primary/70" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold truncate text-foreground">{student.fullName}</p>
                                <p className="text-[10px] text-muted-foreground font-medium">
                                  {ROLE_LABELS[student.role] || student.role}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              {/* Move class action selector */}
                              {otherClasses.length > 0 && (
                                <div className="flex items-center gap-1.5 rounded-lg bg-overlay-subtle border border-border/40 px-2 py-1">
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
                                onConfirm={handleUnenrollStudent(student.userId, student.fullName)}
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
    </div>
  );
}
