export type DttTaskItem = {
  id: string;
  title: string;
  isDtt: boolean;
};

export type DttTaskOverrides = Record<string, boolean>;

export function mergeDttTaskState(
  tasks: DttTaskItem[],
  overrides: DttTaskOverrides,
): DttTaskItem[] {
  return tasks.map((task) =>
    Object.prototype.hasOwnProperty.call(overrides, task.id)
      ? { ...task, isDtt: overrides[task.id] }
      : task,
  );
}

export function clearSettledDttOverrides(
  tasks: DttTaskItem[],
  overrides: DttTaskOverrides,
): DttTaskOverrides {
  let changed = false;
  const next = { ...overrides };

  for (const task of tasks) {
    if (
      Object.prototype.hasOwnProperty.call(next, task.id) &&
      next[task.id] === task.isDtt
    ) {
      delete next[task.id];
      changed = true;
    }
  }

  return changed ? next : overrides;
}
