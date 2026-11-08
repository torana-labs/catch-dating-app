import {programmeLinkCopy} from "../../content/programmes";
import {programmeCredit, type ProgrammeBranding} from "../../shared/domain/programmeBranding";

export {programmeFormat, type ProgrammeBranding} from "../../shared/domain/programmeBranding";

/** The made-with line, with the planner's credit when they set one. */
export function programmeMadeWith(branding: ProgrammeBranding | null | undefined): string {
  const credit = programmeCredit(branding);
  return credit ? programmeLinkCopy.madeWithCredit(credit) : programmeLinkCopy.madeWith;
}
