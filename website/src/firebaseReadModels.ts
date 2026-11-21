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

/** The organizer fields that decide whether its tracking settings may be edited. */
interface TrackingEligibilityFields {
  archived?: unknown; status?: unknown; ownerUserId?: unknown;
  claim?: {state?: unknown} | null; ownership?: {state?: unknown} | null;
}

/**
 * Whether the organizer's Pixel and GA4 IDs may be saved: a live page with an
 * owner, created by them or with a verified claim. Mirrors the Functions
 * trackingConfigurationEligible and the Host app's organizerTrackingEditable.
 */
export function trackingSettingsEditable(organizer: TrackingEligibilityFields | null): boolean {
  if (!organizer) return false;
  return organizer.archived !== true && organizer.status !== "archived" &&
    organizer.claim?.state !== "suppressed" && typeof organizer.ownerUserId === "string" &&
    organizer.ownerUserId !== "" &&
    (organizer.ownership?.state === "userCreated" || organizer.claim?.state === "verified");
}

/** Tracking settings in the getOrganizerTrackingSettings shape. */
export interface TrackingSettingsRow {
  organizerId: string;
  revision: number;
  metaPixelId: string | null;
  googleMeasurementId: string | null;
  canEdit: boolean;
  /** The code-owned publication policy publishes no saved ID yet. */
  enabled: false;
  publicationAllowed: false;
}

/**
 * One organizer's tracking settings, as its current managers read them: the
 * organizerTrackingSettings document (absent before the first save) and,
 * from the organizers row, whether they may be edited.
 */
export async function watchOrganizerTrackingSettings(organizerId: string,
  onValue: (settings: TrackingSettingsRow) => void, onError: (error: Error) => void): Promise<StopWatching> {
  const firestore = await signedInFirestore();
  const {doc, onSnapshot} = await import("firebase/firestore");
  let settings: Record<string, unknown> | null | undefined;
  let canEdit: boolean | undefined;
  const emit = () => {
    if (settings === undefined || canEdit === undefined) return;
    const text = (value: unknown) => typeof value === "string" && value ? value : null;
    onValue({organizerId, revision: typeof settings?.revision === "number" ? settings.revision : 0,
      metaPixelId: text(settings?.metaPixelId), googleMeasurementId: text(settings?.googleMeasurementId),
      canEdit, enabled: false, publicationAllowed: false});
  };
  const stops = [
    onSnapshot(doc(firestore, "organizerTrackingSettings", organizerId), (snapshot) => {
      settings = snapshot.data() ?? null;
      emit();
    }, onError),
    onSnapshot(doc(firestore, "organizers", organizerId), (snapshot) => {
      canEdit = trackingSettingsEditable((snapshot.data() ?? null) as TrackingEligibilityFields | null);
      emit();
    }, onError),
  ];
  return () => stops.forEach((stop) => stop());
}
