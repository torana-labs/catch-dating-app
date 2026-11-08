import type {CatchFormat} from "@catch/web-ui";
import {programmeLinkCopy} from "../../content/programmes";

/** The planner's look for the programme's links, as the reads return it (optional). */
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

/** The format a programme link paints in: the planner's colour, else rani (nights out). */
export function programmeFormat(branding: ProgrammeBranding | null | undefined): CatchFormat {
  return branding ? brandFormats[branding.color] ?? "nightsOut" : "nightsOut";
}

/** The made-with line: "Made with Catch", with the planner's credit when they set one. */
export function programmeMadeWith(branding: ProgrammeBranding | null | undefined): string {
  const credit = branding?.creditLine?.trim();
  return credit ? programmeLinkCopy.madeWithCredit(credit) : programmeLinkCopy.madeWith;
}
