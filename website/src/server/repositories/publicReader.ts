/**
 * The read-only Firestore surface public repositories use. `firebase-admin`'s
 * Firestore satisfies it structurally; tests pass an in-memory reader.
 */
export interface PublicDocument {
  readonly id: string;
  data(): unknown;
}

export interface PublicDocumentSnapshot extends PublicDocument {
  readonly exists: boolean;
}

export interface PublicQuerySnapshot {
  readonly size: number;
  readonly docs: readonly PublicDocument[];
}

export interface PublicQuery {
  where(field: string, operator: "==" | "array-contains", value: unknown): PublicQuery;
  orderBy(field: string, direction: "asc" | "desc"): PublicQuery;
  limit(count: number): PublicQuery;
  get(): Promise<PublicQuerySnapshot>;
}

export interface PublicCollection extends PublicQuery {
  doc(id: string): {get(): Promise<PublicDocumentSnapshot>};
}

export interface PublicReader {
  collection(name: string): PublicCollection;
}

/** Reads at most `bound` documents and fails closed instead of truncating. */
export async function readBounded(query: PublicQuery, bound: number): Promise<readonly PublicDocument[]> {
  const snapshot = await query.limit(bound + 1).get();
  if (snapshot.size > bound) throw new Error("PUBLIC_CATALOG_READ_BOUND_EXCEEDED");
  return snapshot.docs;
}

export const PUBLIC_READ_DEADLINE_MS = 8_000;

export async function withinReadDeadline<T>(read: Promise<T>, milliseconds = PUBLIC_READ_DEADLINE_MS,
  code = "PUBLIC_READ_TIMEOUT"): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([read, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(code)), milliseconds);
    })]);
  } finally {clearTimeout(timer);}
}
