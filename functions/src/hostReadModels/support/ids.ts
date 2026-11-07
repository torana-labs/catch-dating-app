/** Document ids the event assistance stores accept. */
export const assistanceIdPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;

export function isAssistanceId(value: unknown): value is string {
  return typeof value === "string" && assistanceIdPattern.test(value);
}

export function distinctIds(values: unknown[]): string[] {
  return [...new Set(values.filter(isAssistanceId))];
}
