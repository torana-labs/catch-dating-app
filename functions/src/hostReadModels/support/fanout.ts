import {isDeepStrictEqual} from "node:util";
import * as admin from "firebase-admin";

type Data = FirebaseFirestore.DocumentData | undefined;

export const fanoutPageSize = 100;
/** The callables' per-query cap for one guest's or attendee's rows. */
export const perGuestFanoutLimit = 200;

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
