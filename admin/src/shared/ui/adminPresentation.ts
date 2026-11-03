const queueTitleOverrides: Record<string, string> = {
  banned_text: "Banned language",
  explicit_photo: "Explicit profile photo",
  fake_profile: "Possible fake profile",
  harassment: "Harassment in chat",
};

export function displayAdminQueueTitle(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "Untitled queue item";
  const override = queueTitleOverrides[trimmed.toLowerCase()];
  if (override) return override;
  if (!/[_-]/u.test(trimmed)) return trimmed;
  const words = trimmed.replace(/[_-]+/gu, " ").replace(/\s+/gu, " ");
  return `${words.charAt(0).toUpperCase()}${words.slice(1)}`;
}

/** A stored code as a reader sees it: "singlesMixer" and "mumbai" become "Singles mixer" and "Mumbai". */
export function displayAdminCode(value: string): string {
  const words = value.trim().replace(/(\p{Ll})(\p{Lu})/gu, "$1 $2").replace(/[_-]+/gu, " ")
    .replace(/\s+/gu, " ").toLowerCase();
  return `${words.charAt(0).toUpperCase()}${words.slice(1)}`;
}
