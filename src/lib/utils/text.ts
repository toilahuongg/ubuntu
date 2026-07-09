export function normalizeOptionalText(value: FormDataEntryValue | null) {
  const nextValue = value?.toString().trim();
  return nextValue ? nextValue : undefined;
}

export function normalizeText(value: FormDataEntryValue | null, fallback = "") {
  return value?.toString().trim() || fallback;
}

export function slugifyCode(input: string) {
  return input
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .toUpperCase();
}

/** Strip Vietnamese diacritics so search works with or without accents. */
export function stripDiacritics(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}
