import {brand} from "@catch/brand";

export type SalesDemoSetupPlan = {mode: "manual"; requirements: string[]} |
  {mode: "template"; requirements: string[]; templateId: string;
    templateVersion: number; templateHash: string;
    materializerVersion: 1; title: string};
export interface SalesDemoSetup {
  schemaVersion: 1;
  setupHash: string;
  plan: SalesDemoSetupPlan;
  organizerId: string | null;
  formId: string | null;
  editorPath: string | null;
  publicationAuthority: false;
  status: "manual_setup" | "claim_required" | "ready" | "prepared";
}

export interface SalesDemoContinuation {
  continuationId: string;
  expiresAt: string;
  organizer: {organizerId: string; name: string; claimState: string};
  setup: SalesDemoSetup;
}
export interface SalesDemoContinuationApi {
  get(input: {continuationId: string}): Promise<SalesDemoContinuation>;
  prepare(input: {continuationId: string; setupHash: string}): Promise<SalesDemoContinuation>;
}
/** The Forms editor is a Flutter route on the consumer/Host origin. */
export function salesDemoFormEditorUrl(editorPath: string | null): string | null {
  if (!editorPath || !/^\/host\/audience\/forms\/[A-Za-z0-9_-]+$/u
    .test(editorPath)) return null;
  const configured = import.meta.env.VITE_CONSUMER_APP_URL;
  const origin = configured || (import.meta.env.VITE_FIREBASE_PROJECT_ID ===
    "catch-dating-app-64e51" ? brand.web.appOrigin : null);
  if (!origin) return null;
  try {
    const url = new URL(origin);
    const local = url.protocol === "http:" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if ((url.protocol !== "https:" && !local) || url.username || url.password ||
        url.pathname !== "/" || url.search || url.hash) return null;
    url.hash = editorPath;
    return url.toString();
  } catch {return null;}
}
