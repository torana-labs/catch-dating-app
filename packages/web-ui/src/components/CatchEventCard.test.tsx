import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {CatchEventCard} from "./CatchEventCard";

afterEach(cleanup);

describe("CatchEventCard", () => {
  it("draws a poster as a format spotlight with its title as a heading", () => {
    render(<CatchEventCard counts={[{value: 26, label: "booked"}]} format="games" formatLabel="Trivia" href="/e/1" title="Tuesday Trivia Night" when="Tonight" />);
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe("/e/1");
    expect(link.dataset).toMatchObject({block: "spotlight", format: "games", variant: "poster"});
    expect(screen.getByRole("heading", {name: "Tuesday Trivia Night"})).toBeTruthy();
    expect(screen.getByText("booked")).toBeTruthy();
  });

  it("puts the title on the format colour when a compact card has no photo", () => {
    render(<CatchEventCard format="run" formatLabel="Run clubs" href="/e/2" place="Carter Road" price="Free · 9 left" title="Carter Road Social Run" variant="compact" when="Fri 6:30 AM" />);
    expect(screen.getByRole("link").dataset.variant).toBe("compact");
    expect(screen.getAllByText("Carter Road Social Run")).toHaveLength(1);
    expect(document.querySelector('[data-format="run"]')).not.toBeNull();
    expect(screen.getByText("Free · 9 left")).toBeTruthy();
  });

  it("falls back to the poster face when the photo fails", () => {
    render(<CatchEventCard format="dinner" imageUrl="/broken.jpg" title="Strangers’ Supper" variant="cover" />);
    const image = document.querySelector("img") as HTMLImageElement;
    fireEvent.error(image);
    expect(document.querySelector("img")).toBeNull();
    expect(screen.getByText("Strangers’ Supper")).toBeTruthy();
  });

  it("links an external event out and presses a card without a link", () => {
    render(<CatchEventCard format="courts" formatLabel="Pickleball" href="https://lu.ma/x" source="Luma" title="Pickleball Social" variant="external" />);
    expect(screen.getByText("on Luma")).toBeTruthy();
    expect(screen.getByText("Tickets")).toBeTruthy();
    cleanup();
    const press = vi.fn();
    render(<CatchEventCard format="games" onPress={press} title="Game Night" variant="compact" />);
    fireEvent.click(screen.getByRole("button"));
    expect(press).toHaveBeenCalledOnce();
  });
});
