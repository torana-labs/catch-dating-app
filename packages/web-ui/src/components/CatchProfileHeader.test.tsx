import {cleanup, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {CatchProfileHeader} from "./CatchProfileHeader";

afterEach(cleanup);

describe("CatchProfileHeader", () => {
  it("names the profile in a heading with its seal, headline, meta and stats", () => {
    const {container} = render(
      <CatchProfileHeader
        coverAlt="Runners at sunset"
        coverUrl="/cover.jpg"
        headline="Social runs on the sea face."
        meta="Bandra West, Mumbai"
        monogram="LL"
        monogramGround="coral"
        name="Lantern Lane Runners"
        stats={[{label: "followers", value: "2,140"}, {label: "events hosted", value: "12"}]}
        verifiedLabel="Claimed by the organiser"
      />,
    );
    expect(screen.getByRole("heading", {level: 1, name: "Lantern Lane Runners"})).toBeTruthy();
    expect(screen.getByRole("img", {name: "Claimed by the organiser"})).toBeTruthy();
    expect(screen.getByRole("img", {name: "Runners at sunset"}).getAttribute("src")).toBe("/cover.jpg");
    expect(screen.getByText("Social runs on the sea face.")).toBeTruthy();
    expect(screen.getByText("Bandra West, Mumbai")).toBeTruthy();
    expect(container.querySelector("p:last-of-type")?.textContent).toBe("2,140 followers12 events hosted");
    // The monogram repeats the name, so it is hidden from assistive tech.
    expect(screen.getByText("LL").closest("[aria-hidden='true']")).toBeTruthy();
  });

  it("sits the monogram on a ground cover without a photo and shows a tag instead of a seal", () => {
    const {container} = render(<CatchProfileHeader coverGround="mint" name="Harbour Line Run Club" tag="Built from public pages · not claimed yet" />);
    expect(container.querySelector("[data-ground='mint']")).toBeTruthy();
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByText("Built from public pages · not claimed yet")).toBeTruthy();
    expect(screen.getByText("HL")).toBeTruthy();
  });

  it("renders the caller's actions under the identity", () => {
    render(<CatchProfileHeader actions={<button type="button">Follow</button>} name="Lantern Lane Runners" nameElement="h2" />);
    expect(screen.getByRole("heading", {level: 2})).toBeTruthy();
    expect(screen.getByRole("button", {name: "Follow"})).toBeTruthy();
  });
});
