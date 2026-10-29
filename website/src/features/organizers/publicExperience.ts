/**
 * Explicit public participation declarations only. Format defaults, booking and attendance never qualify.
 * The rotations experience is valid on an event but is dating framing, so it is never public (CAT-247).
 */
export function publicExperienceActivities(value: unknown): Array<"introductions" | "sharedActivities"> {
  if (!Array.isArray(value) || value.length < 1 || value.length > 3 || new Set(value).size !== value.length ||
    !value.every(item => item === "introductions" || item === "sharedActivities" || item === "rotations")) return [];
  return value.filter((item): item is "introductions" | "sharedActivities" => item !== "rotations");
}
