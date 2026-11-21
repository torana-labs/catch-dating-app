import type {DocumentData, QuerySnapshot} from "firebase/firestore";
import {getSignedInFirestore} from "./firebase";

/**
 * Signed-in pages read the same trigger-kept read models the Host and Guest
 * apps read, through Firestore listeners under the same rules (#2244): no
 * Function cold start, and the page updates while it is open. Each watch
 * calls back with every change until the returned stop runs; a rules denial
 * arrives as the Firestore error, code "permission-denied".
 */
export type StopWatching = () => void;

/** Most organizers an account reads, as the Host app's directory page. */
const ownedOrganizerLimit = 500;
/** Newest bills shown (one a month, years of billing). */
const billLimit = 120;

async function signedInFirestore() {
  const firestore = await getSignedInFirestore();
  if (!firestore) throw new Error("Account sign-in is not configured for this build.");
  return firestore;
}

/** One organizer the signed-in account owns, as its organizers/{id} row says. */
export interface OwnedOrganizerRow {
  organizerId: string;
  name: string;
  archived: boolean;
}

/**
 * Every organizer the account owns: ownerUserId, or the legacy hostUserId when
 * no owner is recorded, as listMyOwnedOrganizers and the Host app decide it.
 * The two queries are shapes the organizers rules prove.
 */
export async function watchOwnedOrganizers(uid: string, onValue: (rows: OwnedOrganizerRow[]) => void,
  onError: (error: Error) => void): Promise<StopWatching> {
  const firestore = await signedInFirestore();
  const {collection, limit, onSnapshot, query, where} = await import("firebase/firestore");
  const snapshots: Partial<Record<"ownerUserId" | "hostUserId", QuerySnapshot<DocumentData>>> = {};
  const emit = () => {
    if (!snapshots.ownerUserId || !snapshots.hostUserId) return;
    const rows = new Map<string, OwnedOrganizerRow>();
    for (const snapshot of [snapshots.ownerUserId, snapshots.hostUserId]) {
      for (const doc of snapshot.docs) {
        const data = doc.data();
        const owner = typeof data.ownerUserId === "string" && data.ownerUserId ? data.ownerUserId : data.hostUserId;
        if (owner !== uid || rows.has(doc.id)) continue;
        rows.set(doc.id, {organizerId: doc.id,
          name: typeof data.name === "string" && data.name ? data.name.slice(0, 160) : doc.id,
          archived: data.archived === true || data.status === "archived"});
      }
    }
    onValue([...rows.values()].sort((a, b) => a.organizerId.localeCompare(b.organizerId)));
  };
  const stops = (["ownerUserId", "hostUserId"] as const).map((field) => onSnapshot(
    query(collection(firestore, "organizers"), where(field, "==", uid), limit(ownedOrganizerLimit)),
    (snapshot) => {
      snapshots[field] = snapshot;
      emit();
    }, onError));
  return () => stops.forEach((stop) => stop());
}

/**
 * Catch's sent and closed bills to one organizer, newest first: each
 * hostOrganizerBillViews row carries the listOrganizerBills bill. Only the
 * organizer's owner may read them.
 */
// firestore-index: hostOrganizerBillViews(organizerId:ASCENDING, periodEndMillis:DESCENDING, month:DESCENDING)
export async function watchOrganizerBills(organizerId: string, onValue: (bills: unknown[]) => void,
  onError: (error: Error) => void): Promise<StopWatching> {
  const firestore = await signedInFirestore();
  const {collection, limit, onSnapshot, orderBy, query, where} = await import("firebase/firestore");
  return onSnapshot(query(collection(firestore, "hostOrganizerBillViews"), where("organizerId", "==", organizerId),
    orderBy("periodEndMillis", "desc"), orderBy("month", "desc"), limit(billLimit)),
  (snapshot) => onValue(snapshot.docs.map((doc) => (doc.data() as {bill?: unknown}).bill)), onError);
}

/** The manager-readable tracking settings of one organizer, or null before any are saved. */
export async function watchOrganizerTrackingSettings(organizerId: string, onValue: (settings: unknown) => void,
  onError: (error: Error) => void): Promise<StopWatching> {
  const firestore = await signedInFirestore();
  const {doc, onSnapshot} = await import("firebase/firestore");
  return onSnapshot(doc(firestore, "organizerTrackingSettings", organizerId),
    (snapshot) => onValue(snapshot.data() ?? null), onError);
}
