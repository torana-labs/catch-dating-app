// Counts the header layouts no converter recognised, so the next converter
// is chosen from data (owner decision, 18 Nov 2026). Only a hash of the
// sorted, normalised headers and the column count are kept: no header text
// and no cell values.

import {createHash} from "node:crypto";
import {normalizeHeader} from "./table";

export const GUEST_IMPORT_HEADER_SHAPES = "guestImportHeaderShapes";

/** The same layout in any column order gives the same hash. */
export function headerShapeHash(headers: string[]): string {
  const normalized = headers.map(normalizeHeader)
    .filter((header) => header.length > 0).sort();
  return createHash("sha256")
    .update(`guest-import-header-shape\u0000${normalized.join("\u0000")}`)
    .digest("hex");
}

/** guestImportHeaderShapes/{shapeHash}, as its contract stores it. */
export interface StoredGuestImportHeaderShape {
  schemaVersion: 1;
  shapeHash: string;
  columnCount: number;
  count: number;
  firstSeenAt: string;
  lastSeenAt: string;
}

/**
 * Adds one sighting of an unrecognised layout. Best effort: a failure here
 * never fails the import.
 */
export async function countUnrecognisedHeaderShape(
  db: FirebaseFirestore.Firestore, headers: string[], now: Date,
  increment: (by: number) => FirebaseFirestore.FieldValue
): Promise<string> {
  const shapeHash = headerShapeHash(headers);
  const ref = db.collection(GUEST_IMPORT_HEADER_SHAPES).doc(shapeHash);
  const at = now.toISOString();
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists) {
      tx.update(ref, {count: increment(1), lastSeenAt: at});
      return;
    }
    const created: StoredGuestImportHeaderShape = {schemaVersion: 1,
      shapeHash, columnCount: Math.min(headers.length, 40), count: 1,
      firstSeenAt: at, lastSeenAt: at};
    tx.create(ref, created);
  });
  return shapeHash;
}
