import {cleanup, render, screen} from "@testing-library/react";
import {afterEach, beforeEach, expect, it, vi} from "vitest";
import {SalesRouteScreen} from "./SalesRouteScreen";

const mocks = vi.hoisted(() => ({hostName: vi.fn(), privacy: vi.fn(() => null), demo: vi.fn(() => null), fit: vi.fn(() => null)}));
vi.mock("../controllers/useSalesDealsController", () => ({useSalesHostName: mocks.hostName, useSalesHostNames: vi.fn(), useSalesDealsController: vi.fn()}));
vi.mock("./SalesPrivacyWorkspace", () => ({renderSalesPrivacyWorkspace: mocks.privacy}));
vi.mock("./SalesDemoPanel", () => ({SalesDemoWorkspace: mocks.demo}));
vi.mock("./SalesIntelligenceWorkspace", () => ({SalesIntelligenceWorkspace: mocks.fit}));

afterEach(cleanup);
beforeEach(() => { vi.clearAllMocks(); mocks.hostName.mockReturnValue({name: "Harbor", isLoading: false}); });

const noop = vi.fn();
const draw = (hostPage: "fit" | "privacy" | "demo", isAdminOwner = true, ownWorkOnly = false) => render(<SalesRouteScreen area="hosts" hostPage={hostPage} isAdminOwner={isAdminOwner} ownWorkOnly={ownWorkOnly}
  uid="owner" selectedId="harbor" onSelect={noop} onOpenHost={noop} onOpenHostTools={noop} onOpenHostPage={noop} onOpenOrganizer={noop} onAddHost={noop} onError={noop} onNotice={noop} />);

it("gives privacy the host's name, because the owner has to type it to confirm", () => {
  draw("privacy");
  expect(mocks.privacy).toHaveBeenCalledWith(expect.objectContaining({organizerId: "harbor", organizerName: "Harbor"}));
});

it("doesn't draw privacy until the name is known", () => {
  mocks.hostName.mockReturnValue({name: null, isLoading: true});
  draw("privacy");
  expect(mocks.privacy).not.toHaveBeenCalled();
});

it("opens privacy without a name for a restricted host, which can't be read", () => {
  mocks.hostName.mockReturnValue({name: null, isLoading: false});
  draw("privacy");
  expect(mocks.privacy).toHaveBeenCalledWith(expect.not.objectContaining({organizerName: expect.anything()}));
});

it("opens the demo for the owner, and neither page for anyone else", () => {
  draw("demo");
  expect(mocks.demo).toHaveBeenCalled();
  cleanup();
  vi.clearAllMocks();
  draw("privacy", false);
  expect(screen.getByText("Only the owner can open this")).toBeTruthy();
  expect(mocks.privacy).not.toHaveBeenCalled();
});

it("opens fit and outreach for an admin but not for a sales associate", () => {
  draw("fit", false);
  expect(mocks.fit).toHaveBeenCalledWith(expect.objectContaining({organizerId: "harbor", organizerName: "Harbor", isAdminOwner: false}), undefined);
  cleanup();
  vi.clearAllMocks();
  draw("fit", false, true);
  expect(mocks.fit).not.toHaveBeenCalled();
  expect(screen.getByText("Only the owner and admins can open this")).toBeTruthy();
});
