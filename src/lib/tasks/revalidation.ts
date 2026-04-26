export const DEFAULT_SUBMISSION_REVALIDATION_PATHS = ["/dashboard"] as const;

export function resolveSubmissionRevalidationPaths(
  paths?: readonly string[],
): string[] {
  const candidates =
    paths && paths.length > 0 ? paths : DEFAULT_SUBMISSION_REVALIDATION_PATHS;

  return Array.from(
    new Set(
      candidates.filter(
        (path): path is string => path.startsWith("/") && path.length > 0,
      ),
    ),
  );
}
