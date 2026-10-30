import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {runInNewContext} from "node:vm";
import {afterEach, describe, expect, it, vi} from "vitest";
import {catchLiveDestinations, catchMeasurementMode, configuredCatchTransport, createCatchLiveGoogleSession} from "../../analytics/catchLiveTransport";
import {brand} from "@catch/brand";

const channel = "00000000-0000-4000-8000-000000000000";
const now = 1792572000000;
const lead = {name: "lead_accepted", consent: {analytics: true, marketing: true},
  parameters: {page_path: "/host/apply/", audience: "organizer", form: "host_application",
    event_id: `host_lead_${now}_${channel}`},
  attribution: {clientId: "12345.1792485600", sessionId: 1792572000}} as const;
const source = readFileSync(resolve(process.cwd(), "measurement-runtime/catch-acquisition-runtime.js"), "utf8");
function fixture(origin: string = catchLiveDestinations.runtimeOrigin) {
  const listeners = new Map<string, (value: any) => void>();
  const parent = {postMessage: vi.fn()};
  const appended: any[] = [];
  const cookies = new Map([["catch_host_ga", "old"], ["catch_host_ga_HZFG0DL2DK", "old"], ["unrelated", "keep"]]);
  const runtime: Record<string, any> = {location: {origin},
    addEventListener: (name: string, listener: (value: any) => void) => listeners.set(name, listener)};
  const document = {createElement: (tag: string) => ({tag}), head: {appendChild: (node: any) => appended.push(node)},
    get cookie() { return [...cookies].map(([key, value]) => `${key}=${value}`).join("; "); },
    set cookie(value: string) { const key = value.split("=")[0]; if (value.includes("Max-Age=0")) cookies.delete(key); }};
  class Clock extends Date { static now() { return now; } }
  runInNewContext(source, {window: runtime, parent, document, Date: Clock});
  const dispatch = (data: unknown, messageOrigin: string = catchLiveDestinations.previewOrigin, sender = parent) =>
    listeners.get("message")?.({data, origin: messageOrigin, source: sender});
  const init = () => dispatch({type: "catch:acquisition-init", channel,
    measurementId: catchLiveDestinations.googleMeasurementId});
  const send = (event: unknown = lead) => dispatch({type: "catch:acquisition-event", channel, event});
  const rows = () => (runtime.dataLayer ?? []).map((row: ArrayLike<unknown>) => Array.from(row));
  return {runtime, parent, appended, cookies, dispatch, init, send, rows};
}
afterEach(() => { vi.useRealTimers(); document.querySelectorAll("iframe").forEach(frame => frame.remove()); });

describe("Catch isolated Google preview transport", () => {
  it("keeps production and Meta disabled and requires a fresh preview mode", () => {
    const create = vi.spyOn(document, "createElement");
    expect(catchLiveDestinations.enabled).toBe(false);
    expect(catchMeasurementMode(brand.web.origin)).toBe("disabled");
    expect(catchMeasurementMode(catchLiveDestinations.previewOrigin)).toBe("google-preview-v2");
    expect(catchMeasurementMode("https://unreviewed-preview.example")).toBe("disabled");
    for (const provider of ["google", "meta"] as const) configuredCatchTransport(provider).send(lead);
    expect(create).not.toHaveBeenCalled();
  });
  it("cancels an unloaded session without replaying queued events", () => {
    let onload: (() => void) | undefined;
    const postMessage = vi.fn();
    const frame = {contentWindow: {postMessage}, remove: vi.fn(), removeEventListener: vi.fn(),
      addEventListener: vi.fn((_name, handler) => {onload = handler;})};
    const session = createCatchLiveGoogleSession({create: () => frame as never, mount: vi.fn(), channel: () => channel});
    session.send(lead); session.destroy(); onload!(); session.send(lead);
    expect(postMessage).not.toHaveBeenCalled();
    expect(frame.remove).toHaveBeenCalledOnce();
  });
  it("uses a distinct origin and waits for authenticated shutdown before removal", () => {
    vi.useFakeTimers();
    const session = createCatchLiveGoogleSession();
    const frame = document.querySelector("iframe")!;
    expect(frame.getAttribute("sandbox")).toBe("allow-scripts allow-same-origin");
    expect(frame.referrerPolicy).toBe("no-referrer");
    expect(frame.src).toBe(`${catchLiveDestinations.runtimeOrigin}/catch-acquisition-runtime.html`);
    frame.dispatchEvent(new Event("load"));
    session.destroy();
    const ack = {type: "catch:acquisition-stopped", channel: "wrong"};
    window.dispatchEvent(new MessageEvent("message", {source: frame.contentWindow, origin: catchLiveDestinations.runtimeOrigin, data: ack}));
    expect(frame.isConnected).toBe(true);
    vi.advanceTimersByTime(1000);
    expect(frame.isConnected).toBe(false);
  });
  it("rejects a copied runtime, untrusted parent, production parent and wrong channel", () => {
    const copied = fixture(brand.web.origin); copied.init(); copied.send(); expect(copied.appended).toEqual([]);
    const f = fixture();
    const init = {type: "catch:acquisition-init", channel, measurementId: catchLiveDestinations.googleMeasurementId};
    f.dispatch(init, brand.web.origin);
    f.dispatch(init, catchLiveDestinations.previewOrigin, {postMessage: vi.fn()});
    f.send(); expect(f.appended).toEqual([]);
    f.init(); f.dispatch({type: "catch:acquisition-event", channel: "wrong", event: lead});
    expect(f.appended).toEqual([]);
  });
  it("requires current analytics identity and keeps cookies within its original expiry", () => {
    const f = fixture(); f.init();
    expect(f.appended).toEqual([]);
    f.send({...lead, attribution: undefined});
    f.send({...lead, consent: {analytics: false, marketing: false}});
    f.send({...lead, attribution: {clientId: "12345.1789979999", sessionId: 1792572000}});
    f.send({...lead, attribution: {clientId: "12345.1792572001", sessionId: 1792572000}});
    expect(f.appended).toEqual([]);
    f.send();
    expect(f.appended).toHaveLength(1);
    expect(f.rows().find((r: unknown[]) => r[0] === "config")[2]).toMatchObject({
      cookie_domain: "none", cookie_prefix: "catch_host", cookie_flags: "SameSite=None;Secure",
      cookie_expires: 29 * 24 * 60 * 60, cookie_update: false, send_page_view: false,
      allow_google_signals: false, allow_ad_personalization_signals: false});
  });
  it("projects only reviewed fields, deduplicates leads and never sends Ads or click IDs", () => {
    const f = fixture(); f.init();
    f.send({...lead, parameters: {...lead.parameters, email: "private@example.test", utm_source: "google"},
      attribution: {...lead.attribution, gclid: "NotForPreview12345", fbclid: "NotForPreview67890"}});
    f.send();
    const rows = f.rows();
    expect(rows.filter((r: unknown[]) => r[0] === "event")).toHaveLength(1);
    expect(rows.find((r: unknown[]) => r[0] === "event")[2]).toMatchObject({debug_mode: true,
      traffic_type: "internal", campaign_source: "google", page_location: `${brand.web.origin}/host/apply/`});
    expect(JSON.stringify(rows)).not.toMatch(/private@example|NotForPreview|AW-/u);
    expect(rows.filter((r: unknown[]) => r[0] === "consent").every((r: any[]) => r[2].ad_user_data === "denied")).toBe(true);
    f.send({...lead, name: "page_view", parameters: {...lead.parameters, page_path: "/booking/private/"}});
    expect(f.rows()).toHaveLength(rows.length);
  });
  it("blocks further network, clears owned cookies and acknowledges withdrawal", () => {
    const f = fixture(); f.init(); f.send();
    f.cookies.set("catch_host_ga", "new");
    f.cookies.set("catch_host_ga_HZFG0DL2DK", "new");
    f.dispatch({type: "catch:acquisition-stop", channel});
    expect(f.runtime["ga-disable-G-HZFG0DL2DK"]).toBe(true);
    expect(f.cookies).toEqual(new Map([["unrelated", "keep"]]));
    expect(f.appended.at(-1)).toMatchObject({httpEquiv: "Content-Security-Policy",
      content: "default-src 'none'; connect-src 'none'; img-src 'none'; script-src 'none'"});
    expect(f.parent.postMessage).toHaveBeenCalledWith({type: "catch:acquisition-stopped", channel}, catchLiveDestinations.previewOrigin);
    const rows = f.rows(); f.send({...lead, name: "page_view"}); expect(f.rows()).toEqual(rows);
  });
});
