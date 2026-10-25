import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {CatchIndexRow} from "./CatchIndexRow";

afterEach(cleanup);

describe("CatchIndexRow", () => {
  it("is a link with an href, a button with only onTap, and passive with neither", () => {
    const onTap = vi.fn();
    render(<CatchIndexRow href="/events/long-run" onTap={onTap} title="Sunday Long Run" />);
    fireEvent.click(screen.getByRole("link", {name: "Sunday Long Run"}));
    expect(onTap).toHaveBeenCalledTimes(1);
    cleanup();

    render(<CatchIndexRow onTap={onTap} selected title="Running" />);
    const button = screen.getByRole("button", {name: "Running"});
    expect(button.getAttribute("aria-current")).toBe("true");
    fireEvent.click(button);
    expect(onTap).toHaveBeenCalledTimes(2);
    cleanup();

    const {container} = render(<CatchIndexRow onTap={null} title="Coming soon" />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(container.textContent).toBe("Coming soon");
  });

  it("stacks a subtitle and footer under the title and reads them in the name", () => {
    render(
      <CatchIndexRow footer={<span>₹500</span>} href="#" leading={<span>1</span>} subtitle=" 6:30 am · Carter Road "
        title="Sunday Long Run" trailing={<span>Book</span>} />,
    );
    const link = screen.getByRole("link");
    expect(link.dataset.stacked).toBe("true");
    expect(link.textContent).toBe("1Sunday Long Run6:30 am · Carter Road₹500Book");
  });

  it("stays a single-line row without a subtitle or footer, and takes a semantic label", () => {
    render(<CatchIndexRow href="#" semanticLabel="Running events" subtitle="  " title="Running" />);
    const link = screen.getByRole("link", {name: "Running events"});
    expect(link.dataset.stacked).toBeUndefined();
  });
});
