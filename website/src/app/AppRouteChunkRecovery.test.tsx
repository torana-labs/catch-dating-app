import {CatchField} from "@catch/web-ui";
import {act, cleanup, fireEvent, render, screen, waitFor} from "@testing-library/react";
import {useState, type ReactNode} from "react";
import {useParams} from "react-router";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {Button} from "../shared/ui/primitives";

const faults = vi.hoisted(() => ({
  legal: false, form: false, persistent: false, hostname: "localhost",
  legalRecovery: vi.fn(), formRecovery: vi.fn(), submit: vi.fn(),
}));

function Legal({page}: {page: {title: string}}) { return <h1>{page.title}</h1>; }
function Form() {
  const {publicFormId} = useParams();
  const [answer, setAnswer] = useState("");
  return <><h1>Form {publicFormId}</h1>
    <CatchField
      recipe="input"
      id="form-answer"
      title="Your answer"
      value={answer}
      onChanged={(value) => setAnswer(value)}
    />
    <Button onClick={() => faults.submit(answer)}>Submit answer</Button></>;
}

vi.mock("./usePageLifecycle", () => ({
  useDocumentMeta: vi.fn(), useHashScroll: vi.fn(), useMarketingAnalytics: vi.fn(),
  useRevealAnimations: vi.fn(),
}));
vi.mock("./PublicEventListingsProvider", () => ({
  PublicEventListingsProvider: ({children}: {children: ReactNode}) => children,
}));
vi.mock("../features/organizers/usePublicEventListingsController", () => ({
  usePublicHostListings: () => ({listings: [], phase: "ready"}),
}));
vi.mock("../features/marketing/MarketingConsentBanner", () => ({
  MarketingConsentBanner: () => null,
}));
vi.mock("./CustomFormDomainGate", async importOriginal => {
  const actual = await importOriginal<typeof import("./CustomFormDomainGate")>();
  return {...actual,
    isCatchWebsiteHost: () => actual.isCatchWebsiteHost(faults.hostname),
    CustomFormDomainGate: ({children}: {children: ReactNode}) =>
      <actual.CustomFormDomainGate hostname={faults.hostname}>{children}</actual.CustomFormDomainGate>,
  };
});
vi.mock("../features/legal/LegalPage", () => ({
  get LegalPage() {
    if (faults.legal) throw new Error("Synthetic primary legal chunk failure");
    return Legal;
  },
}));
vi.mock("../features/legal/LegalPage?route-recovery", () => ({
  get LegalPage() {
    faults.legalRecovery();
    if (faults.persistent) throw new Error("Synthetic persistent legal chunk failure");
    return Legal;
  },
}));
vi.mock("../features/forms/PublicFormPage", () => ({
  get PublicFormPage() {
    if (faults.form) throw new Error("Synthetic primary interactive chunk failure");
    return Form;
  },
}));
vi.mock("../features/forms/PublicFormPage?route-recovery", () => ({
  get PublicFormPage() { faults.formRecovery(); return Form; },
}));
vi.mock("../features/home/HomePage", () => ({
  HomePage: () => <h1>Catch home</h1>, VisitorDiscoveryPage: () => <h1>Explore Catch</h1>,
}));

beforeEach(() => {
  vi.resetModules();
  Object.assign(faults, {legal: false, form: false, persistent: false, hostname: "localhost"});
  faults.legalRecovery.mockReset(); faults.formRecovery.mockReset();
  faults.submit.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ok: false}));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

async function open(path: string) {
  window.history.replaceState({}, "", path);
  const {default: App} = await import("./App");
  render(<App />);
}
async function history(direction: "back" | "forward") {
  await act(async () => { window.history[direction](); });
}

describe("App route chunk recovery", () => {
  it("recovers a failed legal loader, navigates safely, and supports Back/Forward", async () => {
    faults.legal = true;
    await open("/privacy/");
    fireEvent.click(await screen.findByRole("button", {name: "Try again"}));
    await screen.findByRole("heading", {name: "Privacy policy"});
    expect(faults.legalRecovery).toHaveBeenCalledTimes(1);
    // A client navigation exercises the same recovered module on another route.
    await act(async () => {
      window.history.pushState({}, "", "/terms/");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    await screen.findByRole("heading", {name: "Terms of use"});
    await history("back");
    await screen.findByRole("heading", {name: "Privacy policy"});
    await history("forward");
    await screen.findByRole("heading", {name: "Terms of use"});
    expect(faults.legalRecovery).toHaveBeenCalledTimes(1);
  });

  it("recovers an interactive loader without submission, then retains edits through a URL update", async () => {
    faults.form = true;
    await open("/f/public-a?embed=1");
    fireEvent.click(await screen.findByRole("button", {name: "Try again"}));
    fireEvent.change(await screen.findByLabelText("Your answer"), {target: {value: "Retained answer"}});
    await act(async () => {
      window.history.pushState({}, "", "/f/public-a?embed=1&step=2");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect((screen.getByLabelText("Your answer") as HTMLInputElement).value).toBe("Retained answer");
    expect(faults.submit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", {name: "Submit answer"}));
    expect(faults.submit).toHaveBeenCalledExactlyOnceWith("Retained answer");
    expect(faults.formRecovery).toHaveBeenCalledTimes(1);
  });

  it("keeps a persistent failure bounded and can return to the healthy home route", async () => {
    faults.legal = true; faults.persistent = true;
    await open("/privacy/");
    fireEvent.click(await screen.findByRole("button", {name: "Try again"}));
    await screen.findByText("This page is still unavailable. Please try again later.");
    expect(screen.queryByRole("button", {name: "Try again"})).toBeNull();
    fireEvent.click(screen.getByRole("button", {name: "Return to Catch"}));
    await screen.findByRole("heading", {name: "Catch home"});
    await history("back");
    await screen.findByRole("alert");
    expect(screen.queryByRole("button", {name: "Try again"})).toBeNull();
    expect(faults.legalRecovery).toHaveBeenCalledTimes(1);
  });

  it("recovers only the active custom host's bound form and exposes no marketing escape", async () => {
    faults.form = true; faults.hostname = "apply.client.example";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ok: true,
      json: async () => ({hostname: faults.hostname, publicFormId: "public-a"})}));
    await open("/f/another-form");
    const retry = await screen.findByRole("button", {name: "Try again"});
    expect(window.location.pathname).toBe("/f/public-a");
    expect(screen.queryByRole("button", {name: "Return to Catch"})).toBeNull();
    fireEvent.click(retry);
    await screen.findByRole("heading", {name: "Form public-a"});
    await act(async () => {
      window.history.pushState({}, "", "/privacy/");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    await waitFor(() => expect(window.location.pathname).toBe("/f/public-a"));
    expect(screen.queryByRole("heading", {name: "Privacy policy"})).toBeNull();
    expect(faults.legalRecovery).not.toHaveBeenCalled();
  });

  it.each(["unknown", "revoked"])("fails closed on an %s custom host", async () => {
    faults.hostname = "apply.client.example"; faults.form = true;
    await open("/f/another-form");
    await screen.findByRole("heading", {name: "This form is unavailable"});
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByRole("button", {name: "Return to Catch"})).toBeNull();
    expect(faults.formRecovery).not.toHaveBeenCalled();
    expect(faults.submit).not.toHaveBeenCalled();
  });

  it("renders a normal legal route without loading its recovery entry", async () => {
    await open("/help/");
    await screen.findByRole("heading", {name: "Help and safety"});
    expect(faults.legalRecovery).not.toHaveBeenCalled();
  });
});
