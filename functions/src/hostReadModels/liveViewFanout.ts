import {isDeepStrictEqual} from "node:util";
import * as admin from "firebase-admin";
import {HttpsError} from "firebase-functions/v2/https";
import {invalidWork} from "../eventSuccess/operations/liveWorkRecords";

type Data = FirebaseFirestore.DocumentData | undefined;

/** Document ids the event assistance stores accept. */
export const assistanceIdPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;
export const fanoutPageSize = 100;
/** The callables' per-query cap for one guest's or attendee's rows. */
export const perGuestFanoutLimit = 200;

export function isAssistanceId(value: unknown): value is string {
  return typeof value === "string" && assistanceIdPattern.test(value);
}

export function distinctIds(values: unknown[]): string[] {
  return [...new Set(values.filter(isAssistanceId))];
}

export function valueAt(data: Data, path: string): unknown {
  return path.split(".").reduce<unknown>((value, key) =>
    (value as Record<string, unknown> | undefined)?.[key], data);
}

/** True when an update leaves every listed field as it was. */
export function sameFields(before: Data, after: Data,
  fields: readonly string[]): boolean {
  return before !== undefined && after !== undefined &&
    fields.every((field) => isDeepStrictEqual(valueAt(before, field),
      valueAt(after, field)));
}

/** Every document id a query matches, in pages ordered by document id. */
export async function* pagedIds(
  query: FirebaseFirestore.Query,
  pageSize = fanoutPageSize
): AsyncGenerator<string> {
  let cursor: string | undefined;
  do {
    let page = query.orderBy(admin.firestore.FieldPath.documentId())
      .limit(pageSize);
    if (cursor !== undefined) page = page.startAfter(cursor);
    const snapshot = await page.get();
    for (const doc of snapshot.docs) yield doc.id;
    cursor = snapshot.docs.length === pageSize ?
      snapshot.docs.at(-1)!.id : undefined;
  } while (cursor !== undefined);
}

/**
 * The validation failures the assistance parsers raise for a document that
 * does not hold what its contract says. Anything else is unexpected and
 * propagates, so a trigger retries it.
 */
export function isSourceInvalid(error: unknown): boolean {
  return error instanceof HttpsError ||
    (error instanceof Error && error.message === invalidWork().message);
}

export class ViewSourceInvalidError extends Error {
  constructor(readonly source: string, readonly detail: string) {
    super(`${source}: ${detail}`);
  }
}

/** Runs one evaluation stage, naming its collection when a source is bad. */
export function stage<T>(source: string, body: () => T): T {
  try {
    return body();
  } catch (error) {
    if (error instanceof ViewSourceInvalidError || !isSourceInvalid(error)) {
      throw error;
    }
    throw new ViewSourceInvalidError(source,
      error instanceof Error ? error.message : String(error));
  }
}

export function positiveInteger(value: unknown): number | null {
  return Number.isSafeInteger(value) && (value as number) > 0 ?
    value as number : null;
}
