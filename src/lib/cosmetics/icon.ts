export function isCosmeticImageIcon(
  value: string | null | undefined,
): value is string {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized.startsWith("/");
}

export function getCosmeticImageIcon(
  value: string | null | undefined,
): string | null {
  if (!isCosmeticImageIcon(value)) return null;
  return value.trim();
}

export function getCosmeticTextIcon(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  if (isCosmeticImageIcon(value)) return null;
  const normalized = value.trim();
  return normalized || null;
}
