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
 * no owner is recorded, as the billing callables and the Host app decide it.
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

/**
 * One organizer's billing status for its owner: the hostOrganizerBillingViews
 * row (#2306), the trial's facts and the plan, no prices. Only the owner may
 * read it; an organizer with no row yet reads as null.
 */
export async function watchOrganizerBillingView(organizerId: string,
  onValue: (view: {trial: unknown; plan: unknown} | null) => void,
  onError: (error: Error) => void): Promise<StopWatching> {
  const firestore = await signedInFirestore();
  const {doc, onSnapshot} = await import("firebase/firestore");
  return onSnapshot(doc(firestore, "hostOrganizerBillingViews", organizerId), (snapshot) => {
    const data = snapshot.data();
    onValue(data && data.organizerId === organizerId ? {trial: data.trial, plan: data.plan} : null);
  }, onError);
}

/**
 * One organizer's website owner page facts: the hostOrganizerOwnerViews row
 * (#2306). Its owner and managers may read it; a missing row reads as null.
 */
export async function watchOrganizerOwnerView(organizerId: string, onValue: (row: unknown) => void,
  onError: (error: Error) => void): Promise<StopWatching> {
  const firestore = await signedInFirestore();
  const {doc, onSnapshot} = await import("firebase/firestore");
  return onSnapshot(doc(firestore, "hostOrganizerOwnerViews", organizerId),
    (snapshot) => onValue(snapshot.data() ?? null), onError);
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

/** One document a listener delivered: its id and raw data, for the feature to parse. */
export interface ReadModelRow {
  id: string;
  data: Record<string, unknown>;
}

/** Most rows of each kind the account page reads. */
const accountRowLimit = 200;

/**
 * The signed-in guest's own rows behind the account page, each live until
 * the returned stop runs: their guestEventStatuses (each with the event card
 * their lists show), active organizerFollows, and reviews. Rules let a guest
 * read only their own rows, and every query filters by the UID, so the
 * rules can prove it. The callback runs once all three have arrived.
 */
export async function watchOwnAccountRows(uid: string,
  onValue: (rows: {plans: ReadModelRow[]; follows: ReadModelRow[]; reviews: ReadModelRow[]}) => void,
  onError: (error: Error) => void): Promise<StopWatching> {
  const firestore = await signedInFirestore();
  const {collection, limit, onSnapshot, query, where} = await import("firebase/firestore");
  const rows: Partial<Record<"plans" | "follows" | "reviews", ReadModelRow[]>> = {};
  const emit = () => {
    if (rows.plans && rows.follows && rows.reviews) {
      onValue({plans: rows.plans, follows: rows.follows, reviews: rows.reviews});
    }
  };
  const listen = (key: "plans" | "follows" | "reviews", source: ReturnType<typeof query>) =>
    onSnapshot(source, (snapshot) => {
      rows[key] = snapshot.docs.map((doc) => ({id: doc.id, data: doc.data() as Record<string, unknown>}));
      emit();
    }, onError);
  const stops = [
    listen("plans", query(collection(firestore, "guestEventStatuses"), where("uid", "==", uid),
      limit(accountRowLimit))),
    listen("follows", query(collection(firestore, "organizerFollows"), where("uid", "==", uid),
      where("status", "==", "active"), limit(accountRowLimit))),
    listen("reviews", query(collection(firestore, "reviews"), where("reviewerUserId", "==", uid),
      limit(accountRowLimit))),
  ];
  return () => stops.forEach((stop) => stop());
}

/**
 * The organizers' public copies (publicOrganizers) by id, for names and page
 * links on the account page. Anyone may get one; an organizer without a copy
 * is left out.
 */
export async function readPublicOrganizers(ids: readonly string[]): Promise<Map<string, Record<string, unknown>>> {
  const firestore = await signedInFirestore();
  const {doc, getDoc} = await import("firebase/firestore");
  const snapshots = await Promise.all([...new Set(ids)].map((id) =>
    getDoc(doc(firestore, "publicOrganizers", id)).catch(() => null)));
  return new Map(snapshots.flatMap((snapshot) =>
    snapshot?.exists() ? [[snapshot.id, snapshot.data() as Record<string, unknown>]] : []));
}
