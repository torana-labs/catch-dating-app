import * as admin from "firebase-admin";
import type {Firestore} from "firebase-admin/firestore";
import {packagedIntake} from "../operations/supplyIntake/runtime";
import type {IntakePageSource} from "../operations/supplyIntake/runtime";
import {pageSourceFor} from "../operations/supplyIntake/worker";

/** What a Luma claim check saw on the listing's public calendar page. */
export interface LumaClaimPageReading {
  /** fetched, or why the page was not captured. */
  outcome: string;
  finalUrl: string | null;
  showsMarker: boolean;
}

/**
 * Reads a listing's public Luma calendar page for a claim marker. Luma shows
 * no contact email, so the organiser proves control by putting the marker in
 * the calendar description. Reading the page is on-demand page fetching, so
 * it follows that policy (CAT-266): while page fetching is off, the Luma
 * method stays hidden.
 */
export interface LumaClaimPageReader {
  enabled(): Promise<boolean>;
  read(input: {url: string; marker: string; runKey: string}):
    Promise<LumaClaimPageReading>;
}

/** The marker an organiser pastes: easy to find in page text. */
export function lumaClaimMarker(code: string): string {
  return `catch-${code}`;
}

let emulatorReader: FakeLumaClaimPageReader | null = null;

/**
 * Live reads in deployed Functions. The emulator never fetches: it reads
 * CATCH_LUMA_FAKE_PAGES, a JSON map of calendar URL to page text.
 */
export function defaultLumaClaimPageReader(): LumaClaimPageReader {
  if (process.env.FUNCTIONS_EMULATOR === "true") {
    emulatorReader ??= new FakeLumaClaimPageReader(
      stringMap(process.env.CATCH_LUMA_FAKE_PAGES));
    return emulatorReader;
  }
  return guardedLumaClaimPageReader({db: () => admin.firestore(),
    now: () => new Date()});
}

/** Live reads through the guarded page fetcher and its monthly allowance. */
export function guardedLumaClaimPageReader(deps: {
  db: () => Firestore;
  now: () => Date;
}): LumaClaimPageReader {
  return {
    async enabled() {
      const runtime = await packagedIntake();
      return (await runtime.loadSupplyAcquisitionPolicy()).pageFetch.enabled;
    },
    async read(input) {
      const runtime = await packagedIntake();
      const policy = await runtime.loadSupplyAcquisitionPolicy();
      const {source, settle} = await pageSourceFor(
        {db: deps.db(), now: deps.now}, policy);
      try {
        return await readLumaClaimMarker(source, input);
      } finally {
        await settle();
      }
    },
  };
}

/**
 * Emulator and test stand-in: pages are a fixed URL-to-text map, and a page
 * not in the map was not captured.
 */
export class FakeLumaClaimPageReader implements LumaClaimPageReader {
  readonly reads: string[] = [];

  constructor(readonly pages: Record<string, string> = {}) {}

  async enabled() {
    return true;
  }

  async read({url, marker}: {url: string; marker: string}) {
    this.reads.push(url);
    const page = this.pages[url];
    return {outcome: page === undefined ? "not_captured" : "fetched",
      finalUrl: page === undefined ? null : url,
      showsMarker: page !== undefined && containsMarker(page, marker)};
  }
}

export async function readLumaClaimMarker(
  source: IntakePageSource,
  {url, marker, runKey}: {url: string; marker: string; runKey: string}
): Promise<LumaClaimPageReading> {
  const {snapshot, receipt} = await source.capture({runKey, url});
  // Luma renders the calendar description into the page's embedded data, so
  // the whole snapshot is searched, not only its visible text. A redirect
  // off Luma is not the organiser's calendar.
  return {
    outcome: receipt.outcome,
    finalUrl: receipt.finalUrl,
    showsMarker: snapshot !== null && isLumaUrl(receipt.finalUrl) &&
      containsMarker(JSON.stringify(snapshot), marker),
  };
}

function isLumaUrl(value: string | null): boolean {
  try {
    const host = new URL(value ?? "").hostname.replace(/^www\./, "");
    return host === "luma.com" || host === "lu.ma";
  } catch {
    return false;
  }
}

function stringMap(value: string | undefined): Record<string, string> {
  try {
    const parsed: unknown = JSON.parse(value ?? "{}");
    return typeof parsed === "object" && parsed !== null ?
      Object.fromEntries(Object.entries(parsed).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string")) :
      {};
  } catch {
    return {};
  }
}

/** The marker as a whole token, so catch-482173 never matches catch-4821730. */
function containsMarker(text: string, marker: string): boolean {
  const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![a-z0-9-])${escaped}(?![0-9])`, "i").test(text);
}
