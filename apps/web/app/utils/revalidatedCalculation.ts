/** A fresh calculation action wins only once; saved subject edits use fresh loader data. */
export function resolveRevalidatedCalculation<T>(
  initialResult: T | null,
  actionResult: (T & { error?: unknown }) | null | undefined,
  hasNewAction: boolean,
): T | null {
  return hasNewAction && actionResult && !actionResult.error ? actionResult : initialResult;
}
