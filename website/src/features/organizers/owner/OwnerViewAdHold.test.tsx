import {describe, expect, it, vi} from "vitest";
import {render} from "@testing-library/react";

const hold = vi.hoisted(() => {
  const release = vi.fn();
  return {release, hold: vi.fn(() => release)};
});
vi.mock("../../../analytics", async (importActual) => ({
  ...(await importActual<typeof import("../../../analytics")>()),
  holdAdTagsForPrivateSurface: hold.hold,
}));
import {OwnerView} from "./OwnerView";
import type {OwnerViewController} from "./useOwnerViewController";

const controller = (visible: boolean) => ({hidden: !visible, data: visible ? {} : null, role: visible ? "owner" : null,
  tab: "insights", tabs: ["insights"], open: false, toggle: () => undefined, setTab: () => undefined,
}) as unknown as OwnerViewController;

describe("owner view and advertising tags (#2063)", () => {
  it("holds every tag silent while the owner view is shown, and releases on leaving", () => {
    const view = render(<OwnerView controller={controller(true)} displayUrl="example.test" events={[]} name="Harbour Line"
      readAt={0} />);
    expect(hold.hold).toHaveBeenCalledOnce();
    view.unmount();
    expect(hold.release).toHaveBeenCalledOnce();
  });

  it("holds nothing for visitors, who never see the owner view", () => {
    hold.hold.mockClear();
    render(<OwnerView controller={controller(false)} displayUrl="example.test" events={[]} name="Harbour Line" readAt={0} />);
    expect(hold.hold).not.toHaveBeenCalled();
  });
});
