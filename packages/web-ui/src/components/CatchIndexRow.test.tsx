import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {CatchIndexRow} from "./CatchIndexRow";
import {CatchSurface} from "./CatchSurface";

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

describe("CatchIndexRow as the system ListRow", () => {
  it("draws a density row with a rank, a value and no browse-row title style", () => {
    render(<CatchIndexRow density="compact" rank={1} title="Quizzy Rascals" value="41" />);
    const row = screen.getByText("Quizzy Rascals").closest("[data-density]") as HTMLElement;
    expect(row.dataset).toMatchObject({density: "compact", catchRowLead: "rank", on: "ground"});
    expect(screen.getByText("1").dataset.variant).toBe("display-sm");
    expect(screen.getByText("41")).toBeTruthy();
  });

  it("leads with a time and a marker, and wraps a body", () => {
    render(<CatchIndexRow body="Partner rotations run on a timer." density="regular" marker={{tone: "format", format: "games", live: true}} time="8:16 PM" title="Round two" wrap />);
    const row = screen.getByText("Round two").closest("[data-density]") as HTMLElement;
    expect(row.dataset).toMatchObject({catchRowLead: "time", wrap: "", hasText: ""});
    expect(row.querySelector('[data-kind="dot"][data-live]')).not.toBeNull();
    expect(screen.getByText("8:16 PM")).toBeTruthy();
  });

  it("adds a status, meta, a progress meter, an action on a passive row and a chevron on a link", () => {
    const remind = vi.fn();
    render(<>
      <CatchIndexRow action={{label: "Remind", onPressed: remind}} density="regular" meta="Hasn’t paid" status="Full" statusTone="danger" title="Asha" />
      <CatchIndexRow density="regular" href="/x" progress={{value: 2, max: 4, label: "Booked"}} title="Run" />
    </>);
    expect(screen.getByText("Full").dataset.tone).toBe("danger");
    fireEvent.click(screen.getByRole("button", {name: "Remind"}));
    expect(remind).toHaveBeenCalledOnce();
    expect(screen.getByRole("progressbar", {name: "Booked"})).toBeTruthy();
    expect(screen.getByRole("link").querySelector("svg")).not.toBeNull();
  });

  it("shows a date tile and an icon tinted by its tone", () => {
    render(<CatchSurface><CatchIndexRow date={{day: "Thu", date: 7, format: "games"}} density="regular" title="Quiz" /><CatchIndexRow density="regular" icon="people" iconTone="success" title="Hello" /></CatchSurface>);
    expect(screen.getByText("Thu").closest("[data-format]")?.getAttribute("data-format")).toBe("games");
    expect(document.querySelector('[data-tone="success"] svg')).not.toBeNull();
    expect((screen.getByText("Hello").closest("[data-density]") as HTMLElement).dataset.on).toBe("tile");
  });
});
