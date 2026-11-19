import type {GuestListConverter} from "../canonical";
import {joinFirstAndLastName} from "./eventbrite";
import {formNameAliases, formQuestionWords, indianPhoneAliases} from
  "./formQuestions";
import type {GuestTable} from "../table";

/**
 * Typeform responses, downloaded as CSV. The first column "#" is the
 * response id; the form's questions follow, then "Start Date (UTC)",
 * "Submit Date (UTC)" and "Network ID" (newer exports add "Response Type"
 * and "Stage Date (UTC)"). A contact-info block gives "First name" and
 * "Last name", which are joined into one name.
 */
export const typeformConverter: GuestListConverter = {
  id: "typeform-v1",
  provider: null,
  signature: ["startdateutc", "submitdateutc", "networkid"],
  aliases: {displayName: formNameAliases, phone: indianPhoneAliases},
  externalReferenceAliases: new Set(["responseid"]),
  normalizeTable: (table) => joinFirstAndLastName(nameResponseId(table)),
  questionWords: formQuestionWords,
};

/** Names Typeform's "#" column, which has no letters to match on. */
function nameResponseId(table: GuestTable): GuestTable {
  const index = table.headers.findIndex((header) => header.trim() === "#");
  if (index < 0) return table;
  const headers = [...table.headers];
  headers[index] = "Response ID";
  return {headers, rows: table.rows};
}
