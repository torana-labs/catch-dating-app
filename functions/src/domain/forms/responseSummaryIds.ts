import {createHash} from "node:crypto";

/** Stable unified identity without participant IDs or private evidence. */
export function responseSummaryId(
  kind: "response" | "application", id: string) {
  return "inbox_" + createHash("sha256")
    .update(`${kind}:${id}`).digest("hex");
}
