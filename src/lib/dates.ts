import { subDays, addDays } from "date-fns";
import { fromZonedTime, formatInTimeZone } from "date-fns-tz";

import { DEFAULT_TIMEZONE } from "@/lib/domain";
import { getOptionalEnv } from "@/lib/env";

export function getAppTimezone() {
  return getOptionalEnv().appTimezone || DEFAULT_TIMEZONE;
}

export function getTodayDateKey(date = new Date()) {
  return formatInTimeZone(date, getAppTimezone(), "yyyy-MM-dd");
}

export function getYearMonthFromDateKey(dateKey: string) {
  return dateKey.slice(0, 7);
}

export function getCurrentYearMonth(date = new Date()) {
  return formatInTimeZone(date, getAppTimezone(), "yyyy-MM");
}

export function createDeadlineAt(dateKey: string, time: string) {
  return fromZonedTime(`${dateKey}T${time}:00`, getAppTimezone());
}

export function formatDateLabel(dateKey: string) {
  return formatInTimeZone(
    fromZonedTime(`${dateKey}T00:00:00`, getAppTimezone()),
    getAppTimezone(),
    "EEEE, dd/MM/yyyy",
  );
}

export function formatDateTimeLabel(date: Date) {
  return formatInTimeZone(date, getAppTimezone(), "HH:mm - dd/MM/yyyy");
}

export function formatTimeLabel(date: Date) {
  return formatInTimeZone(date, getAppTimezone(), "HH:mm");
}

export function getDayOfMonthFromDateKey(dateKey: string) {
  return Number.parseInt(dateKey.slice(8, 10), 10);
}

export function getIsoWeekdayFromDateKey(dateKey: string) {
  return Number.parseInt(
    formatInTimeZone(
      fromZonedTime(`${dateKey}T00:00:00`, getAppTimezone()),
      getAppTimezone(),
      "i",
    ),
    10,
  );
}

export function getWeekRangeFromDateKey(
  dateKey: string,
  startDayOfWeek: number,
): { startStr: string; endStr: string } {
  const currentWeekday = getIsoWeekdayFromDateKey(dateKey); // 1 = Monday, 7 = Sunday
  let delta = currentWeekday - startDayOfWeek;
  if (delta < 0) {
    delta += 7;
  }

  const tz = getAppTimezone();
  const dateObj = fromZonedTime(`${dateKey}T12:00:00`, tz);
  const startDateObj = subDays(dateObj, delta);
  const endDateObj = addDays(startDateObj, 6);

  const startStr = formatInTimeZone(startDateObj, tz, "yyyy-MM-dd");
  const endStr = formatInTimeZone(endDateObj, tz, "yyyy-MM-dd");

  return { startStr, endStr };
}
