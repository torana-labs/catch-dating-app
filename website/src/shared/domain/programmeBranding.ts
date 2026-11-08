import type {CatchFormat} from "@catch/web-ui";

/** The planner's look for a programme's guest pages, as the programme reads return it (optional). */
export interface ProgrammeBranding {
  color: "rani" | "marigold" | "mehendi" | "rose" | "haldi";
  coverImagePath: string | null;
  creditLine: string | null;
}

/** The format colour each brand colour paints in, as the app's Branding preview does. */
const brandFormats = {
  rani: "nightsOut",
  marigold: "dinner",
  mehendi: "courts",
  rose: "games",
  haldi: "run",
} as const satisfies Record<ProgrammeBranding["color"], CatchFormat>;

/** The format a programme page paints in: the planner's colour, else rani (nights out). */
export function programmeFormat(branding: ProgrammeBranding | null | undefined): CatchFormat {
  return branding ? brandFormats[branding.color] ?? "nightsOut" : "nightsOut";
}

/** The planner's credit for the made-with line, or null when they set none. */
export function programmeCredit(branding: ProgrammeBranding | null | undefined): string | null {
  return branding?.creditLine?.trim() || null;
}
