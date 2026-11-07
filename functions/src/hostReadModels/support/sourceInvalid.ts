import {HttpsError} from "firebase-functions/v2/https";
import {invalidWork} from "../../eventSuccess/operations/liveWorkRecords";

/** A source document that failed validation, named by its collection. */
export class SourceInvalidError extends Error {
  constructor(readonly source: string, readonly detail: string) {
    super(`${source}: ${detail}`);
    this.name = "SourceInvalidError";
  }
}

/**
 * The HttpsError codes the assistance readers and projections throw for a
 * document that does not hold what its contract says: failed-precondition
 * (invalidSource(), an unconfigured group, malformed organizer event
 * defaults), not-found (a guest source that is unavailable) and
 * invalid-argument (organizer event defaults whose preferences or timezone
 * fail validation). permission-denied is an authority answer, not a bad
 * document, and propagates like every other code.
 */
const sourceInvalidCodes: ReadonlySet<string> =
  new Set(["failed-precondition", "not-found", "invalid-argument"]);

/** The plain error guestRecords raises for a malformed assistance id. */
const invalidAssistanceIdMessage = "Invalid assistance document id";

/**
 * True for the validation failures the assistance parsers raise for a
 * document that does not hold what its contract says. Anything else is a
 * transport or programming failure and must propagate, so the trigger
 * retries it.
 */
export function isSourceInvalid(error: unknown): boolean {
  if (error instanceof HttpsError) return sourceInvalidCodes.has(error.code);
  return error instanceof Error &&
    (error.message === invalidWork().message ||
      error.message === invalidAssistanceIdMessage);
}

function sourceInvalid(source: string, error: unknown): unknown {
  if (error instanceof SourceInvalidError || !isSourceInvalid(error)) {
    return error;
  }
  return new SourceInvalidError(source, (error as Error).message);
}

/** Runs one evaluation stage, naming its collection when a source is bad. */
export function stage<T>(source: string, body: () => T): T {
  try {
    return body();
  } catch (error) {
    throw sourceInvalid(source, error);
  }
}

/** The asynchronous form of stage, for readers that read in a transaction. */
export async function parsing<T>(source: string,
  read: () => T | Promise<T>): Promise<T> {
  try {
    return await read();
  } catch (error) {
    throw sourceInvalid(source, error);
  }
}
