// How a programme's web links look (`organizerPrograms.branding`, set on
// the planner's Branding screen). Every guest, vendor and family read
// carries it as an optional `branding` field: absent when the programme
// has none (or it was cleared), which the pages read as rani with no
// cover and no credit.

export type ProgramBrandColor =
  "rani" | "marigold" | "mehendi" | "rose" | "haldi";

export interface ProgramGuestBranding {
  color: ProgramBrandColor;
  coverImagePath: string | null;
  creditLine: string | null;
}

const COLORS: ReadonlySet<string> =
  new Set(["rani", "marigold", "mehendi", "rose", "haldi"]);
const COVER_PATH =
  /^programs\/[A-Za-z0-9_-]{1,180}\/branding\/[A-Za-z0-9._-]{1,100}$/;

/** The programme's branding, or null when it has none or it is malformed. */
export function programGuestBranding(
  program: Record<string, unknown> | {branding?: unknown},
): ProgramGuestBranding | null {
  const raw = (program as {branding?: unknown}).branding;
  if (!raw || typeof raw !== "object") return null;
  const branding = raw as Record<string, unknown>;
  if (typeof branding.color !== "string" || !COLORS.has(branding.color)) {
    return null;
  }
  const cover = branding.coverImagePath;
  const credit = typeof branding.creditLine === "string" ?
    branding.creditLine.trim().slice(0, 120) : "";
  return {
    color: branding.color as ProgramBrandColor,
    coverImagePath: typeof cover === "string" && COVER_PATH.test(cover) ?
      cover : null,
    creditLine: credit === "" ? null : credit,
  };
}

/** `{branding}` to spread into a read's reply, or nothing when unset. */
export function programGuestBrandingField(
  program: Record<string, unknown> | {branding?: unknown},
): {branding?: ProgramGuestBranding} {
  const branding = programGuestBranding(program);
  return branding ? {branding} : {};
}
